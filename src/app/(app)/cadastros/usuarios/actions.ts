'use server'

import { revalidatePath } from 'next/cache'
import { requirePapel } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Papel } from '@/lib/types'

const ROTA = '/cadastros/usuarios'
const PAPEIS: Papel[] = ['admin', 'gerente', 'caixa']

export type UsuarioState = { erro?: string; ok?: string }
export type NovoUsuarioState = UsuarioState

export async function criarUsuario(
  _prev: NovoUsuarioState,
  formData: FormData,
): Promise<NovoUsuarioState> {
  await requirePapel('admin')

  const nome = String(formData.get('nome') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const senha = String(formData.get('senha') ?? '')
  const papel = String(formData.get('papel') ?? '') as Papel
  const unidadeRaw = String(formData.get('unidade_id') ?? '').trim()
  const unidade_id = papel === 'admin' ? null : unidadeRaw || null

  if (!nome || !email || !senha) return { erro: 'Preencha nome, e-mail e senha.' }
  if (!PAPEIS.includes(papel)) return { erro: 'Selecione um papel válido.' }
  if (senha.length < 6) return { erro: 'A senha deve ter ao menos 6 caracteres.' }
  if (papel !== 'admin' && !unidade_id) return { erro: 'Gerente e Caixa precisam de uma unidade.' }

  const admin = createAdminClient()

  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome },
  })
  if (authErr || !created.user) {
    return { erro: authErr?.message ?? 'Falha ao criar o login.' }
  }

  const { error: perfilErr } = await admin.from('usuarios').insert({
    id: created.user.id,
    nome,
    email,
    papel,
    unidade_id,
  })
  if (perfilErr) {
    await admin.auth.admin.deleteUser(created.user.id)
    return { erro: 'Falha ao criar o perfil: ' + perfilErr.message }
  }

  revalidatePath(ROTA)
  return { ok: `Usuário ${nome} criado com sucesso.` }
}

export async function atualizarUsuario(
  _prev: UsuarioState,
  formData: FormData,
): Promise<UsuarioState> {
  await requirePapel('admin')

  const id = String(formData.get('id'))
  const nome = String(formData.get('nome') ?? '').trim()
  const papel = String(formData.get('papel') ?? '') as Papel
  const unidadeRaw = String(formData.get('unidade_id') ?? '').trim()
  const unidade_id = papel === 'admin' ? null : unidadeRaw || null

  if (!nome) return { erro: 'Informe o nome.' }
  if (!PAPEIS.includes(papel)) return { erro: 'Selecione um papel válido.' }
  if (papel !== 'admin' && !unidade_id) return { erro: 'Gerente e Caixa precisam de uma unidade.' }

  const admin = createAdminClient()
  const { error } = await admin.from('usuarios').update({ nome, papel, unidade_id }).eq('id', id)
  if (error) return { erro: 'Falha ao salvar: ' + error.message }

  revalidatePath(ROTA)
  return { ok: `Usuário ${nome} atualizado com sucesso.` }
}

export async function alternarAtivoUsuario(formData: FormData): Promise<UsuarioState> {
  const me = await requirePapel('admin')
  const id = String(formData.get('id'))
  const ativo = formData.get('ativo') === '1'
  if (id === me.id && !ativo) return { erro: 'Você não pode desativar o próprio usuário.' }

  const admin = createAdminClient()
  const { error } = await admin.from('usuarios').update({ ativo }).eq('id', id)
  if (error) return { erro: 'Falha: ' + error.message }
  revalidatePath(ROTA)
  return {}
}

export async function excluirUsuario(formData: FormData): Promise<UsuarioState> {
  const me = await requirePapel('admin')
  const id = String(formData.get('id'))
  if (id === me.id) return { erro: 'Você não pode excluir o próprio usuário.' }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) {
    if ((error.message ?? '').toLowerCase().includes('foreign') || (error as { code?: string }).code === '23503')
      return {
        erro: 'Não é possível excluir: este usuário possui lançamentos no sistema. Desative-o em vez de excluir.',
      }
    return { erro: 'Falha ao excluir: ' + error.message }
  }
  revalidatePath(ROTA)
  return {}
}
