'use server'

import { redirect } from 'next/navigation'
import { requirePapel } from '@/lib/auth'
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
  const usuario = await requirePapel('admin', 'gerente')

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
  const usuario = await requirePapel('admin', 'gerente')

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
