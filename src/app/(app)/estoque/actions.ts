'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireModulo, requirePapel } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseQtd, formatQtd, parseBRL } from '@/lib/money'

export type EstoqueState = { erro?: string }

function resolverUnidade(
  papel: string,
  unidadeUsuario: string | null,
  formData: FormData,
): string | null {
  return papel === 'admin'
    ? String(formData.get('unidade_id') ?? '').trim() || null
    : unidadeUsuario
}

export async function registrarEntrada(
  _prev: EstoqueState,
  formData: FormData,
): Promise<EstoqueState> {
  const usuario = await requireModulo('estoque')

  const unidade_id = resolverUnidade(usuario.papel, usuario.unidade_id, formData)
  const produto_id = String(formData.get('produto_id') ?? '').trim()
  const quantidade = parseQtd(String(formData.get('quantidade') ?? ''))
  const preco_unitario = parseBRL(String(formData.get('preco_unitario') ?? ''))
  const data = String(formData.get('data') ?? '').trim()
  const observacao = String(formData.get('observacao') ?? '').trim() || null

  if (!unidade_id) return { erro: 'Selecione a unidade.' }
  if (!produto_id) return { erro: 'Selecione o produto.' }
  if (!(quantidade > 0)) return { erro: 'Informe uma quantidade válida.' }
  if (!data) return { erro: 'Informe a data.' }

  const supabase = await createClient()
  const { error } = await supabase.from('estoque_entradas').insert({
    produto_id,
    unidade_id,
    quantidade,
    preco_unitario,
    data,
    observacao,
    usuario_id: usuario.id,
  })
  if (error) return { erro: 'Falha ao registrar entrada: ' + error.message }

  redirect('/estoque')
}

export async function registrarBaixa(
  _prev: EstoqueState,
  formData: FormData,
): Promise<EstoqueState> {
  const usuario = await requireModulo('estoque')

  const unidade_id = resolverUnidade(usuario.papel, usuario.unidade_id, formData)
  const produto_id = String(formData.get('produto_id') ?? '').trim()
  const quantidade = parseQtd(String(formData.get('quantidade') ?? ''))
  const data = String(formData.get('data') ?? '').trim()
  const local_uso_id = String(formData.get('local_uso_id') ?? '').trim() || null

  if (!unidade_id) return { erro: 'Selecione a unidade.' }
  if (!produto_id) return { erro: 'Selecione o produto.' }
  if (!(quantidade > 0)) return { erro: 'Informe uma quantidade válida.' }
  if (!data) return { erro: 'Informe a data.' }

  const supabase = await createClient()

  // Evita saldo negativo: confere o saldo atual antes de dar baixa.
  const { data: saldoRow } = await supabase
    .from('estoque_saldo')
    .select('saldo_atual')
    .eq('produto_id', produto_id)
    .eq('unidade_id', unidade_id)
    .maybeSingle()

  const saldoAtual = saldoRow?.saldo_atual ?? 0
  if (quantidade > saldoAtual) {
    return { erro: `Saldo insuficiente. Disponível: ${formatQtd(saldoAtual)}.` }
  }

  const { error } = await supabase.from('estoque_saidas').insert({
    produto_id,
    unidade_id,
    quantidade,
    data,
    local_uso_id,
    usuario_id: usuario.id,
  })
  if (error) return { erro: 'Falha ao registrar baixa: ' + error.message }

  redirect('/estoque')
}

// Recalcula saldo e custo médio de um produto/unidade a partir de TODAS as
// movimentações restantes (mesma regra dos gatilhos). Usa service role.
type AdminClient = ReturnType<typeof createAdminClient>
async function recomputarSaldo(admin: AdminClient, produto_id: string, unidade_id: string) {
  const [{ data: ents }, { data: sais }] = await Promise.all([
    admin
      .from('estoque_entradas')
      .select('quantidade, preco_unitario, data, criado_em')
      .eq('produto_id', produto_id)
      .eq('unidade_id', unidade_id),
    admin
      .from('estoque_saidas')
      .select('quantidade, data, criado_em')
      .eq('produto_id', produto_id)
      .eq('unidade_id', unidade_id),
  ])

  const movs = [
    ...(ents ?? []).map((e) => ({
      t: 'e' as const,
      qtd: Number(e.quantidade),
      preco: Number(e.preco_unitario),
      ord: `${e.data} ${e.criado_em}`,
    })),
    ...(sais ?? []).map((s) => ({
      t: 's' as const,
      qtd: Number(s.quantidade),
      preco: 0,
      ord: `${s.data} ${s.criado_em}`,
    })),
  ].sort((a, b) => a.ord.localeCompare(b.ord))

  let saldo = 0
  let custo = 0
  for (const m of movs) {
    if (m.t === 'e') {
      const novo = saldo + m.qtd
      custo = novo > 0 ? Math.round(((saldo * custo + m.qtd * m.preco) / novo) * 1e4) / 1e4 : custo
      saldo = novo
    } else {
      saldo = saldo - m.qtd
    }
  }
  saldo = Math.round(saldo * 1e3) / 1e3

  await admin
    .from('estoque_saldo')
    .upsert({ produto_id, unidade_id, saldo_atual: saldo, custo_medio: custo }, { onConflict: 'produto_id,unidade_id' })
}

// Estorna uma movimentação: apaga o registro e recalcula o saldo do produto.
// Assim o estorno de uma entrada NÃO vira consumo. Só admin.
export async function estornarMovimento(formData: FormData): Promise<EstoqueState> {
  await requirePapel('admin')
  const tipo = String(formData.get('tipo')) // 'entrada' | 'saida'
  const id = String(formData.get('id'))
  const admin = createAdminClient()
  const tabela = tipo === 'entrada' ? 'estoque_entradas' : 'estoque_saidas'

  const { data: mov } = await admin.from(tabela).select('produto_id, unidade_id').eq('id', id).single()
  if (!mov) return { erro: 'Movimentação não encontrada.' }

  const { error } = await admin.from(tabela).delete().eq('id', id)
  if (error) return { erro: 'Falha ao estornar: ' + error.message }

  await recomputarSaldo(admin, mov.produto_id as string, mov.unidade_id as string)
  revalidatePath('/estoque')
  return {}
}

// Zera TODO o estoque (entradas, saídas e saldos) em todas as unidades.
// Mantém o cadastro de produtos e locais. Só admin.
export async function zerarEstoque(): Promise<EstoqueState> {
  await requirePapel('admin')
  const admin = createAdminClient()
  for (const t of ['estoque_saidas', 'estoque_entradas', 'estoque_saldo'] as const) {
    const { error } = await admin.from(t).delete().not('id', 'is', null)
    if (error) return { erro: `Falha ao zerar ${t}: ${error.message}` }
  }
  revalidatePath('/estoque')
  return {}
}
