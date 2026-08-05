import { PageHeader, Card, Field, inputClass, btnPrimary, EmptyState, Badge } from '@/components/ui'

export type ItemSimples = { id: string; nome: string; ativo: boolean }

// Cadastro reutilizável de entidades "nome + ativo".
export function CadastroSimples({
  titulo,
  descricao,
  itens,
  criar,
  alternarAtivo,
  placeholder = 'Nome',
}: {
  titulo: string
  descricao?: string
  itens: ItemSimples[]
  criar: (formData: FormData) => void | Promise<void>
  alternarAtivo: (formData: FormData) => void | Promise<void>
  placeholder?: string
}) {
  return (
    <div className="max-w-3xl">
      <PageHeader titulo={titulo} descricao={descricao} />

      <Card className="mb-6">
        <form action={criar} className="flex items-end gap-3">
          <div className="flex-1">
            <Field label="Novo registro" htmlFor="nome">
              <input id="nome" name="nome" required placeholder={placeholder} className={inputClass} />
            </Field>
          </div>
          <button type="submit" className={btnPrimary}>
            Adicionar
          </button>
        </form>
      </Card>

      {itens.length === 0 ? (
        <EmptyState>Nenhum registro cadastrado ainda.</EmptyState>
      ) : (
        <Card className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="px-5 py-3 font-medium">Nome</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {itens.map((i) => (
                <tr key={i.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-5 py-3 text-slate-700">{i.nome}</td>
                  <td className="px-5 py-3">
                    {i.ativo ? <Badge tone="success">Ativo</Badge> : <Badge>Inativo</Badge>}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <form action={alternarAtivo}>
                      <input type="hidden" name="id" value={i.id} />
                      <input type="hidden" name="ativo" value={i.ativo ? '0' : '1'} />
                      <button type="submit" className="text-sm text-brand hover:underline">
                        {i.ativo ? 'Desativar' : 'Ativar'}
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
