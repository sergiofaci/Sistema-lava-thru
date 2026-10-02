'use server'

import { revalidatePath } from 'next/cache'
import { requirePapel } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export type OrcamentoState = { ok?: string; erro?: string }

export async function salvarOrcamento(payload: {
  unidade_id: string
  mes: string // 'YYYY-MM'
  itens: { tipo_despesa_id: string; valor: number }[]
}): Promise<OrcamentoState> {
  await requirePapel('admin')
  const unidade_id = payload?.unidade_id
  if (!unidade_id) return { erro: 'Selecione a unidade.' }
  if (!/^\d{4}-\d{2}$/.test(payload?.mes ?? '')) return { erro: 'Mês inválido.' }
  const mes = `${payload.mes}-01`

  const rows = (payload.itens ?? [])
    .filter((i) => i.tipo_despesa_id && Number(i.valor) > 0)
    .map((i) => ({ unidade_id, mes, tipo_despesa_id: i.tipo_despesa_id, valor: Number(i.valor) }))

  const s = await createClient()
  const del = await s.from('orcamento_despesa').delete().eq('unidade_id', unidade_id).eq('mes', mes)
  if (del.error) return { erro: 'Falha ao salvar: ' + del.error.message }
  if (rows.length > 0) {
    const { error } = await s.from('orcamento_despesa').insert(rows)
    if (error) return { erro: 'Falha ao salvar: ' + error.message }
  }

  revalidatePath('/cadastros/orcamento')
  return { ok: `Orçamento salvo (${rows.length} tipo(s)).` }
}
