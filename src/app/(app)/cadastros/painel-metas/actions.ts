'use server'

import { revalidatePath } from 'next/cache'
import { requirePapel } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export type VisibState = { ok?: string; erro?: string }
const CARGOS = ['caixa', 'aux_maquina', 'aux_limpeza', 'gerente']

export async function salvarVisibilidade(
  _prev: VisibState,
  formData: FormData,
): Promise<VisibState> {
  await requirePapel('admin')
  const cargo = String(formData.get('cargo') ?? '')
  if (!CARGOS.includes(cargo)) return { erro: 'Cargo inválido.' }
  const tipoIds = formData.getAll('tipo_id').map((v) => String(v))
  const ver_faturamento = formData.get('ver_faturamento') === 'on'
  const ver_despesas = formData.get('ver_despesas') === 'on'

  const s = await createClient()
  const del = await s.from('painel_cargo_item').delete().eq('cargo', cargo)
  if (del.error) return { erro: 'Falha ao salvar: ' + del.error.message }
  if (tipoIds.length > 0) {
    const { error } = await s
      .from('painel_cargo_item')
      .insert(tipoIds.map((id) => ({ cargo, tipo_lavagem_id: id })))
    if (error) return { erro: 'Falha ao salvar: ' + error.message }
  }
  const flags = await s
    .from('painel_cargo_flags')
    .upsert({ cargo, ver_faturamento, ver_despesas }, { onConflict: 'cargo' })
  if (flags.error) return { erro: 'Falha ao salvar: ' + flags.error.message }

  revalidatePath('/cadastros/painel-metas')
  return { ok: 'Visibilidade salva.' }
}
