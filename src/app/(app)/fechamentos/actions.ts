'use server'

import { z } from 'zod'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireModulo, requirePapel } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { round2 } from '@/lib/money'

const Valor = z.number().nonnegative().default(0)
const Qtd = z.number().int().nonnegative().default(0)

const schema = z.object({
  unidade_id: z.string().uuid().optional(),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // retroativo (só admin)
  turno: z.enum(['manha', 'tarde']),
  // As duas maquininhas podem ser usadas no mesmo turno.
  maquina: z.object({
    rede: z.object({ pix: Valor, credito: Valor, debito: Valor }),
    sipag: z.object({ pix: Valor, credito: Valor, debito: Valor }),
  }),
  sistema: z.object({
    dinheiro: Valor,
    pix: Valor,
    credito: Valor,
    debito: Valor,
    voucher: Valor,
    empresarial: Valor,
  }),
  qtd: z.object({
    dinheiro: Qtd,
    pix: Qtd,
    credito: Qtd,
    debito: Qtd,
    voucher: Qtd,
    empresarial: Qtd,
  }),
  kits: Qtd,
  lavagens: z.record(z.string().uuid(), Qtd),
  confirmado_com_diferenca: z.boolean().default(false),
})

export type FechamentoInput = z.input<typeof schema>
export type FechamentoResult =
  | { ok: true }
  | { ok: false; erro: string }
  | { ok: false; precisaConfirmar: true; diferenca: number }

export async function criarFechamento(input: FechamentoInput): Promise<FechamentoResult> {
  const usuario = await requireModulo('fechamentos')

  const parsed = schema.safeParse(input)
  if (!parsed.success) return { ok: false, erro: 'Dados inválidos. Revise os campos.' }
  const data = parsed.data

  // Segurança: caixa/gerente só fecham na própria unidade; admin escolhe.
  const unidade_id = usuario.papel === 'admin' ? data.unidade_id : usuario.unidade_id
  if (!unidade_id) return { ok: false, erro: 'Selecione a unidade do fechamento.' }

  const supabase = await createClient()
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
  const turnoLabel = data.turno === 'manha' ? 'manhã' : 'tarde'

  // Data do fechamento: hoje por padrão; admin pode lançar retroativo.
  const dataFech = usuario.papel === 'admin' && data.data ? data.data : hoje
  if (dataFech > hoje) return { ok: false, erro: 'A data do fechamento não pode ser futura.' }

  // Regra: apenas 1 fechamento por turno, por dia, por unidade.
  const { data: existente } = await supabase
    .from('fechamentos_caixa')
    .select('id')
    .eq('unidade_id', unidade_id)
    .eq('data', dataFech)
    .eq('turno', data.turno)
    .maybeSingle()
  if (existente) {
    return {
      ok: false,
      erro: `Já existe um fechamento do turno da ${turnoLabel} nesta unidade em ${dataFech.split('-').reverse().join('/')}.`,
    }
  }

  // Total da máquina = Rede Card + Sipag (podem ser usadas no mesmo turno).
  const maqPix = round2(data.maquina.rede.pix + data.maquina.sipag.pix)
  const maqCredito = round2(data.maquina.rede.credito + data.maquina.sipag.credito)
  const maqDebito = round2(data.maquina.rede.debito + data.maquina.sipag.debito)

  // Diferenças recalculadas no servidor (máquina - sistema).
  const diferenca_pix = round2(maqPix - data.sistema.pix)
  const diferenca_credito = round2(maqCredito - data.sistema.credito)
  const diferenca_debito = round2(maqDebito - data.sistema.debito)
  const diferenca_total = round2(
    Math.abs(diferenca_pix) + Math.abs(diferenca_credito) + Math.abs(diferenca_debito),
  )
  const temDiferenca = diferenca_total > 0.004

  // Regra 4.2: se há diferença e o caixa ainda não confirmou, pede confirmação.
  if (temDiferenca && !data.confirmado_com_diferenca) {
    return { ok: false, precisaConfirmar: true, diferenca: diferenca_total }
  }

  const { data: fech, error } = await supabase
    .from('fechamentos_caixa')
    .insert({
      unidade_id,
      usuario_id: usuario.id,
      data: dataFech,
      turno: data.turno,
      maquina_cartao: null,
      maquina_pix: maqPix,
      maquina_credito: maqCredito,
      maquina_debito: maqDebito,
      maquina_rede_pix: data.maquina.rede.pix,
      maquina_rede_credito: data.maquina.rede.credito,
      maquina_rede_debito: data.maquina.rede.debito,
      maquina_sipag_pix: data.maquina.sipag.pix,
      maquina_sipag_credito: data.maquina.sipag.credito,
      maquina_sipag_debito: data.maquina.sipag.debito,
      sistema_dinheiro: data.sistema.dinheiro,
      sistema_pix: data.sistema.pix,
      sistema_credito: data.sistema.credito,
      sistema_debito: data.sistema.debito,
      sistema_voucher: data.sistema.voucher,
      sistema_empresarial: data.sistema.empresarial,
      sistema_qtd_dinheiro: data.qtd.dinheiro,
      sistema_qtd_pix: data.qtd.pix,
      sistema_qtd_credito: data.qtd.credito,
      sistema_qtd_debito: data.qtd.debito,
      sistema_qtd_voucher: data.qtd.voucher,
      sistema_qtd_empresarial: data.qtd.empresarial,
      kits_vendidos: data.kits,
      diferenca_pix,
      diferenca_credito,
      diferenca_debito,
      diferenca_total,
      fechado_com_diferenca: temDiferenca,
    })
    .select('id')
    .single()

  if (error || !fech) {
    // 23505 = violação de unicidade (corrida: alguém fechou o mesmo turno agora)
    if (error?.code === '23505') {
      return {
        ok: false,
        erro: `Já existe um fechamento do turno da ${turnoLabel} nesta unidade hoje.`,
      }
    }
    return { ok: false, erro: 'Falha ao salvar o fechamento: ' + (error?.message ?? '') }
  }

  const linhas = Object.entries(data.lavagens)
    .filter(([, q]) => q > 0)
    .map(([tipo_lavagem_id, quantidade]) => ({
      fechamento_id: fech.id,
      tipo_lavagem_id,
      quantidade,
    }))
  if (linhas.length > 0) {
    await supabase.from('fechamento_lavagens').insert(linhas)
  }

  redirect(`/fechamentos/${fech.id}`)
}

// Estorna (exclui) um fechamento — libera o turno para relançar. Só admin.
export async function estornarFechamento(formData: FormData): Promise<{ erro?: string }> {
  await requirePapel('admin')
  const id = String(formData.get('id'))
  const supabase = await createClient()
  const { error } = await supabase.from('fechamentos_caixa').delete().eq('id', id)
  if (error) return { erro: 'Falha ao estornar: ' + error.message }
  revalidatePath('/fechamentos')
  redirect('/fechamentos')
}
