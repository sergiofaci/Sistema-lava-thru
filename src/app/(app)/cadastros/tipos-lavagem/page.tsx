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

const ROTA = '/cadastros/tipos-lavagem'

export default async function Page() {
  await requirePapel('admin')
  const supabase = await createClient()
  const { data } = await supabase
    .from('tipos_lavagem')
    .select('id, nome, ordem, ativo')
    .order('ordem')

  async function criar(formData: FormData) {
    'use server'
    await requirePapel('admin')
    const nome = String(formData.get('nome') ?? '').trim()
    if (!nome) return
    const ordem = Number(formData.get('ordem') ?? 0) || 0
    const s = await createClient()
    await s.from('tipos_lavagem').insert({ nome, ordem })
    revalidatePath(ROTA)
  }

  async function alternarAtivo(formData: FormData) {
    'use server'
    await requirePapel('admin')
    const id = String(formData.get('id'))
    const ativo = formData.get('ativo') === '1'
    const s = await createClient()
    await s.from('tipos_lavagem').update({ ativo }).eq('id', id)
    revalidatePath(ROTA)
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        titulo="Tipos de Lavagem"
        descricao="Serviços registrados por quantidade no fechamento de caixa."
      />

      <Card className="mb-6">
        <form action={criar} className="flex flex-wrap items-end gap-3">
          <div className="min-w-48 flex-1">
            <Field label="Nome" htmlFor="nome">
              <input id="nome" name="nome" required placeholder="Ex.: Premium" className={inputClass} />
            </Field>
          </div>
          <div className="w-24">
            <Field label="Ordem" htmlFor="ordem" hint="Exibição">
              <input id="ordem" name="ordem" type="number" defaultValue={0} className={inputClass} />
            </Field>
          </div>
          <button type="submit" className={btnPrimary}>
            Adicionar
          </button>
        </form>
      </Card>

      {!data || data.length === 0 ? (
        <EmptyState>Nenhum tipo de lavagem cadastrado.</EmptyState>
      ) : (
        <Card className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="px-5 py-3 font-medium">Serviço</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {data.map((t) => (
                <tr key={t.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-5 py-3 font-medium text-slate-700">{t.nome}</td>
                  <td className="px-5 py-3">
                    {t.ativo ? <Badge tone="success">Ativo</Badge> : <Badge>Inativo</Badge>}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <form action={alternarAtivo}>
                      <input type="hidden" name="id" value={t.id} />
                      <input type="hidden" name="ativo" value={t.ativo ? '0' : '1'} />
                      <button type="submit" className="text-sm text-brand hover:underline">
                        {t.ativo ? 'Desativar' : 'Ativar'}
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
