import { requireModulo } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { PageHeader, inputClass, btnPrimary, Card } from '@/components/ui'
import { round2 } from '@/lib/money'
import { DRETabela, type DREData, type LinhaGrupo } from './DRETabela'
import { toCSV } from '@/lib/csv'
import { ExportBar } from '@/components/ExportBar'

type SP = { unidade?: string; mes?: string }

function rel(r: unknown, campo = 'nome'): string {
  if (!r) return '—'
  const o = Array.isArray(r) ? r[0] : r
  return (o as Record<string, string>)?.[campo] ?? '—'
}

const GRUPOS = ['deducao', 'cmv', 'operacional', 'financeira', 'imposto'] as const
type Grupo = (typeof GRUPOS)[number]
function obj(r: unknown): Record<string, unknown> {
  return (Array.isArray(r) ? r[0] : r) as Record<string, unknown>
}
function grupoDe(r: unknown): Grupo {
  const g = obj(r)?.grupo_dre as string
  return (GRUPOS as readonly string[]).includes(g) ? (g as Grupo) : 'operacional'
}
// Conta entra na DRE? (exibir_na_dre é boolean; ausente = true por padrão)
function exibeDre(r: unknown): boolean {
  return obj(r)?.exibir_na_dre !== false
}
function comportDe(r: unknown): string {
  return String(obj(r)?.comportamento ?? 'fixo')
}

const FORMAS = [
  { key: 'sistema_dinheiro', nome: 'Dinheiro' },
  { key: 'sistema_pix', nome: 'Pix' },
  { key: 'sistema_credito', nome: 'Crédito' },
  { key: 'sistema_debito', nome: 'Débito' },
  { key: 'sistema_voucher', nome: 'Voucher' },
  { key: 'sistema_empresarial', nome: 'Empresarial a Prazo' },
] as const

type FechRow = Record<(typeof FORMAS)[number]['key'], number>
type Conta = { valor: number; tipo: unknown }

function somaFat(rows: FechRow[]): number {
  return round2(rows.reduce((s, r) => s + FORMAS.reduce((a, f) => a + (r[f.key] || 0), 0), 0))
}

// Total de um grupo a partir das contas.
function totalGrupo(contas: Conta[], grupo: Grupo): number {
  return round2(contas.filter((c) => grupoDe(c.tipo) === grupo).reduce((s, c) => s + Number(c.valor), 0))
}
// Detalhe (por tipo de despesa) de um grupo, ordenado por valor.
function linhaGrupo(contas: Conta[], grupo: Grupo): LinhaGrupo {
  const m = new Map<string, number>()
  for (const c of contas.filter((c) => grupoDe(c.tipo) === grupo)) {
    const nome = rel(c.tipo)
    m.set(nome, (m.get(nome) ?? 0) + Number(c.valor))
  }
  const itens = [...m.entries()].map(([label, value]) => ({ label, value: round2(value) })).sort((a, b) => b.value - a.value)
  return { total: round2([...m.values()].reduce((s, v) => s + v, 0)), itens }
}
const pct = (num: number, den: number): number | null => (den > 0 ? (num / den) * 100 : null)

export default async function DREPage({ searchParams }: { searchParams: Promise<SP> }) {
  const usuario = await requireModulo('dre')
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

  const unidadeFiltro = usuario.papel === 'admin' ? sp.unidade || '' : ''
  const uni = <T,>(q: T): T =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    unidadeFiltro ? (q as any).eq('unidade_id', unidadeFiltro) : q

  const selForma = FORMAS.map((f) => f.key).join(', ')
  const selConta = 'valor, tipo:tipos_despesa(nome, grupo_dre, exibir_na_dre, comportamento)'

  const [
    { data: fechMes },
    { data: contasMes },
    { data: assinMesData },
    { data: fechAnt },
    { data: contasAnt },
    { data: assinAntData },
    unidadesRes,
  ] = await Promise.all([
    uni(supabase.from('fechamentos_caixa').select(selForma).gte('data', mesInicio).lte('data', mesFim)),
    uni(supabase.from('contas_pagas').select(selConta).gte('data', mesInicio).lte('data', mesFim)),
    uni(supabase.from('faturamento_historico').select('valor').eq('categoria', 'assinatura').eq('mes', mesInicio)),
    uni(supabase.from('fechamentos_caixa').select(selForma).gte('data', prevInicio).lte('data', prevFim)),
    uni(supabase.from('contas_pagas').select(selConta).gte('data', prevInicio).lte('data', prevFim)),
    uni(supabase.from('faturamento_historico').select('valor').eq('categoria', 'assinatura').eq('mes', prevInicio)),
    usuario.papel === 'admin'
      ? supabase.from('unidades').select('id, nome').eq('ativo', true).order('nome')
      : Promise.resolve({ data: null }),
  ])

  // ---- Receita bruta = caixa + assinaturas (histórico) ----
  const fMes = (fechMes ?? []) as unknown as FechRow[]
  const somaAssin = (rows: unknown) => round2(((rows ?? []) as { valor: number }[]).reduce((s, r) => s + Number(r.valor), 0))
  const caixaMes = somaFat(fMes)
  const assinMes = somaAssin(assinMesData)
  const receitas = [
    ...FORMAS.map((f) => ({ label: f.nome, value: round2(fMes.reduce((s, r) => s + (r[f.key] || 0), 0)) })),
    ...(assinMes > 0 ? [{ label: 'Assinaturas (histórico)', value: assinMes }] : []),
  ]
  const receitaBruta = round2(caixaMes + assinMes)

  // ---- Cascata da DRE (só contas que compõem a DRE) ----
  const contas = ((contasMes ?? []) as Conta[]).filter((c) => exibeDre(c.tipo))
  const deducoes = linhaGrupo(contas, 'deducao')
  const cmv = linhaGrupo(contas, 'cmv')
  const operacional = linhaGrupo(contas, 'operacional')
  const financeira = linhaGrupo(contas, 'financeira')
  const impostos = linhaGrupo(contas, 'imposto')

  const receitaLiquida = round2(receitaBruta - deducoes.total)
  const lucroBruto = round2(receitaLiquida - cmv.total)
  const ebitda = round2(lucroBruto - operacional.total)
  const lucroLiquido = round2(ebitda - financeira.total - impostos.total)

  const margemBruta = pct(lucroBruto, receitaLiquida)
  const margemEbitda = pct(ebitda, receitaLiquida)
  const margemLiquida = pct(lucroLiquido, receitaLiquida)

  // ---- Custos e despesas: fixos × variáveis (exclui deduções) ----
  const somaComport = (comp: string) =>
    round2(contas.filter((c) => grupoDe(c.tipo) !== 'deducao' && comportDe(c.tipo) === comp).reduce((s, c) => s + Number(c.valor), 0))
  const custoVariavel = somaComport('variavel')
  const custoFixo = somaComport('fixo')
  const margemContribuicao = round2(receitaLiquida - custoVariavel)
  const margemContribPct = pct(margemContribuicao, receitaLiquida)

  // ---- Comparativo (mês anterior): receita e lucro líquido ----
  const receitaAnt = round2(somaFat((fechAnt ?? []) as unknown as FechRow[]) + somaAssin(assinAntData))
  const contasA = (contasAnt ?? []) as Conta[]
  const lucroLiquidoAnt = round2(
    receitaAnt -
      totalGrupo(contasA, 'deducao') -
      totalGrupo(contasA, 'cmv') -
      totalGrupo(contasA, 'operacional') -
      totalGrupo(contasA, 'financeira') -
      totalGrupo(contasA, 'imposto'),
  )

  const mesLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(Y, M - 1, 1))

  const data: DREData = {
    mesLabel,
    receitas,
    receitaBruta,
    deducoes,
    receitaLiquida,
    cmv,
    lucroBruto,
    margemBruta,
    operacional,
    ebitda,
    margemEbitda,
    financeira,
    impostos,
    lucroLiquido,
    margemLiquida,
    custoFixo,
    custoVariavel,
    margemContribuicao,
    margemContribPct,
    comparativo: { receitaAnt, lucroLiquidoAnt },
  }

  const unidades = unidadesRes.data

  const brl = (n: number) => n.toFixed(2).replace('.', ',')
  const p1 = (n: number | null) => (n === null ? '' : n.toFixed(1))
  const bloco = (titulo: string, g: LinhaGrupo) => [
    [titulo, brl(g.total)],
    ...g.itens.map((i) => ['  ' + i.label, brl(i.value)]),
  ]
  const csv = toCSV([
    ['DRE — Lava Thru', mesLabel],
    [],
    ['(=) RECEITA BRUTA', brl(receitaBruta)],
    ...receitas.map((r) => ['  ' + r.label, brl(r.value)]),
    ...bloco('(-) Deduções (ISS, PIS/COFINS)', deducoes),
    ['(=) RECEITA LÍQUIDA', brl(receitaLiquida)],
    ...bloco('(-) CMV / CSV', cmv),
    ['(=) LUCRO BRUTO', brl(lucroBruto)],
    ['    Margem bruta %', p1(margemBruta)],
    ...bloco('(-) Despesas operacionais', operacional),
    ['(=) EBITDA', brl(ebitda)],
    ['    EBITDA %', p1(margemEbitda)],
    ...bloco('(-) Despesas financeiras', financeira),
    ...bloco('(-) Impostos sobre o resultado', impostos),
    ['(=) LUCRO LÍQUIDO', brl(lucroLiquido)],
    ['    Margem líquida %', p1(margemLiquida)],
    [],
    ['Custos/despesas variáveis', brl(custoVariavel)],
    ['Custos/despesas fixos', brl(custoFixo)],
    ['Margem de contribuição', brl(margemContribuicao)],
    ['    Margem de contribuição %', p1(margemContribPct)],
  ])

  return (
    <div>
      <PageHeader
        titulo="DRE — Resultado"
        descricao="Receita (caixa + assinaturas) menos deduções, custos e despesas, por período."
        acao={
          <div className="flex flex-wrap items-center gap-2">
            <ExportBar csv={csv} filename={`dre-${mes}`} />
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
        }
      />

      <DRETabela data={data} />

      <div className="mt-4 max-w-2xl">
        <Card className="bg-slate-50">
          <p className="text-xs text-slate-500">
            <strong>Observação:</strong> DRE <em>gerencial</em> — receita reconhecida pelos fechamentos
            de caixa mais as assinaturas do Histórico de Faturamento; deduções, custos e despesas pelas
            contas pagas no período (regime de caixa), classificadas pelo <strong>grupo na DRE</strong> de
            cada tipo de despesa. As margens são calculadas sobre a receita líquida. Não substitui a
            contabilidade fiscal.
          </p>
        </Card>
      </div>
    </div>
  )
}
