'use server'

import { redirect } from 'next/navigation'
import { requireModulo } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { parseBRL } from '@/lib/money'
import { ORIGENS_PAGAMENTO } from '@/lib/types'

export type ContaState = { erro?: string }

export async function criarConta(_prev: ContaState, formData: FormData): Promise<ContaState> {
  const usuario = await requireModulo('contas')

  const unidade_id =
    usuario.papel === 'admin'
      ? String(formData.get('unidade_id') ?? '').trim()
      : usuario.unidade_id
  const centro_custo_id = String(formData.get('centro_custo_id') ?? '').trim()
  const tipo_despesa_id = String(formData.get('tipo_despesa_id') ?? '').trim()
  const data = String(formData.get('data') ?? '').trim()
  const numero_nota = String(formData.get('numero_nota') ?? '').trim() || null
  const valor = parseBRL(String(formData.get('valor') ?? ''))
  const origem_pagamento = String(formData.get('origem_pagamento') ?? '').trim()

  if (!unidade_id) return { erro: 'Selecione a unidade.' }
  if (!centro_custo_id) return { erro: 'Selecione o centro de custo.' }
  if (!tipo_despesa_id) return { erro: 'Selecione o tipo de despesa.' }
  if (!data) return { erro: 'Informe a data do pagamento.' }
  if (!(valor > 0)) return { erro: 'Informe um valor válido.' }
  if (!ORIGENS_PAGAMENTO.includes(origem_pagamento as (typeof ORIGENS_PAGAMENTO)[number]))
    return { erro: 'Selecione a origem do pagamento.' }

  const supabase = await createClient()
  const { error } = await supabase.from('contas_pagas').insert({
    unidade_id,
    centro_custo_id,
    tipo_despesa_id,
    data,
    numero_nota,
    valor,
    origem_pagamento,
    usuario_id: usuario.id,
  })

  if (error) return { erro: 'Falha ao salvar: ' + error.message }

  redirect('/contas')
}
