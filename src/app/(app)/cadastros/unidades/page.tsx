import { revalidatePath } from 'next/cache'
import { requirePapel } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import {
  PageHeader,
  Card,
  Field,
  inputClass,
  btnPrimary,
  EmptyState,
  Badge,
} from '@/components/ui'

const ROTA = '/cadastros/unidades'

export default async function Page() {
  await requirePapel('admin')
  const supabase = await createClient()
  const { data: unidades } = await supabase
    .from('unidades')
    .select('id, nome, endereco, ativo')
    .order('nome')

  async function criar(formData: FormData) {
    'use server'
    await requirePapel('admin')
    const nome = String(formData.get('nome') ?? '').trim()
    const endereco = String(formData.get('endereco') ?? '').trim() || null
    if (!nome) return
    const s = await createClient()
    await s.from('unidades').insert({ nome, endereco })
    revalidatePath(ROTA)
  }

  async function alternarAtivo(formData: FormData) {
    'use server'
    await requirePapel('admin')
    const id = String(formData.get('id'))
    const ativo = formData.get('ativo') === '1'
    const s = await createClient()
    await s.from('unidades').update({ ativo }).eq('id', id)
    revalidatePath(ROTA)
  }

  return (
    <div className="max-w-3xl">
      <PageHeader titulo="Unidades" descricao="As lojas da rede Lava Thru." />

      <Card className="mb-6">
        <form action={criar} className="space-y-4">
          <Field label="Nome" htmlFor="nome">
            <input id="nome" name="nome" required placeholder="Ex.: Lava Thru — Centro" className={inputClass} />
          </Field>
          <Field label="Endereço" htmlFor="endereco">
            <input id="endereco" name="endereco" placeholder="Rua, número, bairro, cidade" className={inputClass} />
          </Field>
          <button type="submit" className={btnPrimary}>
            Adicionar unidade
          </button>
        </form>
      </Card>

      {!unidades || unidades.length === 0 ? (
        <EmptyState>Nenhuma unidade cadastrada ainda.</EmptyState>
      ) : (
        <Card className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="px-5 py-3 font-medium">Nome</th>
                <th className="px-5 py-3 font-medium">Endereço</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {unidades.map((u) => (
                <tr key={u.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-5 py-3 font-medium text-slate-700">{u.nome}</td>
                  <td className="px-5 py-3 text-slate-500">{u.endereco ?? '—'}</td>
                  <td className="px-5 py-3">
                    {u.ativo ? <Badge tone="success">Ativa</Badge> : <Badge>Inativa</Badge>}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <form action={alternarAtivo}>
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
