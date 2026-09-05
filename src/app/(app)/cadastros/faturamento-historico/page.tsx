import { requirePapel } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { PageHeader, Card } from '@/components/ui'
import { formatBRL, round2 } from '@/lib/money'
import { Importador } from './Importador'

export default async function Page() {
  await requirePapel('admin')
  const s = await createClient()

  const [{ data: unidades }, { data: hist }] = await Promise.all([
    s.from('unidades').select('id, nome').eq('ativo', true).order('nome'),
    s
      .from('faturamento_historico')
      .select('mes, categoria, valor, unidade:unidades(nome)')
      .order('mes', { ascending: false }),
  ])

  // Resumo por mês/unidade/categoria
  type Row = { mes: string; categoria: string; valor: number; unidade: unknown }
  const rows = (hist ?? []) as Row[]
  const rel = (r: unknown) => {
    const o = Array.isArray(r) ? r[0] : r
    return (o as { nome?: string })?.nome ?? '—'
  }
  const mapa = new Map<string, { mes: string; unidade: string; lavagem: number; assinatura: number; outro: number }>()
  for (const r of rows) {
    const uni = rel(r.unidade)
    const k = `${r.mes}|${uni}`
    const a = mapa.get(k) ?? { mes: r.mes, unidade: uni, lavagem: 0, assinatura: 0, outro: 0 }
    if (r.categoria === 'assinatura') a.assinatura = round2(a.assinatura + r.valor)
    else if (r.categoria === 'outro') a.outro = round2(a.outro + r.valor)
    else a.lavagem = round2(a.lavagem + r.valor)
    mapa.set(k, a)
  }
  const resumo = [...mapa.values()].sort((a, b) => b.mes.localeCompare(a.mes) || a.unidade.localeCompare(b.unidade))
  const mesBR = (m: string) => {
    const [y, mm] = m.split('-')
    return `${mm}/${y}`
  }

  return (
    <div className="max-w-4xl">
      <PageHeader
        titulo="Histórico de Faturamento"
        descricao="Importe o faturamento do sistema antigo (lavagens e assinaturas) para alimentar as comparações do dashboard."
      />

      <Importador unidades={unidades ?? []} />

      {resumo.length > 0 && (
        <Card className="mt-6 p-0">
          <div className="border-b border-slate-200 px-5 py-3">
            <h2 className="font-semibold text-brand-dark">Já importado</h2>
            <p className="text-xs text-slate-500">Reimportar um mês/unidade substitui os valores.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-2 font-medium">Mês</th>
                  <th className="px-5 py-2 font-medium">Unidade</th>
                  <th className="px-5 py-2 text-right font-medium">Lavagens</th>
                  <th className="px-5 py-2 text-right font-medium">Assinaturas</th>
                  <th className="px-5 py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {resumo.map((r) => (
                  <tr key={`${r.mes}|${r.unidade}`} className="border-b border-slate-100 last:border-0">
                    <td className="px-5 py-2 text-slate-600">{mesBR(r.mes)}</td>
                    <td className="px-5 py-2 text-slate-600">{r.unidade}</td>
                    <td className="px-5 py-2 text-right text-slate-600">{formatBRL(r.lavagem)}</td>
                    <td className="px-5 py-2 text-right text-slate-600">{formatBRL(r.assinatura)}</td>
                    <td className="px-5 py-2 text-right font-medium text-brand-dark">
                      {formatBRL(round2(r.lavagem + r.assinatura + r.outro))}
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
