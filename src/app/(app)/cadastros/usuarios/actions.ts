'use server'

import { revalidatePath } from 'next/cache'
import { requirePapel } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Papel } from '@/lib/types'

const ROTA = '/cadastros/usuarios'
const PAPEIS: Papel[] = ['admin', 'gerente', 'caixa']

export type NovoUsuarioState = { erro?: string; ok?: string }

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
  if (papel !== 'admin' && !unidade_id)
    return { erro: 'Gerente e Caixa precisam de uma unidade.' }

  const admin = createAdminClient()

  // 1) cria o login no Auth (já confirmado)
  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome },
  })
  if (authErr || !created.user) {
    return { erro: authErr?.message ?? 'Falha ao criar o login.' }
  }

  // 2) cria o perfil correspondente
  const { error: perfilErr } = await admin.from('usuarios').insert({
    id: created.user.id,
    nome,
    email,
    papel,
    unidade_id,
  })
  if (perfilErr) {
    // desfaz o Auth para não deixar login órfão
    await admin.auth.admin.deleteUser(created.user.id)
    return { erro: 'Falha ao criar o perfil: ' + perfilErr.message }
  }

  revalidatePath(ROTA)
  return { ok: `Usuário ${nome} criado com sucesso.` }
}

export async function alternarAtivoUsuario(formData: FormData) {
  await requirePapel('admin')
  const id = String(formData.get('id'))
  const ativo = formData.get('ativo') === '1'
  const admin = createAdminClient()
  await admin.from('usuarios').update({ ativo }).eq('id', id)
  revalidatePath(ROTA)
}
