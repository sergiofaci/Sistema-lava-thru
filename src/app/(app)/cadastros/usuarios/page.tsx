import { requirePapel } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui'
import { type Papel } from '@/lib/types'
import { NovoUsuarioForm } from './NovoUsuarioForm'
import { UsuariosTabela } from './UsuariosTabela'

type DbRow = {
  id: string
  nome: string
  email: string
  papel: Papel
  ativo: boolean
  unidade_id: string | null
  unidade: { nome: string } | { nome: string }[] | null
}

function nomeUnidade(u: DbRow['unidade']): string {
  if (!u) return '— todas —'
  return Array.isArray(u) ? (u[0]?.nome ?? '—') : u.nome
}

export default async function Page() {
  const me = await requirePapel('admin')
  const supabase = await createClient()

  const [{ data: usuarios }, { data: unidades }] = await Promise.all([
    supabase
      .from('usuarios')
      .select('id, nome, email, papel, ativo, unidade_id, unidade:unidades(nome)')
      .order('nome'),
    supabase.from('unidades').select('id, nome').eq('ativo', true).order('nome'),
  ])

  const rows = ((usuarios ?? []) as DbRow[]).map((u) => ({
    id: u.id,
    nome: u.nome,
    email: u.email,
    papel: u.papel,
    ativo: u.ativo,
    unidadeId: u.unidade_id,
    unidadeNome: nomeUnidade(u.unidade),
  }))

  return (
    <div className="max-w-4xl">
      <PageHeader titulo="Usuários" descricao="Logins individuais com papel e unidade." />
      <NovoUsuarioForm unidades={unidades ?? []} />
      <UsuariosTabela usuarios={rows} unidades={unidades ?? []} meId={me.id} />
    </div>
  )
}
