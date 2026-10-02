'use server'

import { revalidatePath } from 'next/cache'
import { requirePapel } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export type ComposicaoState = { ok?: string; erro?: string }

export async function salvarComposicao(
  _prev: ComposicaoState,
  formData: FormData,
): Promise<ComposicaoState> {
  await requirePapel('admin')
  const tipoId = String(formData.get('tipo_id') ?? '').trim()
  if (!tipoId) return { erro: 'Tipo inválido.' }
  const ids = formData.getAll('processo_id').map((v) => String(v))

  const s = await createClient()
  const del = await s.from('tipo_lavagem_processos').delete().eq('tipo_lavagem_id', tipoId)
  if (del.error) return { erro: 'Falha ao salvar: ' + del.error.message }

  if (ids.length > 0) {
    const rows = ids.map((pid) => ({ tipo_lavagem_id: tipoId, processo_id: pid }))
    const { error } = await s.from('tipo_lavagem_processos').insert(rows)
    if (error) return { erro: 'Falha ao salvar: ' + error.message }
  }

  revalidatePath('/cadastros/lavagem-processos')
  return { ok: 'Composição salva.' }
}
