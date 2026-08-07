'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireModulo } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { parseBRL } from '@/lib/money'
import { ORIGENS_PAGAMENTO } from '@/lib/types'
import type { UsuarioComUnidade } from '@/lib/types'

export type ContaState = { erro?: string; ok?: string }

function parseConta(usuario: UsuarioComUnidade, formData: FormData) {
  const unidade_id =
    usuario.papel === 'admin'
      ? String(formData.get('unidade_id') ?? '').trim()
      : usuario.unidade_id
  return {
    unidade_id,
    centro_custo_id: String(formData.get('centro_custo_id') ?? '').trim(),
    tipo_despesa_id: String(formData.get('tipo_despesa_id') ?? '').trim(),
    data: String(formData.get('data') ?? '').trim(),
    numero_nota: String(formData.get('numero_nota') ?? '').trim() || null,
    valor: parseBRL(String(formData.get('valor') ?? '')),
    origem_pagamento: String(formData.get('origem_pagamento') ?? '').trim(),
  }
}

function validar(v: ReturnType<typeof parseConta>): string | null {
  if (!v.unidade_id) return 'Selecione a unidade.'
  if (!v.centro_custo_id) return 'Selecione o centro de custo.'
  if (!v.tipo_despesa_id) return 'Selecione o tipo de despesa.'
  if (!v.data) return 'Informe a data do pagamento.'
  if (!(v.valor > 0)) return 'Informe um valor válido.'
  if (!ORIGENS_PAGAMENTO.includes(v.origem_pagamento as (typeof ORIGENS_PAGAMENTO)[number]))
    return 'Selecione a origem do pagamento.'
  return null
}

export async function criarConta(_prev: ContaState, formData: FormData): Promise<ContaState> {
  const usuario = await requireModulo('contas')
  const v = parseConta(usuario, formData)
  const erro = validar(v)
  if (erro) return { erro }

  const supabase = await createClient()
  const { error } = await supabase.from('contas_pagas').insert({ ...v, usuario_id: usuario.id })
  if (error) return { erro: 'Falha ao salvar: ' + error.message }

  redirect('/contas')
}

export async function atualizarConta(_prev: ContaState, formData: FormData): Promise<ContaState> {
  const usuario = await requireModulo('contas')
  const id = String(formData.get('id'))
  const v = parseConta(usuario, formData)
  const erro = validar(v)
  if (erro) return { erro }

  const supabase = await createClient()
  const { error } = await supabase.from('contas_pagas').update(v).eq('id', id)
  if (error) return { erro: 'Falha ao salvar: ' + error.message }

  revalidatePath('/contas')
  return { ok: 'Pagamento atualizado com sucesso.' }
}

export async function excluirConta(formData: FormData): Promise<ContaState> {
  await requireModulo('contas')
  const id = String(formData.get('id'))
  const supabase = await createClient()
  const { error } = await supabase.from('contas_pagas').delete().eq('id', id)
  if (error) return { erro: 'Falha ao excluir: ' + error.message }
  revalidatePath('/contas')
  return {}
}
