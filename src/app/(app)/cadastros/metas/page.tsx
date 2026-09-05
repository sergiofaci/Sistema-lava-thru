import { requirePapel } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { PageHeader, Card, EmptyState } from '@/components/ui'
import { formatBRL } from '@/lib/money'
import { MetaForm, ExcluirMeta } from './MetaForm'

function rel(r: unknown) {
  const o = Array.isArray(r) ? r[0] : r
  return (o as { nome?: string })?.nome ?? '—'
}
const mesBR = (m: string) => {
  const [y, mm] = String(m).slice(0, 7).split('-')
  return `${mm}/${y}`
}

export default async function Page() {
  await requirePapel('admin')
  const s = await createClient()
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())

  const [{ data: unidades }, { data: metas }] = await Promise.all([
    s.from('unidades').select('id, nome').eq('ativo', true).order('nome'),
    s.from('metas').select('id, mes, valor_meta, unidade:unidades(nome)').order('mes', { ascending: false }),
  ])

  return (
    <div className="max-w-3xl">
      <PageHeader
        titulo="Metas de Faturamento"
        descricao="Defina a meta mensal por unidade. Alimenta o % atingido e a projeção do dashboard."
      />

      <MetaForm unidades={unidades ?? []} mesPadrao={hoje.slice(0, 7)} />

      {(metas ?? []).length === 0 ? (
        <EmptyState>Nenhuma meta cadastrada ainda.</EmptyState>
      ) : (
        <Card className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="px-5 py-3 font-medium">Mês</th>
                  <th className="px-5 py-3 font-medium">Unidade</th>
                  <th className="px-5 py-3 text-right font-medium">Meta</th>
                  <th className="px-5 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {(metas ?? []).map((m) => (
                  <tr key={m.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-5 py-3 text-slate-600">{mesBR(m.mes as string)}</td>
                    <td className="px-5 py-3 text-slate-700">{rel(m.unidade)}</td>
                    <td className="px-5 py-3 text-right font-medium text-brand-dark">{formatBRL(Number(m.valor_meta))}</td>
                    <td className="px-5 py-3 text-right">
                      <ExcluirMeta id={m.id as string} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
