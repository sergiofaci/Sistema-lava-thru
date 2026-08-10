import { revalidatePath } from 'next/cache'
import { requirePapel } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { CrudManager } from '@/components/CrudManager'
import { crudInserir, crudAtualizar, crudToggle, crudExcluir } from '@/lib/crud-helpers'

const ROTA = '/cadastros/processos'
const TABELA = 'processos'
const ROTULO = 'Processo'

export default async function Page() {
  await requirePapel('admin')
  const s = await createClient()
  const { data } = await s.from(TABELA).select('id, nome, ordem, ativo').order('ordem')

  async function criar(_p: { ok?: string; erro?: string }, fd: FormData) {
    'use server'
    const nome = String(fd.get('nome') ?? '').trim()
    if (!nome) return { erro: 'Informe o nome.' }
    const ordem = Number(fd.get('ordem') ?? 0) || 0
    const r = await crudInserir(TABELA, { nome, ordem }, ROTULO)
    if (r.ok) revalidatePath(ROTA)
    return r
  }
  async function atualizar(_p: { ok?: string; erro?: string }, fd: FormData) {
    'use server'
    const id = String(fd.get('id'))
    const nome = String(fd.get('nome') ?? '').trim()
    if (!nome) return { erro: 'Informe o nome.' }
    const ordem = Number(fd.get('ordem') ?? 0) || 0
    const r = await crudAtualizar(TABELA, id, { nome, ordem }, ROTULO)
    if (r.ok) revalidatePath(ROTA)
    return r
  }
  async function alternarAtivo(fd: FormData) {
    'use server'
    const r = await crudToggle(TABELA, String(fd.get('id')), fd.get('ativo') === '1')
    if (!r.erro) revalidatePath(ROTA)
    return r
  }
  async function excluir(fd: FormData) {
    'use server'
    const r = await crudExcluir(TABELA, String(fd.get('id')))
    if (!r.erro) revalidatePath(ROTA)
    return r
  }

  return (
    <CrudManager
      titulo="Processos das Lavagens"
      descricao="Itens/adicionais que compõem as lavagens (ex.: Shampoo, Cera secante). Depois, defina a composição de cada lavagem em Composição das Lavagens."
      fields={[
        { name: 'nome', label: 'Nome', required: true, placeholder: 'Ex.: Cera secante' },
        { name: 'ordem', label: 'Ordem', type: 'number', defaultValue: 0, hint: 'Exibição' },
      ]}
      itens={data ?? []}
      criar={criar}
      atualizar={atualizar}
      alternarAtivo={alternarAtivo}
      excluir={excluir}
    />
  )
}
