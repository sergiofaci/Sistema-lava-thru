import { redirect } from 'next/navigation'
import { requireUsuario } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { Card, inputClass, btnPrimary, Badge } from '@/components/ui'
import { BarsCard } from '@/components/charts'
import { formatBRL, formatQtd, round2 } from '@/lib/money'

type SP = { unidade?: string; mes?: string }

function rel(r: unknown, campo = 'nome'): string {
  if (!r) return '—'
  const o = Array.isArray(r) ? r[0] : r
  return (o as Record<string, string>)?.[campo] ?? '—'
}

const FORMAS = [
  { key: 'sistema_dinheiro', nome: 'Dinheiro' },
  { key: 'sistema_pix', nome: 'Pix' },
  { key: 'sistema_credito', nome: 'Crédito' },
  { key: 'sistema_debito', nome: 'Débito' },
  { key: 'sistema_voucher', nome: 'Voucher' },
] as const

type FechRow = {
  sistema_dinheiro: number
  sistema_pix: number
  sistema_credito: number
  sistema_debito: number
  sistema_voucher: number
  lavagens?: { quantidade: number; tipo_lavagem_id: string }[]
}

function faturamento(r: FechRow): number {
  return (
    r.sistema_dinheiro + r.sistema_pix + r.sistema_credito + r.sistema_debito + r.sistema_voucher
  )
}
function somaFat(rows: FechRow[]): number {
  return round2(rows.reduce((s, r) => s + faturamento(r), 0))
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<SP> }) {
  const usuario = await requireUsuario()
  if (usuario.papel === 'caixa') redirect('/fechamentos')
  const sp = await searchParams
  const supabase = await createClient()

  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
  const mes = sp.mes && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : hoje.slice(0, 7)
  const [Y, M] = mes.split('-').map(Number)
  const mesInicio = `${mes}-01`
  const mesFim = `${mes}-${String(new Date(Y, M, 0).getDate()).padStart(2, '0')}`
  const pd = new Date(Y, M - 2, 1)
  const py = pd.getFullYear()
  const pm = pd.getMonth() + 1
  const pmes = `${py}-${String(pm).padStart(2, '0')}`
  const prevInicio = `${pmes}-01`
  const prevFim = `${pmes}-${String(new Date(py, pm, 0).getDate()).padStart(2, '0')}`

  const unidadeFiltro = usuario.papel === 'admin' ? (sp.unidade || '') : ''
  const aplicarUnidade = <T,>(q: T): T => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return unidadeFiltro ? (q as any).eq('unidade_id', unidadeFiltro) : q
  }

  const selFech =
    'sistema_dinheiro, sistema_pix, sistema_credito, sistema_debito, sistema_voucher, lavagens:fechamento_lavagens(quantidade, tipo_lavagem_id)'

  const [
    { data: tiposLav },
    { data: fechMesData },
    { data: fechDiaData },
    { data: fechAntData },
    { data: contasData },
    { data: saidasData },
    unidadesRes,
  ] = await Promise.all([
    supabase.from('tipos_lavagem').select('id, nome, ordem').order('ordem'),
    aplicarUnidade(supabase.from('fechamentos_caixa').select(selFech).gte('data', mesInicio).lte('data', mesFim)),
    aplicarUnidade(supabase.from('fechamentos_caixa').select(selFech).eq('data', hoje)),
    aplicarUnidade(
      supabase
        .from('fechamentos_caixa')
        .select('sistema_dinheiro, sistema_pix, sistema_credito, sistema_debito, sistema_voucher')
        .gte('data', prevInicio)
        .lte('data', prevFim),
    ),
    aplicarUnidade(
      supabase
        .from('contas_pagas')
        .select('valor, origem_pagamento, tipo:tipos_despesa(nome)')
        .gte('data', mesInicio)
        .lte('data', mesFim),
    ),
    aplicarUnidade(
      supabase
        .from('estoque_saidas')
        .select('quantidade, produto:produtos(nome, unidade_medida)')
        .gte('data', mesInicio)
        .lte('data', mesFim),
    ),
    usuario.papel === 'admin'
      ? supabase.from('unidades').select('id, nome').eq('ativo', true).order('nome')
      : Promise.resolve({ data: null }),
  ])

  const fechMes = (fechMesData ?? []) as FechRow[]
  const fechDia = (fechDiaData ?? []) as FechRow[]
  const fechAnt = (fechAntData ?? []) as FechRow[]

  const fatDia = somaFat(fechDia)
  const fatMes = somaFat(fechMes)
  const fatAnt = somaFat(fechAnt)
  const variacao = fatAnt > 0 ? ((fatMes - fatAnt) / fatAnt) * 100 : null

  // Faturamento por forma (mês)
  const porForma = FORMAS.map((f) => ({
    label: f.nome,
    value: round2(fechMes.reduce((s, r) => s + (r[f.key] as number), 0)),
  }))

  // Lavagens por tipo (dia e mês)
  const contaLav = (rows: FechRow[]) => {
    const m = new Map<string, number>()
    for (const r of rows) for (const l of r.lavagens ?? []) m.set(l.tipo_lavagem_id, (m.get(l.tipo_lavagem_id) ?? 0) + l.quantidade)
    return m
  }
  const lavDia = contaLav(fechDia)
  const lavMes = contaLav(fechMes)
  const lavagens = (tiposLav ?? []).map((t) => ({
    nome: t.nome,
    dia: lavDia.get(t.id) ?? 0,
    mes: lavMes.get(t.id) ?? 0,
  }))
  const totalLavDia = lavagens.reduce((s, l) => s + l.dia, 0)
  const totalLavMes = lavagens.reduce((s, l) => s + l.mes, 0)

  // Despesas por tipo e por origem (mês)
  const contas = (contasData ?? []) as { valor: number; origem_pagamento: string; tipo: unknown }[]
  const despesasMes = round2(contas.reduce((s, c) => s + c.valor, 0))
  const mapTipo = new Map<string, number>()
  const mapOrigem = new Map<string, number>()
  for (const c of contas) {
    const t = rel(c.tipo)
    mapTipo.set(t, (mapTipo.get(t) ?? 0) + c.valor)
    mapOrigem.set(c.origem_pagamento, (mapOrigem.get(c.origem_pagamento) ?? 0) + c.valor)
  }
  const despesasPorTipo = [...mapTipo.entries()]
    .map(([label, value]) => ({ label, value: round2(value) }))
    .sort((a, b) => b.value - a.value)
  const despesasPorOrigem = [...mapOrigem.entries()]
    .map(([label, value]) => ({ label, value: round2(value) }))
    .sort((a, b) => b.value - a.value)

  // Consumo de produtos (mês)
  const saidas = (saidasData ?? []) as { quantidade: number; produto: unknown }[]
  const mapProd = new Map<string, { qtd: number; medida: string }>()
  for (const s of saidas) {
    const nome = rel(s.produto)
    const medida = rel(s.produto, 'unidade_medida')
    const cur = mapProd.get(nome) ?? { qtd: 0, medida }
    cur.qtd += s.quantidade
    mapProd.set(nome, cur)
  }
  const consumo = [...mapProd.entries()]
    .map(([nome, v]) => ({ nome, qtd: round2(v.qtd), medida: v.medida }))
    .sort((a, b) => b.qtd - a.qtd)

  const resultado = round2(fatMes - despesasMes)
  const mesLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(
    new Date(Y, M - 1, 1),
  )
  const unidades = unidadesRes.data

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">Dashboard</h1>
          <p className="mt-1 text-sm capitalize text-slate-500">{mesLabel}</p>
        </div>
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
          <input type="month" name="mes" defaultValue={mes} className={inputClass} />
          <button type="submit" className={btnPrimary}>
            Aplicar
          </button>
        </form>
      </div>

      {/* Indicadores */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat titulo="Faturamento do dia" valor={formatBRL(fatDia)} sub={`${totalLavDia} lavagem(ns) hoje`} />
        <Stat
          titulo="Faturamento do mês"
          valor={formatBRL(fatMes)}
          sub={
            variacao === null ? (
              'sem base do mês anterior'
            ) : (
              <span className={variacao >= 0 ? 'text-success' : 'text-danger'}>
                {variacao >= 0 ? '▲' : '▼'} {Math.abs(variacao).toFixed(1)}% vs. mês anterior
              </span>
            )
          }
        />
        <Stat titulo="Despesas do mês" valor={formatBRL(despesasMes)} sub={`${contas.length} lançamento(s)`} destaque="danger" />
        <Stat
          titulo="Resultado do mês"
          valor={formatBRL(resultado)}
          sub="faturamento − despesas"
          destaque={resultado >= 0 ? 'success' : 'danger'}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Faturamento por forma */}
        <Painel titulo="Faturamento por forma de pagamento" sub="No mês">
          <BarsCard data={porForma} tipo="brl" cor="#0d1d60" />
        </Painel>

        {/* Lavagens por tipo */}
        <Painel titulo="Lavagens por tipo" sub={`Dia: ${totalLavDia} · Mês: ${totalLavMes}`}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 font-medium">Tipo</th>
                <th className="py-2 text-right font-medium">Dia</th>
                <th className="py-2 text-right font-medium">Mês</th>
              </tr>
            </thead>
            <tbody>
              {lavagens.map((l) => (
                <tr key={l.nome} className="border-b border-slate-100 last:border-0">
                  <td className="py-2 text-slate-700">{l.nome}</td>
                  <td className="py-2 text-right text-slate-600">{l.dia}</td>
                  <td className="py-2 text-right font-medium text-brand-dark">{l.mes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Painel>

        {/* Despesas por tipo */}
        <Painel titulo="Despesas por tipo" sub="No mês">
          <BarsCard data={despesasPorTipo} tipo="brl" cor="#f54f03" />
        </Painel>

        {/* Despesas por origem */}
        <Painel titulo="Pago por origem / conta" sub="No mês">
          {despesasPorOrigem.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Sem despesas no período.</p>
          ) : (
            <div className="space-y-2">
              {despesasPorOrigem.map((o) => (
                <div key={o.label} className="flex items-center justify-between border-b border-slate-100 py-2 last:border-0">
                  <span className="text-sm text-slate-600">{o.label}</span>
                  <span className="text-sm font-medium text-slate-700">{formatBRL(o.value)}</span>
                </div>
              ))}
            </div>
          )}
        </Painel>

        {/* Consumo de produtos */}
        <Painel titulo="Consumo de produtos" sub="No mês" full>
          {consumo.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Sem consumo registrado no período.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {consumo.map((c) => (
                <div key={c.nome} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                  <span className="text-sm text-slate-600">{c.nome}</span>
                  <span className="font-semibold text-brand-dark">
                    {formatQtd(c.qtd)} {c.medida}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Painel>
      </div>
    </div>
  )
}

function Stat({
  titulo,
  valor,
  sub,
  destaque,
}: {
  titulo: string
  valor: string
  sub?: React.ReactNode
  destaque?: 'success' | 'danger'
}) {
  const cor = destaque === 'danger' ? 'text-danger' : destaque === 'success' ? 'text-success' : 'text-brand-dark'
  return (
    <Card>
      <p className="text-xs text-slate-500">{titulo}</p>
      <p className={`mt-1 text-2xl font-bold ${cor}`}>{valor}</p>
      <p className="mt-1 text-xs text-slate-400">{sub}</p>
    </Card>
  )
}

function Painel({
  titulo,
  sub,
  children,
  full,
}: {
  titulo: string
  sub?: string
  children: React.ReactNode
  full?: boolean
}) {
  return (
    <Card className={full ? 'lg:col-span-2' : ''}>
      <div className="mb-4">
        <h2 className="font-semibold text-brand-dark">{titulo}</h2>
        {sub && <p className="text-xs text-slate-500">{sub}</p>}
      </div>
      {children}
    </Card>
  )
}
