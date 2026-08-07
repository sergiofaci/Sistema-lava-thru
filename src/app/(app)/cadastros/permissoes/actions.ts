'use server'

import { revalidatePath } from 'next/cache'
import { requirePapel } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { MODULOS } from '@/lib/modulos'

export type PermState = { ok?: string; erro?: string }

export async function salvarPermissoes(_prev: PermState, formData: FormData): Promise<PermState> {
  await requirePapel('admin')

  const rows: { papel: string; modulo: string; permitido: boolean }[] = []
  for (const papel of ['gerente', 'caixa'] as const) {
    for (const m of MODULOS) {
      rows.push({ papel, modulo: m.key, permitido: formData.get(`${papel}:${m.key}`) === 'on' })
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('permissoes_modulo').upsert(rows, { onConflict: 'papel,modulo' })
  if (error) return { erro: 'Falha ao salvar: ' + error.message }

  revalidatePath('/cadastros/permissoes')
  return { ok: 'Permissões salvas com sucesso.' }
}
