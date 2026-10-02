'use server'

import { revalidatePath } from 'next/cache'
import { requirePapel } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { parseBRL } from '@/lib/money'

export type MetaState = { ok?: string; erro?: string }

export async function salvarMeta(_prev: MetaState, formData: FormData): Promise<MetaState> {
  await requirePapel('admin')
  const unidade_id = String(formData.get('unidade_id') ?? '').trim()
  const mesRaw = String(formData.get('mes') ?? '').trim() // 'YYYY-MM'
  const valor_meta = parseBRL(String(formData.get('valor') ?? ''))
  if (!unidade_id) return { erro: 'Selecione a unidade.' }
  if (!/^\d{4}-\d{2}$/.test(mesRaw)) return { erro: 'Selecione o mês.' }
  if (!(valor_meta > 0)) return { erro: 'Informe um valor de meta válido.' }

  const s = await createClient()
  const { error } = await s
    .from('metas')
    .upsert({ unidade_id, mes: `${mesRaw}-01`, valor_meta }, { onConflict: 'unidade_id,mes' })
  if (error) return { erro: 'Falha ao salvar: ' + error.message }

  revalidatePath('/cadastros/metas')
  return { ok: 'Meta salva com sucesso.' }
}

export async function excluirMeta(formData: FormData): Promise<MetaState> {
  await requirePapel('admin')
  const id = String(formData.get('id'))
  const s = await createClient()
  const { error } = await s.from('metas').delete().eq('id', id)
  if (error) return { erro: 'Falha ao excluir: ' + error.message }
  revalidatePath('/cadastros/metas')
  return {}
}
