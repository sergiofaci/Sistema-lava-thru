import { revalidatePath } from 'next/cache'
import { requirePapel } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { CrudManager } from '@/components/CrudManager'
import { crudInserir, crudAtualizar, crudToggle, crudExcluir } from '@/lib/crud-helpers'

const ROTA = '/cadastros/produtos'
const TABELA = 'produtos'
const ROTULO = 'Produto'
const MEDIDAS = ['litro', 'unidade', 'kg', 'ml', 'g', 'galão', 'caixa']

function num(v: FormDataEntryValue | null) {
  return Number(String(v ?? '0').replace(',', '.')) || 0
}

export default async function Page() {
  await requirePapel('admin')
  const s = await createClient()
  const { data } = await s
    .from(TABELA)
    .select('id, nome, unidade_medida, estoque_minimo, ativo')
    .order('nome')

  async function criar(_p: { ok?: string; erro?: string }, fd: FormData) {
    'use server'
    const nome = String(fd.get('nome') ?? '').trim()
    const unidade_medida = String(fd.get('unidade_medida') ?? '').trim()
    if (!nome || !unidade_medida) return { erro: 'Informe nome e unidade de medida.' }
    const r = await crudInserir(TABELA, { nome, unidade_medida, estoque_minimo: num(fd.get('estoque_minimo')) }, ROTULO)
    if (r.ok) revalidatePath(ROTA)
    return r
  }
  async function atualizar(_p: { ok?: string; erro?: string }, fd: FormData) {
    'use server'
    const id = String(fd.get('id'))
    const nome = String(fd.get('nome') ?? '').trim()
    const unidade_medida = String(fd.get('unidade_medida') ?? '').trim()
    if (!nome || !unidade_medida) return { erro: 'Informe nome e unidade de medida.' }
    const r = await crudAtualizar(TABELA, id, { nome, unidade_medida, estoque_minimo: num(fd.get('estoque_minimo')) }, ROTULO)
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
      titulo="Produtos"
      descricao="Insumos controlados no estoque. O estoque mínimo gera alerta de reposição."
      fields={[
        { name: 'nome', label: 'Nome', required: true, placeholder: 'Ex.: Shampoo automotivo' },
        {
          name: 'unidade_medida',
          label: 'Unidade',
          type: 'select',
          required: true,
          defaultValue: 'litro',
          options: MEDIDAS.map((m) => ({ value: m, label: m })),
        },
        { name: 'estoque_minimo', label: 'Estoque mín.', type: 'number', defaultValue: 0 },
      ]}
      itens={data ?? []}
      criar={criar}
      atualizar={atualizar}
      alternarAtivo={alternarAtivo}
      excluir={excluir}
    />
  )
}
