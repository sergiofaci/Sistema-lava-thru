import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Papel, UsuarioComUnidade } from '@/lib/types'

// Retorna o perfil do usuário logado (ou null se não houver sessão válida).
export async function getUsuario(): Promise<UsuarioComUnidade | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('usuarios')
    .select('id, nome, email, papel, unidade_id, ativo, unidade:unidades(id, nome)')
    .eq('id', user.id)
    .single()

  if (!data) return null
  // supabase tipa relações 1-1 como array em alguns casos; normalizamos:
  const unidade = Array.isArray(data.unidade) ? data.unidade[0] ?? null : data.unidade
  return { ...data, unidade } as UsuarioComUnidade
}

// Exige sessão; redireciona para /login caso contrário.
export async function requireUsuario(): Promise<UsuarioComUnidade> {
  const usuario = await getUsuario()
  if (!usuario) redirect('/login')
  if (!usuario.ativo) redirect('/login?erro=inativo')
  return usuario
}

// Exige que o usuário tenha um dos papéis informados.
export async function requirePapel(...papeis: Papel[]): Promise<UsuarioComUnidade> {
  const usuario = await requireUsuario()
  if (!papeis.includes(usuario.papel)) redirect('/sem-permissao')
  return usuario
}
