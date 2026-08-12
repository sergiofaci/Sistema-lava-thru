import Link from 'next/link'
import { requireModulo } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { PageHeader, inputClass, btnPrimary, Card, EmptyState } from '@/components/ui'
import { formatQtd, formatBRL, round2 } from '@/lib/money'
import { toCSV } from '@/lib/csv'
import { ExportBar } from '@/components/ExportBar'

type SP = { mes?: string; unidade?: string; local?: string }

function rel(r: unknown, campo = 'nome'): string {
  if (!r) return '—'
  const o = Array.isArray(r) ? r[0] : r
  return (o as Record<string, string>)?.[campo] ?? '—'
}

type SaidaRow = {
  data: string
  quantidade: number
  valor_total: number | null
  produto_id: string
  unidade_id: string
  local_uso_id: string | null
  produto: unknown
  unidade: unknown
  local: unknown
}

export default async function ConsumoPage({ searchParams }: { searchParams: Promise<SP> }) {
  const usuario = await requireModulo('estoque')
  const sp = await searchParams
  const supabase = await createClient()

  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
  const mes = sp.mes && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : hoje.slice(0, 7)
  const [Y, M] = mes.split('-').map(Number)
  const mesInicio = `${mes}-01`
  const mesFim = `${mes}-${String(new Date(Y, M, 0).getDate()).padStart(2, '0')}`
  const mesLabel = new Date(Y, M - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  const unidadeFiltro = usuario.papel === 'admin' ? sp.unidade || '' : ''
  const localFiltro = sp.local || ''
  const todasUnidades = usuario.papel === 'admin' && !unidadeFiltro

  let q = supabase
    .from('estoque_saidas')
    .select(
      'data, quantidade, valor_total, produto_id, unidade_id, local_uso_id, produto:produtos(nome, unidade_medida), unidade:unidades(nome), local:locais_uso(nome)',
    )
    .gte('data', mesInicio)
    .lte('data', mesFim)
  if (unidadeFiltro) q = q.eq('unidade_id', unidadeFiltro)
  if (localFiltro) q = q.eq('local_uso_id', localFiltro)

  const [{ data: saidasData }, unidadesRes, locaisRes] = await Promise.all([
    q,
    usuario.papel === 'admin'
      ? supabase.from('unidades').select('id, nome').order('nome')
      : Promise.resolve({ data: null }),
    supabase.from('locais_uso').select('id, nome').order('nome'),
  ])

  const saidas = (saidasData ?? []) as SaidaRow[]

  // Agrega por produto (+ unidade quando exibindo todas as unidades).
  type Agg = { produto: string; medida: string; unidade: string; qtd: number; valor: number }
  const mapa = new Map<string, Agg>()
  for (const s of saidas) {
    const chave = todasUnidades ? `${s.produto_id}|${s.unidade_id}` : s.produto_id
    const item =
      mapa.get(chave) ??
      {
        produto: rel(s.produto),
        medida: rel(s.produto, 'unidade_medida'),
        unidade: rel(s.unidade),
        qtd: 0,
        valor: 0,
      }
    // Soma sem arredondar a cada passo (quantidade pode ter 3 casas).
    item.qtd = item.qtd + Number(s.quantidade)
    item.valor = item.valor + Number(s.valor_total ?? 0)
    mapa.set(chave, item)
  }
  const round3 = (n: number) => Math.round(n * 1000) / 1000
  const linhas = [...mapa.values()]
    .map((l) => ({ ...l, qtd: round3(l.qtd), valor: round2(l.valor) }))
    .sort((a, b) => b.valor - a.valor)
  const totalValor = round2(linhas.reduce((s, l) => s + l.valor, 0))

  // Detalhe: cada baixa do período, para reconciliar com a quantidade.
  const dataBR = (iso: string) => {
    const [y, m, d] = String(iso).slice(0, 10).split('-')
    return `${d}/${m}/${y}`
  }
  const detalhe = saidas
    .map((s) => ({
      data: s.data,
      produto: rel(s.produto),
      medida: rel(s.produto, 'unidade_medida'),
      unidade: rel(s.unidade),
      local: rel(s.local),
      qtd: Number(s.quantidade),
      valor: Number(s.valor_total ?? 0),
    }))
    .sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : a.produto.localeCompare(b.produto)))

  const csv = toCSV([
    ['Consumo de estoque por produto', mesLabel],
    [],
    todasUnidades
      ? ['Produto', 'Unidade', 'Medida', 'Qtd consumida', 'Valor total', '% do total']
      : ['Produto', 'Medida', 'Qtd consumida', 'Valor total', '% do total'],
    ...linhas.map((l) => {
      const pct = totalValor > 0 ? ((l.valor / totalValor) * 100).toFixed(1) : '0,0'
      const base = [
        l.produto,
        ...(todasUnidades ? [l.unidade] : []),
        l.medida,
        formatQtd(l.qtd),
        l.valor.toFixed(2).replace('.', ','),
        pct,
      ]
      return base
    }),
    [],
    [todasUnidades ? '' : '', 'TOTAL', ...(todasUnidades ? [''] : []), '', totalValor.toFixed(2).replace('.', ','), '100'],
  ])

  const unidades = unidadesRes.data
  const locais = locaisRes.data ?? []

  return (
    <div>
      <PageHeader
        titulo="Consumo por produto"
        descricao={`${mesLabel} — quantidade e valor consumidos (baixas de estoque).`}
        acao={
          <div className="flex flex-wrap items-center gap-2">
            <ExportBar csv={csv} filename={`consumo-estoque-${mes}`} />
            <form method="get" className="flex flex-wrap items-center gap-2">
              {unidades && (
                <select name="unidade" defaultValue={unidadeFiltro} className={inputClass}>
                  <option value="">Todas as unidades</option>
                  {unidades.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nome}
                    </option>
                  ))}
                </select>
              )}
              <select name="local" defaultValue={localFiltro} className={inputClass}>
                <option value="">Todos os locais</option>
                {locais.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nome}
                  </option>
                ))}
              </select>
              <input type="month" name="mes" defaultValue={mes} className={inputClass} />
              <button type="submit" className={btnPrimary}>
                Aplicar
              </button>
            </form>
          </div>
        }
      />

      <div className="no-print mb-4">
        <Link href="/estoque" className="text-sm text-brand hover:underline">
          ← Voltar ao estoque
        </Link>
      </div>

      {linhas.length === 0 ? (
        <EmptyState>Nenhum consumo registrado neste período.</EmptyState>
      ) : (
        <Card className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="px-5 py-3 font-medium">Produto</th>
                  {todasUnidades && <th className="px-5 py-3 font-medium">Unidade</th>}
                  <th className="px-5 py-3 text-right font-medium">Qtd. consumida</th>
                  <th className="px-5 py-3 text-right font-medium">Valor total</th>
                  <th className="px-5 py-3 text-right font-medium">% do total</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((l, i) => {
                  const pct = totalValor > 0 ? (l.valor / totalValor) * 100 : 0
                  return (
                    <tr key={i} className="border-b border-slate-100 last:border-0">
                      <td className="px-5 py-3 font-medium text-slate-700">{l.produto}</td>
                      {todasUnidades && <td className="px-5 py-3 text-slate-600">{l.unidade}</td>}
                      <td className="px-5 py-3 text-right text-slate-600">
                        {formatQtd(l.qtd)} {l.medida}
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-slate-700">{formatBRL(l.valor)}</td>
                      <td className="px-5 py-3 text-right text-slate-500">{pct.toFixed(1)}%</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 font-semibold">
                  <td className="px-5 py-3 text-slate-700" colSpan={todasUnidades ? 3 : 2}>
                    Total consumido
                  </td>
                  <td className="px-5 py-3 text-right text-slate-800">{formatBRL(totalValor)}</td>
                  <td className="px-5 py-3 text-right text-slate-500">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      {detalhe.length > 0 && (
        <Card className="mt-6 p-0">
          <div className="border-b border-slate-200 px-5 py-3">
            <h2 className="font-semibold text-brand-dark">Baixas do período (detalhado)</h2>
            <p className="text-xs text-slate-500">
              {detalhe.length} baixa(s) — a soma por produto acima vem exatamente destas linhas.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="px-5 py-3 font-medium">Data</th>
                  <th className="px-5 py-3 font-medium">Produto</th>
                  {todasUnidades && <th className="px-5 py-3 font-medium">Unidade</th>}
                  <th className="px-5 py-3 font-medium">Local</th>
                  <th className="px-5 py-3 text-right font-medium">Qtd.</th>
                  <th className="px-5 py-3 text-right font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {detalhe.map((d, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0">
                    <td className="px-5 py-3 text-slate-600">{dataBR(d.data)}</td>
                    <td className="px-5 py-3 text-slate-700">{d.produto}</td>
                    {todasUnidades && <td className="px-5 py-3 text-slate-600">{d.unidade}</td>}
                    <td className="px-5 py-3 text-slate-500">{d.local}</td>
                    <td className="px-5 py-3 text-right text-slate-600">
                      {formatQtd(d.qtd)} {d.medida}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-600">{formatBRL(d.valor)}</td>
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
