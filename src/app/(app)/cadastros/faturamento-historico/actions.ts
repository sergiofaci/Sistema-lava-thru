'use server'

import { revalidatePath } from 'next/cache'
import { requirePapel } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export type LinhaImport = {
  mes: string // 'YYYY-MM-01'
  categoria: string // 'lavagem' | 'assinatura' | 'outro'
  item: string
  quantidade: number
  valor: number
}
export type ImportResult = { ok?: string; erro?: string }

const CATS = ['lavagem', 'assinatura', 'outro']

export async function importarHistorico(payload: {
  unidade_id: string
  linhas: LinhaImport[]
}): Promise<ImportResult> {
  await requirePapel('admin')
  const unidade_id = payload?.unidade_id
  if (!unidade_id) return { erro: 'Selecione a unidade.' }
  const linhas = Array.isArray(payload?.linhas) ? payload.linhas : []

  const rows = linhas
    .filter((l) => /^\d{4}-\d{2}-01$/.test(l.mes) && String(l.item ?? '').trim())
    .map((l) => ({
      unidade_id,
      mes: l.mes,
      categoria: CATS.includes(l.categoria) ? l.categoria : 'lavagem',
      item: String(l.item).trim().slice(0, 200),
      quantidade: Number(l.quantidade) || 0,
      valor: Math.round((Number(l.valor) || 0) * 100) / 100,
    }))

  if (rows.length === 0) return { erro: 'Nenhuma linha válida para importar.' }

  const s = await createClient()
  const meses = [...new Set(rows.map((r) => r.mes))]

  // Reimportar substitui apenas a MESMA categoria naquele mês/unidade —
  // assim importar lavagens não apaga as assinaturas do mesmo mês, e vice-versa.
  const categorias = [...new Set(rows.map((r) => r.categoria))]
  for (const cat of categorias) {
    const mesesCat = [...new Set(rows.filter((r) => r.categoria === cat).map((r) => r.mes))]
    const del = await s
      .from('faturamento_historico')
      .delete()
      .eq('unidade_id', unidade_id)
      .eq('categoria', cat)
      .in('mes', mesesCat)
    if (del.error) return { erro: 'Falha ao limpar dados anteriores: ' + del.error.message }
  }

  const { error } = await s.from('faturamento_historico').insert(rows)
  if (error) return { erro: 'Falha ao importar: ' + error.message }

  revalidatePath('/cadastros/faturamento-historico')
  return { ok: `${rows.length} item(ns) importado(s) em ${meses.length} mês(es).` }
}
