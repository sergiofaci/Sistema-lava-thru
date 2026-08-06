'use server'

import { z } from 'zod'
import { redirect } from 'next/navigation'
import { requireUsuario } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { round2 } from '@/lib/money'

const Valor = z.number().nonnegative().default(0)
const Qtd = z.number().int().nonnegative().default(0)

const schema = z.object({
  unidade_id: z.string().uuid().optional(),
  turno: z.enum(['manha', 'tarde']),
  maquina_cartao: z.enum(['Rede Card', 'Sipag']),
  maquina: z.object({ pix: Valor, credito: Valor, debito: Valor }),
  sistema: z.object({
    dinheiro: Valor,
    pix: Valor,
    credito: Valor,
    debito: Valor,
    voucher: Valor,
  }),
  qtd: z.object({
    dinheiro: Qtd,
    pix: Qtd,
    credito: Qtd,
    debito: Qtd,
    voucher: Qtd,
  }),
  lavagens: z.record(z.string().uuid(), Qtd),
  confirmado_com_diferenca: z.boolean().default(false),
})

export type FechamentoInput = z.input<typeof schema>
export type FechamentoResult =
  | { ok: true }
  | { ok: false; erro: string }
  | { ok: false; precisaConfirmar: true; diferenca: number }

export async function criarFechamento(input: FechamentoInput): Promise<FechamentoResult> {
  const usuario = await requireUsuario()

  const parsed = schema.safeParse(input)
  if (!parsed.success) return { ok: false, erro: 'Dados inválidos. Revise os campos.' }
  const data = parsed.data

  // Segurança: caixa/gerente só fecham na própria unidade; admin escolhe.
  const unidade_id = usuario.papel === 'admin' ? data.unidade_id : usuario.unidade_id
  if (!unidade_id) return { ok: false, erro: 'Selecione a unidade do fechamento.' }

  const supabase = await createClient()
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
  const turnoLabel = data.turno === 'manha' ? 'manhã' : 'tarde'

  // Regra: apenas 1 fechamento por turno, por dia, por unidade.
  const { data: existente } = await supabase
    .from('fechamentos_caixa')
    .select('id')
    .eq('unidade_id', unidade_id)
    .eq('data', hoje)
    .eq('turno', data.turno)
    .maybeSingle()
  if (existente) {
    return {
      ok: false,
      erro: `Já existe um fechamento do turno da ${turnoLabel} nesta unidade hoje.`,
    }
  }

  // Diferenças recalculadas no servidor (máquina - sistema).
  const diferenca_pix = round2(data.maquina.pix - data.sistema.pix)
  const diferenca_credito = round2(data.maquina.credito - data.sistema.credito)
  const diferenca_debito = round2(data.maquina.debito - data.sistema.debito)
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
      data: hoje,
      turno: data.turno,
      maquina_cartao: data.maquina_cartao,
      maquina_pix: data.maquina.pix,
      maquina_credito: data.maquina.credito,
      maquina_debito: data.maquina.debito,
      sistema_dinheiro: data.sistema.dinheiro,
      sistema_pix: data.sistema.pix,
      sistema_credito: data.sistema.credito,
      sistema_debito: data.sistema.debito,
      sistema_voucher: data.sistema.voucher,
      sistema_qtd_dinheiro: data.qtd.dinheiro,
      sistema_qtd_pix: data.qtd.pix,
      sistema_qtd_credito: data.qtd.credito,
      sistema_qtd_debito: data.qtd.debito,
      sistema_qtd_voucher: data.qtd.voucher,
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
