import { requirePapel } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { PageHeader, Card, EmptyState, Badge } from '@/components/ui'
import { PAPEL_LABEL, type Papel } from '@/lib/types'
import { NovoUsuarioForm } from './NovoUsuarioForm'
import { alternarAtivoUsuario } from './actions'

type Row = {
  id: string
  nome: string
  email: string
  papel: Papel
  ativo: boolean
  unidade: { nome: string } | { nome: string }[] | null
}

function nomeUnidade(u: Row['unidade']): string {
  if (!u) return '— todas —'
  return Array.isArray(u) ? (u[0]?.nome ?? '—') : u.nome
}

export default async function Page() {
  await requirePapel('admin')
  const supabase = await createClient()

  const [{ data: usuarios }, { data: unidades }] = await Promise.all([
    supabase
      .from('usuarios')
      .select('id, nome, email, papel, ativo, unidade:unidades(nome)')
      .order('nome'),
    supabase.from('unidades').select('id, nome').eq('ativo', true).order('nome'),
  ])

  return (
    <div className="max-w-4xl">
      <PageHeader titulo="Usuários" descricao="Logins individuais com papel e unidade." />

      <NovoUsuarioForm unidades={unidades ?? []} />

      {!usuarios || usuarios.length === 0 ? (
        <EmptyState>Nenhum usuário cadastrado ainda.</EmptyState>
      ) : (
        <Card className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="px-5 py-3 font-medium">Nome</th>
                <th className="px-5 py-3 font-medium">E-mail</th>
                <th className="px-5 py-3 font-medium">Papel</th>
                <th className="px-5 py-3 font-medium">Unidade</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {(usuarios as Row[]).map((u) => (
                <tr key={u.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-5 py-3 font-medium text-slate-700">{u.nome}</td>
                  <td className="px-5 py-3 text-slate-500">{u.email}</td>
                  <td className="px-5 py-3 text-slate-500">{PAPEL_LABEL[u.papel]}</td>
                  <td className="px-5 py-3 text-slate-500">{nomeUnidade(u.unidade)}</td>
                  <td className="px-5 py-3">
                    {u.ativo ? <Badge tone="success">Ativo</Badge> : <Badge>Inativo</Badge>}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <form action={alternarAtivoUsuario}>
                      <input type="hidden" name="id" value={u.id} />
                      <input type="hidden" name="ativo" value={u.ativo ? '0' : '1'} />
                      <button type="submit" className="text-sm text-brand hover:underline">
                        {u.ativo ? 'Desativar' : 'Ativar'}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
