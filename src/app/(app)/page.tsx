import { redirect } from 'next/navigation'
import { requireUsuario } from '@/lib/auth'
import { modulosDoUsuario } from '@/lib/permissoes'
import { createClient } from '@/lib/supabase/server'
import { Card, inputClass, btnPrimary, Badge } from '@/components/ui'
import { BarsCard, TrendChart, YoYChart, TicketChart, RecorrenciaChart } from '@/components/charts'
import Link from 'next/link'
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
  { key: 'sistema_empresarial', nome: 'Empresarial a Prazo' },
] as const

type FechRow = {
  sistema_dinheiro: number
  sistema_pix: number
  sistema_credito: number
  sistema_debito: number
  sistema_voucher: number
  sistema_empresarial: number
  lavagens?: { quantidade: number; tipo_lavagem_id: string }[]
}

function faturamento(r: FechRow): number {
  return (
    r.sistema_dinheiro +
    r.sistema_pix +
    r.sistema_credito +
    r.sistema_debito +
    r.sistema_voucher +
    (r.sistema_empresarial ?? 0)
  )
}
function somaFat(rows: FechRow[]): number {
  return round2(rows.reduce((s, r) => s + faturamento(r), 0))
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<SP> }) {
  const usuario = await requireUsuario()
  const mods = await modulosDoUsuario(usuario)
  if (!mods.has('dashboard')) redirect(mods.has('fechamentos') ? '/fechamentos' : '/sem-permissao')
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

  // Janela de 6 meses (incluindo o mês atual) para o gráfico de evolução.
  const trendStart = new Date(Y, M - 6, 1)
  const trendInicio = `${trendStart.getFullYear()}-${String(trendStart.getMonth() + 1).padStart(2, '0')}-01`
  const mesesTrend = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(Y, M - 6 + i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
    return { key, label }
  })

  // Comparação ano a ano: janela do ano anterior inteiro até o mês atual.
  const anoAnt = Y - 1
  const mm = String(M).padStart(2, '0')
  const yoyKey = `${anoAnt}-${mm}`
  const anoRangeInicio = `${anoAnt}-01-01` // 1º de janeiro do ano anterior
  const histInicio = `${anoAnt}-01-01`

  const unidadeFiltro = usuario.papel === 'admin' ? (sp.unidade || '') : ''
  const aplicarUnidade = <T,>(q: T): T => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return unidadeFiltro ? (q as any).eq('unidade_id', unidadeFiltro) : q
  }

  const selFech =
    'sistema_dinheiro, sistema_pix, sistema_credito, sistema_debito, sistema_voucher, sistema_empresarial, lavagens:fechamento_lavagens(quantidade, tipo_lavagem_id)'

  const [
    { data: tiposLav },
    { data: fechMesData },
    { data: fechDiaData },
    { data: fechAntData },
    { data: contasData },
    { data: saidasData },
    { data: fechAnoData },
    { data: contasTrendData },
    { data: historicoData },
    { data: fechUniData },
    { data: contasUniData },
    { data: metaData },
    { data: metaItemData },
    { data: orcamentoData },
    unidadesRes,
  ] = await Promise.all([
    supabase.from('tipos_lavagem').select('id, nome, ordem, categoria').order('ordem'),
    aplicarUnidade(supabase.from('fechamentos_caixa').select(selFech).gte('data', mesInicio).lte('data', mesFim)),
    aplicarUnidade(supabase.from('fechamentos_caixa').select(selFech).eq('data', hoje)),
    aplicarUnidade(
      supabase
        .from('fechamentos_caixa')
        .select('sistema_dinheiro, sistema_pix, sistema_credito, sistema_debito, sistema_voucher, sistema_empresarial')
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
        .select('quantidade, valor_total, produto:produtos(nome, unidade_medida)')
        .gte('data', mesInicio)
        .lte('data', mesFim),
    ),
    aplicarUnidade(
      supabase
        .from('fechamentos_caixa')
        .select('data, sistema_dinheiro, sistema_pix, sistema_credito, sistema_debito, sistema_voucher, sistema_empresarial, lavagens:fechamento_lavagens(quantidade)')
        .gte('data', anoRangeInicio)
        .lte('data', mesFim),
    ),
    aplicarUnidade(supabase.from('contas_pagas').select('data, valor').gte('data', trendInicio).lte('data', mesFim)),
    aplicarUnidade(
      supabase
        .from('faturamento_historico')
        .select('mes, valor, quantidade, categoria')
        .gte('mes', histInicio)
        .lte('mes', `${mes}-01`),
    ),
    supabase
      .from('fechamentos_caixa')
      .select('unidade_id, sistema_dinheiro, sistema_pix, sistema_credito, sistema_debito, sistema_voucher, sistema_empresarial, lavagens:fechamento_lavagens(quantidade)')
      .gte('data', mesInicio)
      .lte('data', mesFim),
    supabase.from('contas_pagas').select('unidade_id, valor').gte('data', mesInicio).lte('data', mesFim),
    aplicarUnidade(supabase.from('metas').select('valor_meta').eq('mes', `${mes}-01`)),
    aplicarUnidade(
      supabase.from('metas_item').select('quantidade, tipo:tipos_lavagem(preco)').eq('mes', `${mes}-01`),
    ),
    aplicarUnidade(
      supabase.from('orcamento_despesa').select('valor, tipo:tipos_despesa(nome)').eq('mes', `${mes}-01`),
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
  type TipoLav = { id: string; nome: string; ordem: number; categoria?: string }
  const tipos = (tiposLav ?? []) as TipoLav[]
  const linhaTipo = (t: TipoLav) => ({ nome: t.nome, dia: lavDia.get(t.id) ?? 0, mes: lavMes.get(t.id) ?? 0 })
  // Serviços adicionais (limpeza interna, box etc.) não contam como lavagem.
  const lavagens = tipos.filter((t) => t.categoria !== 'servico').map(linhaTipo)
  const servicos = tipos.filter((t) => t.categoria === 'servico').map(linhaTipo)
  const totalLavDia = lavagens.reduce((s, l) => s + l.dia, 0)
  const totalLavMes = lavagens.reduce((s, l) => s + l.mes, 0)
  const totalServDia = servicos.reduce((s, l) => s + l.dia, 0)
  const totalServMes = servicos.reduce((s, l) => s + l.mes, 0)

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

  // Consumo de produtos (mês) — quantidade e valor
  const saidas = (saidasData ?? []) as { quantidade: number; valor_total: number | null; produto: unknown }[]
  const mapProd = new Map<string, { qtd: number; valor: number; medida: string }>()
  for (const s of saidas) {
    const nome = rel(s.produto)
    const medida = rel(s.produto, 'unidade_medida')
    const cur = mapProd.get(nome) ?? { qtd: 0, valor: 0, medida }
    cur.qtd += Number(s.quantidade)
    cur.valor += Number(s.valor_total ?? 0)
    mapProd.set(nome, cur)
  }
  const consumo = [...mapProd.entries()]
    .map(([nome, v]) => ({ nome, qtd: round2(v.qtd), valor: round2(v.valor), medida: v.medida }))
    .sort((a, b) => b.valor - a.valor)
  const consumoTotal = round2(consumo.reduce((s, c) => s + c.valor, 0))

  // Faturamento e nº de lavagens dos fechamentos, por mês (YYYY-MM).
  const fechAno = (fechAnoData ?? []) as (FechRow & { data: string })[]
  const fechFatMes = new Map<string, number>()
  const fechQtdMes = new Map<string, number>()
  for (const f of fechAno) {
    const k = f.data.slice(0, 7)
    fechFatMes.set(k, round2((fechFatMes.get(k) ?? 0) + faturamento(f)))
    const q = (f.lavagens ?? []).reduce((s, l) => s + (l.quantidade || 0), 0)
    fechQtdMes.set(k, (fechQtdMes.get(k) ?? 0) + q)
  }

  // Histórico importado por mês: valor total, e (só lavagens) valor+quantidade.
  const historico = (historicoData ?? []) as { mes: string; valor: number; quantidade: number; categoria: string }[]
  const histPorMes = new Map<string, number>()
  const histLavVal = new Map<string, number>()
  const histLavQtd = new Map<string, number>()
  const histAssin = new Map<string, number>()
  for (const h of historico) {
    const k = String(h.mes).slice(0, 7)
    histPorMes.set(k, round2((histPorMes.get(k) ?? 0) + Number(h.valor)))
    if (h.categoria === 'assinatura') {
      histAssin.set(k, round2((histAssin.get(k) ?? 0) + Number(h.valor)))
    } else {
      histLavVal.set(k, round2((histLavVal.get(k) ?? 0) + Number(h.valor)))
      histLavQtd.set(k, (histLavQtd.get(k) ?? 0) + Number(h.quantidade))
    }
  }
  const fatMesKey = (k: string) => round2((fechFatMes.get(k) ?? 0) + (histPorMes.get(k) ?? 0))

  const contasTrend = (contasTrendData ?? []) as { data: string; valor: number }[]
  const trend = mesesTrend.map((m) => {
    const fat = fatMesKey(m.key)
    const desp = round2(contasTrend.filter((c) => c.data.startsWith(m.key)).reduce((s, c) => s + c.valor, 0))
    return { mes: m.label, faturamento: fat, despesas: desp, resultado: round2(fat - desp) }
  })

  // Ticket médio (12/6 meses): faturamento de lavagem ÷ nº de lavagens.
  const ticketTrend = mesesTrend.map((m) => {
    const fatLav = round2((fechFatMes.get(m.key) ?? 0) + (histLavVal.get(m.key) ?? 0))
    const qtd = (fechQtdMes.get(m.key) ?? 0) + (histLavQtd.get(m.key) ?? 0)
    return { mes: m.label, valor: qtd > 0 ? round2(fatLav / qtd) : 0 }
  })

  // Ano a ano (12 meses) e acumulado do ano (YTD).
  const MES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
  const yoy = Array.from({ length: 12 }, (_, i) => {
    const mmm = String(i + 1).padStart(2, '0')
    const atual = fatMesKey(`${Y}-${mmm}`)
    const anterior = fatMesKey(`${anoAnt}-${mmm}`)
    return { mes: MES_ABREV[i], anterior: anterior || null, atual: i + 1 <= M ? atual || null : null }
  })
  let ytdAtual = 0
  let ytdAnt = 0
  for (let i = 1; i <= M; i++) {
    const mmm = String(i).padStart(2, '0')
    ytdAtual += fatMesKey(`${Y}-${mmm}`)
    ytdAnt += fatMesKey(`${anoAnt}-${mmm}`)
  }
  ytdAtual = round2(ytdAtual)
  ytdAnt = round2(ytdAnt)
  const variacaoYtd = ytdAnt > 0 ? ((ytdAtual - ytdAnt) / ytdAnt) * 100 : null

  // Ano a ano do mês atual.
  const baseYoY = fatMesKey(yoyKey)
  const variacaoAno = baseYoY > 0 ? ((fatMes - baseYoY) / baseYoY) * 100 : null

  // Recorrência (12 meses): lavagem x assinatura.
  const meses12 = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Y, M - 12 + i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
    return { key, label }
  })
  const recorrencia = meses12.map((m) => ({
    mes: m.label,
    lavagem: round2((fechFatMes.get(m.key) ?? 0) + (histLavVal.get(m.key) ?? 0)),
    assinatura: round2(histAssin.get(m.key) ?? 0),
  }))
  const lavMesAtual = round2((fechFatMes.get(mes) ?? 0) + (histLavVal.get(mes) ?? 0))
  const assinMesAtual = round2(histAssin.get(mes) ?? 0)
  const totRecMes = round2(lavMesAtual + assinMesAtual)
  const pctRecorrente = totRecMes > 0 ? (assinMesAtual / totRecMes) * 100 : null

  // Comparativo entre unidades (mês atual) — só admin sem filtro de unidade.
  const mostrarUnidades = usuario.papel === 'admin' && !unidadeFiltro
  const nomeUni = new Map((unidadesRes.data ?? []).map((u) => [u.id, u.nome]))
  const aggUni = new Map<string, { fat: number; desp: number; qtd: number }>()
  if (mostrarUnidades) {
    for (const f of (fechUniData ?? []) as (FechRow & { unidade_id: string })[]) {
      const a = aggUni.get(f.unidade_id) ?? { fat: 0, desp: 0, qtd: 0 }
      a.fat = round2(a.fat + faturamento(f))
      a.qtd += (f.lavagens ?? []).reduce((s, l) => s + (l.quantidade || 0), 0)
      aggUni.set(f.unidade_id, a)
    }
    for (const c of (contasUniData ?? []) as { unidade_id: string; valor: number }[]) {
      const a = aggUni.get(c.unidade_id) ?? { fat: 0, desp: 0, qtd: 0 }
      a.desp = round2(a.desp + Number(c.valor))
      aggUni.set(c.unidade_id, a)
    }
  }
  const comparativoUni = [...aggUni.entries()]
    .map(([id, a]) => {
      const resultado = round2(a.fat - a.desp)
      return {
        nome: nomeUni.get(id) ?? '—',
        fat: a.fat,
        desp: a.desp,
        resultado,
        margem: a.fat > 0 ? (resultado / a.fat) * 100 : null,
        ticket: a.qtd > 0 ? round2(a.fat / a.qtd) : 0,
      }
    })
    .sort((x, y) => y.fat - x.fat)

  const resultado = round2(fatMes - despesasMes)
  const margem = fatMes > 0 ? (resultado / fatMes) * 100 : null
  const ticketMedio = totalLavMes > 0 ? round2(fatMes / totalLavMes) : 0

  // Meta e projeção do mês. Prioriza a meta por item (Σ qtd × preço); se
  // não houver, usa a meta manual (tabela metas).
  const metaManual = round2(((metaData ?? []) as { valor_meta: number }[]).reduce((s, m) => s + Number(m.valor_meta), 0))
  const metaDerivada = round2(
    ((metaItemData ?? []) as { quantidade: number; tipo: unknown }[]).reduce((s, m) => {
      const t = Array.isArray(m.tipo) ? m.tipo[0] : m.tipo
      const preco = Number((t as { preco?: number })?.preco ?? 0)
      return s + Number(m.quantidade) * preco
    }, 0),
  )
  const metaMes = metaDerivada > 0 ? metaDerivada : metaManual
  const pctMeta = metaMes > 0 ? (fatMes / metaMes) * 100 : null
  const ehMesAtual = mes === hoje.slice(0, 7)
  const diasNoMes = new Date(Y, M, 0).getDate()
  const diaAtual = ehMesAtual ? Number(hoje.slice(8, 10)) : diasNoMes
  const projecao = ehMesAtual && diaAtual > 0 ? round2((fatMes / diaAtual) * diasNoMes) : fatMes
  const pctProjMeta = metaMes > 0 ? (projecao / metaMes) * 100 : null

  // Orçamento de despesas × realizado
  const orcPorTipo = new Map<string, number>()
  let orcTotal = 0
  for (const o of (orcamentoData ?? []) as { valor: number; tipo: unknown }[]) {
    const nome = rel(o.tipo)
    orcPorTipo.set(nome, round2((orcPorTipo.get(nome) ?? 0) + Number(o.valor)))
    orcTotal += Number(o.valor)
  }
  orcTotal = round2(orcTotal)
  const realizadoPorTipo = new Map(despesasPorTipo.map((d) => [d.label, d.value]))
  const orcComparativo = [...new Set([...realizadoPorTipo.keys(), ...orcPorTipo.keys()])]
    .map((nome) => {
      const orcado = orcPorTipo.get(nome) ?? 0
      const realizado = realizadoPorTipo.get(nome) ?? 0
      return { nome, orcado, realizado, dif: round2(orcado - realizado) }
    })
    .sort((a, b) => b.realizado - a.realizado)
  const resultadoPlanejado = round2(metaMes - orcTotal)
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
            <>
              {variacao === null ? (
                <span>sem base do mês anterior</span>
              ) : (
                <span className={variacao >= 0 ? 'text-success' : 'text-danger'}>
                  {variacao >= 0 ? '▲' : '▼'} {Math.abs(variacao).toFixed(1)}% vs. mês anterior
                </span>
              )}
              <span className="block">Ticket médio: {formatBRL(ticketMedio)}</span>
              {variacaoAno !== null && (
                <span className={`block ${variacaoAno >= 0 ? 'text-success' : 'text-danger'}`}>
                  {variacaoAno >= 0 ? '▲' : '▼'} {Math.abs(variacaoAno).toFixed(1)}% vs. {mm}/{anoAnt}
                </span>
              )}
            </>
          }
        />
        <Stat titulo="Despesas do mês" valor={formatBRL(despesasMes)} sub={`${contas.length} lançamento(s)`} destaque="danger" />
        <Stat
          titulo="Resultado do mês"
          valor={formatBRL(resultado)}
          sub={margem === null ? 'faturamento − despesas' : `Margem: ${margem.toFixed(1)}%`}
          destaque={resultado >= 0 ? 'success' : 'danger'}
        />
      </div>

      {metaMes > 0 && (
        <Card className="mb-6">
          <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="font-semibold text-brand-dark">Meta do mês</h2>
              <p className="text-xs text-slate-500">
                Meta {formatBRL(metaMes)} · realizado {formatBRL(fatMes)}
                {ehMesAtual && <> · projeção {formatBRL(projecao)}</>}
              </p>
            </div>
            <span className={`text-2xl font-bold ${(pctMeta ?? 0) >= 100 ? 'text-success' : 'text-brand-dark'}`}>
              {pctMeta === null ? '—' : `${pctMeta.toFixed(0)}%`}
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${(pctMeta ?? 0) >= 100 ? 'bg-success' : 'bg-brand'}`}
              style={{ width: `${Math.min(100, Math.max(0, pctMeta ?? 0))}%` }}
            />
          </div>
          {ehMesAtual && pctProjMeta !== null && (
            <p className="mt-2 text-xs text-slate-500">
              No ritmo atual ({diaAtual}/{diasNoMes} dias), a projeção atinge{' '}
              <span className={pctProjMeta >= 100 ? 'text-success' : 'text-warning'}>{pctProjMeta.toFixed(0)}% da meta</span>.
            </p>
          )}
        </Card>
      )}

      {(metaMes > 0 || orcTotal > 0) && (
        <Card className="mb-6">
          <h2 className="mb-3 font-semibold text-brand-dark">Planejado × Realizado</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <PlanReal label="Receita" planejado={metaMes} realizado={fatMes} maiorMelhor />
            <PlanReal label="Despesas" planejado={orcTotal} realizado={despesasMes} maiorMelhor={false} />
            <PlanReal label="Resultado" planejado={resultadoPlanejado} realizado={resultado} maiorMelhor />
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Evolução mensal */}
        <Painel titulo="Evolução — faturamento, despesas e resultado" sub="Últimos 6 meses (inclui histórico importado)" full>
          <TrendChart data={trend} />
        </Painel>

        {/* Ano a ano */}
        <Painel
          titulo={`Faturamento — ${Y} × ${anoAnt}`}
          sub={
            variacaoYtd === null
              ? `Acumulado ${Y}: ${formatBRL(ytdAtual)}`
              : `Acumulado ${Y}: ${formatBRL(ytdAtual)} · ${variacaoYtd >= 0 ? '▲' : '▼'} ${Math.abs(variacaoYtd).toFixed(1)}% vs. ${anoAnt} (${formatBRL(ytdAnt)})`
          }
          full
        >
          <YoYChart data={yoy} labelAtual={String(Y)} labelAnterior={String(anoAnt)} />
        </Painel>

        {/* Ticket médio no tempo */}
        <Painel titulo="Ticket médio" sub="Faturamento de lavagem ÷ nº de lavagens (6 meses)" full>
          <TicketChart data={ticketTrend} />
        </Painel>

        {/* Recorrência: lavagens x assinaturas */}
        <Painel
          titulo="Receita: lavagens × assinaturas"
          sub={
            pctRecorrente === null
              ? 'Composição mensal (12 meses)'
              : `Composição mensal · ${pctRecorrente.toFixed(1)}% de receita recorrente no mês`
          }
          full
        >
          <RecorrenciaChart data={recorrencia} />
        </Painel>

        {/* Comparativo entre unidades (admin, todas) */}
        {mostrarUnidades && comparativoUni.length > 1 && (
          <Painel titulo="Comparativo entre unidades" sub="Mês atual" full>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="py-2 pr-4 font-medium">Unidade</th>
                    <th className="py-2 px-4 text-right font-medium">Faturamento</th>
                    <th className="py-2 px-4 text-right font-medium">Despesas</th>
                    <th className="py-2 px-4 text-right font-medium">Resultado</th>
                    <th className="py-2 px-4 text-right font-medium">Margem</th>
                    <th className="py-2 pl-4 text-right font-medium">Ticket médio</th>
                  </tr>
                </thead>
                <tbody>
                  {comparativoUni.map((u) => (
                    <tr key={u.nome} className="border-b border-slate-100 last:border-0">
                      <td className="py-2 pr-4 font-medium text-slate-700">{u.nome}</td>
                      <td className="py-2 px-4 text-right text-slate-700">{formatBRL(u.fat)}</td>
                      <td className="py-2 px-4 text-right text-danger">{formatBRL(u.desp)}</td>
                      <td className={`py-2 px-4 text-right font-medium ${u.resultado >= 0 ? 'text-success' : 'text-danger'}`}>
                        {formatBRL(u.resultado)}
                      </td>
                      <td className="py-2 px-4 text-right text-slate-500">
                        {u.margem === null ? '—' : `${u.margem.toFixed(1)}%`}
                      </td>
                      <td className="py-2 pl-4 text-right text-slate-500">{formatBRL(u.ticket)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Painel>
        )}

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

        {/* Serviços adicionais (não são lavagem) */}
        {servicos.length > 0 && (
          <Painel titulo="Serviços adicionais" sub={`Dia: ${totalServDia} · Mês: ${totalServMes} · não contam como lavagem`}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 font-medium">Serviço</th>
                  <th className="py-2 text-right font-medium">Dia</th>
                  <th className="py-2 text-right font-medium">Mês</th>
                </tr>
              </thead>
              <tbody>
                {servicos.map((l) => (
                  <tr key={l.nome} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 text-slate-700">{l.nome}</td>
                    <td className="py-2 text-right text-slate-600">{l.dia}</td>
                    <td className="py-2 text-right font-medium text-brand-dark">{l.mes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Painel>
        )}

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

        {/* Orçamento × realizado (despesas) */}
        {orcTotal > 0 && (
          <Painel titulo="Orçamento × realizado (despesas)" sub={`Orçado ${formatBRL(orcTotal)} · realizado ${formatBRL(despesasMes)}`} full>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="py-2 pr-4 font-medium">Tipo de despesa</th>
                    <th className="py-2 px-4 text-right font-medium">Orçado</th>
                    <th className="py-2 px-4 text-right font-medium">Realizado</th>
                    <th className="py-2 pl-4 text-right font-medium">Diferença</th>
                  </tr>
                </thead>
                <tbody>
                  {orcComparativo.map((o) => (
                    <tr key={o.nome} className="border-b border-slate-100 last:border-0">
                      <td className="py-2 pr-4 text-slate-700">{o.nome}</td>
                      <td className="py-2 px-4 text-right text-slate-500">{o.orcado > 0 ? formatBRL(o.orcado) : '—'}</td>
                      <td className="py-2 px-4 text-right text-slate-700">{formatBRL(o.realizado)}</td>
                      <td className={`py-2 pl-4 text-right font-medium ${o.dif >= 0 ? 'text-success' : 'text-danger'}`}>
                        {o.orcado > 0 ? formatBRL(o.dif) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 font-semibold">
                    <td className="py-2 pr-4 text-slate-700">Total</td>
                    <td className="py-2 px-4 text-right text-slate-600">{formatBRL(orcTotal)}</td>
                    <td className="py-2 px-4 text-right text-slate-800">{formatBRL(despesasMes)}</td>
                    <td className={`py-2 pl-4 text-right ${orcTotal - despesasMes >= 0 ? 'text-success' : 'text-danger'}`}>
                      {formatBRL(round2(orcTotal - despesasMes))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Painel>
        )}

        {/* Consumo de produtos */}
        <Painel
          titulo="Consumo de produtos"
          sub={consumoTotal > 0 ? `Total no mês: ${formatBRL(consumoTotal)}` : 'No mês'}
          full
          acao={
            <Link href="/estoque/consumo" className="text-sm text-brand hover:underline">
              Ver relatório →
            </Link>
          }
        >
          {consumo.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Sem consumo registrado no período.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {consumo.map((c) => (
                <div key={c.nome} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                  <div>
                    <span className="block text-sm text-slate-600">{c.nome}</span>
                    <span className="text-xs text-slate-400">
                      {formatQtd(c.qtd)} {c.medida}
                    </span>
                  </div>
                  <span className="font-semibold text-brand-dark">{formatBRL(c.valor)}</span>
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

function PlanReal({
  label,
  planejado,
  realizado,
  maiorMelhor,
}: {
  label: string
  planejado: number
  realizado: number
  maiorMelhor: boolean
}) {
  const pct = planejado !== 0 ? (realizado / planejado) * 100 : null
  const bom = maiorMelhor ? realizado >= planejado : realizado <= planejado
  const cor = pct === null ? 'text-slate-400' : bom ? 'text-success' : 'text-danger'
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-800">{formatBRL(realizado)}</p>
      <p className="text-xs text-slate-400">planejado {formatBRL(planejado)}</p>
      {pct !== null && <p className={`mt-1 text-xs font-medium ${cor}`}>{pct.toFixed(0)}% do planejado</p>}
    </div>
  )
}

function Painel({
  titulo,
  sub,
  children,
  full,
  acao,
}: {
  titulo: string
  sub?: string
  children: React.ReactNode
  full?: boolean
  acao?: React.ReactNode
}) {
  return (
    <Card className={full ? 'lg:col-span-2' : ''}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-brand-dark">{titulo}</h2>
          {sub && <p className="text-xs text-slate-500">{sub}</p>}
        </div>
        {acao}
      </div>
      {children}
    </Card>
  )
}
