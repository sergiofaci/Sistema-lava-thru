import { requirePapel } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export type CrudResult = { ok?: string; erro?: string }

type PgError = { code?: string; message?: string } | null

function msgErro(error: PgError): string {
  if (error?.code === '23503')
    return 'Não é possível excluir: este item já está em uso em outros registros. Desative-o em vez de excluir.'
  if (error?.code === '23505') return 'Já existe um registro com esses dados.'
  return 'Erro: ' + (error?.message ?? 'tente novamente.')
}

export async function crudInserir(
  tabela: string,
  valores: Record<string, unknown>,
  rotulo = 'Registro',
): Promise<CrudResult> {
  await requirePapel('admin')
  const s = await createClient()
  const { error } = await s.from(tabela).insert(valores)
  if (error) return { erro: msgErro(error) }
  return { ok: `${rotulo} criado com sucesso.` }
}

export async function crudAtualizar(
  tabela: string,
  id: string,
  valores: Record<string, unknown>,
  rotulo = 'Registro',
): Promise<CrudResult> {
  await requirePapel('admin')
  const s = await createClient()
  const { error } = await s.from(tabela).update(valores).eq('id', id)
  if (error) return { erro: msgErro(error) }
  return { ok: `${rotulo} atualizado com sucesso.` }
}

export async function crudToggle(tabela: string, id: string, ativo: boolean): Promise<CrudResult> {
  await requirePapel('admin')
  const s = await createClient()
  const { error } = await s.from(tabela).update({ ativo }).eq('id', id)
  return error ? { erro: msgErro(error) } : {}
}

export async function crudExcluir(tabela: string, id: string): Promise<CrudResult> {
  await requirePapel('admin')
  const s = await createClient()
  const { error } = await s.from(tabela).delete().eq('id', id)
  return error ? { erro: msgErro(error) } : {}
}
