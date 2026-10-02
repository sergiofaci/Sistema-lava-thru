'use server'

import { revalidatePath } from 'next/cache'
import { requirePapel } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export type MetasItemState = { ok?: string; erro?: string }

export async function salvarMetasItem(payload: {
  unidade_id: string
  mes: string // 'YYYY-MM'
  itens: { tipo_lavagem_id: string; quantidade: number }[]
}): Promise<MetasItemState> {
  await requirePapel('admin')

  const unidade_id = payload?.unidade_id
  if (!unidade_id) return { erro: 'Selecione a unidade.' }
  if (!/^\d{4}-\d{2}$/.test(payload?.mes ?? '')) return { erro: 'Mês inválido.' }
  const mes = `${payload.mes}-01`

  const rows = (payload.itens ?? [])
    .filter((i) => i.tipo_lavagem_id && Number(i.quantidade) > 0)
    .map((i) => ({ unidade_id, mes, tipo_lavagem_id: i.tipo_lavagem_id, quantidade: Number(i.quantidade) }))

  const s = await createClient()
  // Substitui as metas do mês/unidade.
  const del = await s.from('metas_item').delete().eq('unidade_id', unidade_id).eq('mes', mes)
  if (del.error) return { erro: 'Falha ao salvar: ' + del.error.message }
  if (rows.length > 0) {
    const { error } = await s.from('metas_item').insert(rows)
    if (error) return { erro: 'Falha ao salvar: ' + error.message }
  }

  revalidatePath('/cadastros/metas-item')
  return { ok: `Metas salvas (${rows.length} item(ns)).` }
}
