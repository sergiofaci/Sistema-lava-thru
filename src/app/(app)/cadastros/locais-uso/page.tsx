import { revalidatePath } from 'next/cache'
import { requirePapel } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { CrudManager } from '@/components/CrudManager'
import { crudInserir, crudAtualizar, crudToggle, crudExcluir } from '@/lib/crud-helpers'

const ROTA = '/cadastros/locais-uso'
const TABELA = 'locais_uso'
const ROTULO = 'Local de uso'

export default async function Page() {
  await requirePapel('admin')
  const s = await createClient()
  const { data } = await s.from(TABELA).select('id, nome, ativo').order('nome')

  async function criar(_p: { ok?: string; erro?: string }, fd: FormData) {
    'use server'
    const nome = String(fd.get('nome') ?? '').trim()
    if (!nome) return { erro: 'Informe o nome.' }
    const r = await crudInserir(TABELA, { nome }, ROTULO)
    if (r.ok) revalidatePath(ROTA)
    return r
  }
  async function atualizar(_p: { ok?: string; erro?: string }, fd: FormData) {
    'use server'
    const id = String(fd.get('id'))
    const nome = String(fd.get('nome') ?? '').trim()
    if (!nome) return { erro: 'Informe o nome.' }
    const r = await crudAtualizar(TABELA, id, { nome }, ROTULO)
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
      titulo="Locais de Uso"
      descricao="Onde os produtos são consumidos. Ex.: Túnel, Limpeza Interna."
      fields={[{ name: 'nome', label: 'Nome', required: true, placeholder: 'Nome' }]}
      itens={data ?? []}
      criar={criar}
      atualizar={atualizar}
      alternarAtivo={alternarAtivo}
      excluir={excluir}
    />
  )
}
