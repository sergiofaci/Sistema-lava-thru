import { revalidatePath } from 'next/cache'
import { requirePapel } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { CrudManager } from '@/components/CrudManager'
import { crudInserir, crudAtualizar, crudToggle, crudExcluir } from '@/lib/crud-helpers'

const ROTA = '/cadastros/tipos-lavagem'
const TABELA = 'tipos_lavagem'
const ROTULO = 'Tipo de lavagem'

// Escopo de módulo: server actions inline não podem capturar função local.
const normCategoria = (v: unknown) => (String(v ?? '') === 'servico' ? 'servico' : 'lavagem')

export default async function Page() {
  await requirePapel('admin')
  const s = await createClient()
  const { data } = await s.from(TABELA).select('id, nome, ordem, categoria, ativo').order('ordem')

  async function criar(_p: { ok?: string; erro?: string }, fd: FormData) {
    'use server'
    const nome = String(fd.get('nome') ?? '').trim()
    if (!nome) return { erro: 'Informe o nome.' }
    const ordem = Number(fd.get('ordem') ?? 0) || 0
    const categoria = normCategoria(fd.get('categoria'))
    const r = await crudInserir(TABELA, { nome, ordem, categoria }, ROTULO)
    if (r.ok) revalidatePath(ROTA)
    return r
  }
  async function atualizar(_p: { ok?: string; erro?: string }, fd: FormData) {
    'use server'
    const id = String(fd.get('id'))
    const nome = String(fd.get('nome') ?? '').trim()
    if (!nome) return { erro: 'Informe o nome.' }
    const ordem = Number(fd.get('ordem') ?? 0) || 0
    const categoria = normCategoria(fd.get('categoria'))
    const r = await crudAtualizar(TABELA, id, { nome, ordem, categoria }, ROTULO)
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
      titulo="Tipos de Lavagem"
      descricao="Serviços registrados por quantidade no fechamento de caixa."
      fields={[
        { name: 'nome', label: 'Nome', required: true, placeholder: 'Ex.: Premium' },
        {
          name: 'categoria',
          label: 'Categoria',
          type: 'select',
          required: true,
          defaultValue: 'lavagem',
          hint: 'Serviço não conta como lavagem',
          options: [
            { value: 'lavagem', label: 'Lavagem' },
            { value: 'servico', label: 'Serviço adicional' },
          ],
        },
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
