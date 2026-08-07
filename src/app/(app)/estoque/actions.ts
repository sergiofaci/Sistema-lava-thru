'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireModulo, requirePapel } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
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

// Estorna uma movimentação criando o movimento oposto (mantém a auditoria
// e o custo médio consistente). Só admin.
export async function estornarMovimento(formData: FormData): Promise<EstoqueState> {
  await requirePapel('admin')
  const tipo = String(formData.get('tipo')) // 'entrada' | 'saida'
  const id = String(formData.get('id'))
  const supabase = await createClient()
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
  const me = (await supabase.auth.getUser()).data.user?.id

  if (tipo === 'entrada') {
    const { data: e } = await supabase
      .from('estoque_entradas')
      .select('produto_id, unidade_id, quantidade')
      .eq('id', id)
      .single()
    if (!e) return { erro: 'Entrada não encontrada.' }
    const { error } = await supabase.from('estoque_saidas').insert({
      produto_id: e.produto_id,
      unidade_id: e.unidade_id,
      quantidade: e.quantidade,
      data: hoje,
      usuario_id: me,
    })
    if (error) return { erro: 'Falha ao estornar: ' + error.message }
  } else {
    const { data: s } = await supabase
      .from('estoque_saidas')
      .select('produto_id, unidade_id, quantidade, custo_unitario')
      .eq('id', id)
      .single()
    if (!s) return { erro: 'Baixa não encontrada.' }
    const { error } = await supabase.from('estoque_entradas').insert({
      produto_id: s.produto_id,
      unidade_id: s.unidade_id,
      quantidade: s.quantidade,
      preco_unitario: s.custo_unitario ?? 0,
      data: hoje,
      observacao: 'Estorno de baixa',
      usuario_id: me,
    })
    if (error) return { erro: 'Falha ao estornar: ' + error.message }
  }

  revalidatePath('/estoque')
  return {}
}
