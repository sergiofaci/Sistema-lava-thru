import Link from 'next/link'
import { requireModulo } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { PageHeader, inputClass, btnPrimary, Card, EmptyState } from '@/components/ui'
import { toCSV } from '@/lib/csv'
import { ExportBar } from '@/components/ExportBar'

type SP = { unidade?: string; mes?: string }

function rel(r: unknown, campo = 'nome'): string {
  if (!r) return '—'
  const o = Array.isArray(r) ? r[0] : r
  return (o as Record<string, string>)?.[campo] ?? '—'
}
function relNum(r: unknown, campo: string): number {
  const o = Array.isArray(r) ? r[0] : r
  return Number((o as Record<string, number>)?.[campo] ?? 0)
}
const dataBR = (iso: string) => {
  const [y, m, d] = String(iso).slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

type Lav = { quantidade: number; tipo: unknown }
type Fech = { data: string; turno: string; lavagens: Lav[] }

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const usuario = await requireModulo('fechamentos_historico')
  const sp = await searchParams
  const supabase = await createClient()

  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
  const mes = sp.mes && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : hoje.slice(0, 7)
  const [Y, M] = mes.split('-').map(Number)
  const mesInicio = `${mes}-01`
  const mesFim = `${mes}-${String(new Date(Y, M, 0).getDate()).padStart(2, '0')}`
  const mesLabel = new Date(Y, M - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  const unidadeFiltro = usuario.papel === 'admin' ? sp.unidade || '' : ''
  const unidades =
    usuario.papel === 'admin'
      ? (await supabase.from('unidades').select('id, nome').eq('ativo', true).order('nome')).data ?? []
      : []

  let q = supabase
    .from('fechamentos_caixa')
    .select('data, turno, lavagens:fechamento_lavagens(quantidade, tipo:tipos_lavagem(nome, ordem))')
    .gte('data', mesInicio)
    .lte('data', mesFim)
  if (unidadeFiltro) q = q.eq('unidade_id', unidadeFiltro)
  const { data } = await q
  const fechs = (data ?? []) as Fech[]

  // Tipos presentes (ordenados por ordem) e pivô dia × tipo.
  const ordemTipo = new Map<string, number>()
  const porDia = new Map<string, Map<string, number>>()
  const totalTipo = new Map<string, number>()
  for (const f of fechs) {
    for (const l of f.lavagens ?? []) {
      const nome = rel(l.tipo)
      ordemTipo.set(nome, relNum(l.tipo, 'ordem'))
      const dia = porDia.get(f.data) ?? new Map<string, number>()
      dia.set(nome, (dia.get(nome) ?? 0) + Number(l.quantidade))
      porDia.set(f.data, dia)
      totalTipo.set(nome, (totalTipo.get(nome) ?? 0) + Number(l.quantidade))
    }
  }
  const tipos = [...ordemTipo.entries()].sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0])).map((e) => e[0])
  const dias = [...porDia.keys()].sort()
  const totalDia = (d: string) => tipos.reduce((s, t) => s + (porDia.get(d)?.get(t) ?? 0), 0)
  const totalGeral = tipos.reduce((s, t) => s + (totalTipo.get(t) ?? 0), 0)

  const csv = toCSV([
    [`Lavagens por dia — ${mesLabel}`],
    ['Data', ...tipos, 'Total do dia'],
    ...dias.map((d) => [dataBR(d), ...tipos.map((t) => porDia.get(d)?.get(t) ?? 0), totalDia(d)]),
    ['TOTAL', ...tipos.map((t) => totalTipo.get(t) ?? 0), totalGeral],
  ])

  return (
    <div>
      <PageHeader
        titulo="Lavagens por dia"
        descricao={`${mesLabel} — quantidade por tipo, lançada nos fechamentos (para conferência).`}
        acao={
          <div className="flex flex-wrap items-center gap-2">
            <ExportBar csv={csv} filename={`lavagens-por-dia-${mes}`} />
            <form method="get" className="flex flex-wrap items-center gap-2">
              {usuario.papel === 'admin' && (
                <select name="unidade" defaultValue={unidadeFiltro} className={inputClass}>
                  <option value="">Todas as unidades</option>
                  {unidades.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nome}
                    </option>
                  ))}
                </select>
              )}
              <input type="month" name="mes" defaultValue={mes} className={inputClass} />
              <button type="submit" className={btnPrimary}>
                Aplicar
              </button>
            </form>
          </div>
        }
      />

      <div className="no-print mb-4">
        <Link href="/fechamentos" className="text-sm text-brand hover:underline">
          ← Voltar aos fechamentos
        </Link>
      </div>

      {dias.length === 0 ? (
        <EmptyState>Nenhuma lavagem lançada neste período.</EmptyState>
      ) : (
        <Card className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="sticky left-0 bg-white px-4 py-3 font-medium">Data</th>
                  {tipos.map((t) => (
                    <th key={t} className="px-3 py-3 text-right font-medium">
                      {t}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {dias.map((d) => (
                  <tr key={d} className="border-b border-slate-100 last:border-0">
                    <td className="sticky left-0 bg-white px-4 py-2 font-medium text-slate-700">{dataBR(d)}</td>
                    {tipos.map((t) => {
                      const v = porDia.get(d)?.get(t) ?? 0
                      return (
                        <td key={t} className={`px-3 py-2 text-right ${v > 0 ? 'text-slate-700' : 'text-slate-300'}`}>
                          {v > 0 ? v : '—'}
                        </td>
                      )
                    })}
                    <td className="px-4 py-2 text-right font-semibold text-brand-dark">{totalDia(d)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 font-semibold">
                  <td className="sticky left-0 bg-white px-4 py-3 text-slate-700">TOTAL</td>
                  {tipos.map((t) => (
                    <td key={t} className="px-3 py-3 text-right text-slate-700">
                      {totalTipo.get(t) ?? 0}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right text-brand-dark">{totalGeral}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
