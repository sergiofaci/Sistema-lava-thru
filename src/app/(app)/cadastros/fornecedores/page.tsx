import { revalidatePath } from 'next/cache'
import { requirePapel } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { CrudManager } from '@/components/CrudManager'
import { crudInserir, crudAtualizar, crudToggle, crudExcluir } from '@/lib/crud-helpers'

const ROTA = '/cadastros/fornecedores'
const TABELA = 'fornecedores'
const ROTULO = 'Fornecedor'

function ler(fd: FormData) {
  const razao_social = String(fd.get('razao_social') ?? '').trim()
  if (!razao_social) return { erro: 'Informe a razão social.' }
  return {
    valores: {
      razao_social,
      categoria: String(fd.get('categoria') ?? '').trim() || null,
      cnpj: String(fd.get('cnpj') ?? '').trim() || null,
      contato: String(fd.get('contato') ?? '').trim() || null,
      telefone: String(fd.get('telefone') ?? '').trim() || null,
      email: String(fd.get('email') ?? '').trim() || null,
    },
  }
}

export default async function Page() {
  await requirePapel('admin')
  const s = await createClient()
  const { data } = await s
    .from(TABELA)
    .select('id, razao_social, categoria, cnpj, contato, telefone, email, ativo')
    .order('razao_social')

  async function criar(_p: { ok?: string; erro?: string }, fd: FormData) {
    'use server'
    const p = ler(fd)
    if (p.erro) return { erro: p.erro }
    const r = await crudInserir(TABELA, p.valores!, ROTULO)
    if (r.ok) revalidatePath(ROTA)
    return r
  }
  async function atualizar(_p: { ok?: string; erro?: string }, fd: FormData) {
    'use server'
    const p = ler(fd)
    if (p.erro) return { erro: p.erro }
    const r = await crudAtualizar(TABELA, String(fd.get('id')), p.valores!, ROTULO)
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
      titulo="Fornecedores"
      descricao="Cadastro de fornecedores para usar nos lançamentos de contas a pagar."
      fields={[
        { name: 'razao_social', label: 'Razão social', required: true, placeholder: 'Ex.: Distribuidora ABC Ltda' },
        { name: 'categoria', label: 'Categoria', placeholder: 'Ex.: Produtos de limpeza' },
        { name: 'cnpj', label: 'CNPJ', placeholder: '00.000.000/0000-00' },
        { name: 'contato', label: 'Contato', placeholder: 'Nome do contato' },
        { name: 'telefone', label: 'Telefone', placeholder: '(00) 00000-0000' },
        { name: 'email', label: 'E-mail', placeholder: 'contato@fornecedor.com' },
      ]}
      itens={data ?? []}
      criar={criar}
      atualizar={atualizar}
      alternarAtivo={alternarAtivo}
      excluir={excluir}
    />
  )
}
