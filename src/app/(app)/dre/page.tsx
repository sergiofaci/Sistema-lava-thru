import { requirePapel } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { PageHeader, inputClass, btnPrimary, Card } from '@/components/ui'
import { round2 } from '@/lib/money'
import { DRETabela, type DREData } from './DRETabela'

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

type FechRow = Record<(typeof FORMAS)[number]['key'], number>

function somaFat(rows: FechRow[]): number {
  return round2(rows.reduce((s, r) => s + FORMAS.reduce((a, f) => a + (r[f.key] || 0), 0), 0))
}

export default async function DREPage({ searchParams }: { searchParams: Promise<SP> }) {
  const usuario = await requirePapel('admin', 'gerente')
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

  const [{ data: fechMes }, { data: contasMes }, { data: fechAnt }, { data: contasAnt }, unidadesRes] =
    await Promise.all([
      uni(supabase.from('fechamentos_caixa').select(selForma).gte('data', mesInicio).lte('data', mesFim)),
      uni(
        supabase
          .from('contas_pagas')
          .select('valor, centro:centros_custo(nome), tipo:tipos_despesa(nome)')
          .gte('data', mesInicio)
          .lte('data', mesFim),
      ),
      uni(supabase.from('fechamentos_caixa').select(selForma).gte('data', prevInicio).lte('data', prevFim)),
      uni(supabase.from('contas_pagas').select('valor').gte('data', prevInicio).lte('data', prevFim)),
      usuario.papel === 'admin'
        ? supabase.from('unidades').select('id, nome').eq('ativo', true).order('nome')
        : Promise.resolve({ data: null }),
    ])

  const fMes = (fechMes ?? []) as unknown as FechRow[]
  const receitas = FORMAS.map((f) => ({
    label: f.nome,
    value: round2(fMes.reduce((s, r) => s + (r[f.key] || 0), 0)),
  }))
  const receitaBruta = somaFat(fMes)

  // Despesas agrupadas por centro de custo -> tipo
  const contas = (contasMes ?? []) as { valor: number; centro: unknown; tipo: unknown }[]
  const mapCentro = new Map<string, { total: number; tipos: Map<string, number> }>()
  for (const c of contas) {
    const centro = rel(c.centro)
    const tipo = rel(c.tipo)
    const g = mapCentro.get(centro) ?? { total: 0, tipos: new Map() }
    g.total += c.valor
    g.tipos.set(tipo, (g.tipos.get(tipo) ?? 0) + c.valor)
    mapCentro.set(centro, g)
  }
  const grupos = [...mapCentro.entries()]
    .map(([centro, g]) => ({
      centro,
      total: round2(g.total),
      itens: [...g.tipos.entries()]
        .map(([label, value]) => ({ label, value: round2(value) }))
        .sort((a, b) => b.value - a.value),
    }))
    .sort((a, b) => b.total - a.total)

  const despesasTotal = round2(contas.reduce((s, c) => s + c.valor, 0))
  const resultado = round2(receitaBruta - despesasTotal)
  const margem = receitaBruta > 0 ? (resultado / receitaBruta) * 100 : null

  const receitaAnt = somaFat((fechAnt ?? []) as unknown as FechRow[])
  const despesaAnt = round2(((contasAnt ?? []) as { valor: number }[]).reduce((s, c) => s + c.valor, 0))

  const mesLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(
    new Date(Y, M - 1, 1),
  )

  const data: DREData = {
    mesLabel,
    receitas,
    receitaBruta,
    grupos,
    despesasTotal,
    resultado,
    margem,
    comparativo: { receitaAnt, despesaAnt, resultadoAnt: round2(receitaAnt - despesaAnt) },
  }

  const unidades = unidadesRes.data

  return (
    <div>
      <PageHeader
        titulo="DRE — Resultado"
        descricao="Receita (fechamentos) menos despesas (contas a pagar), por período."
        acao={
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
        }
      />

      <DRETabela data={data} />

      <div className="mt-4 max-w-2xl">
        <Card className="bg-slate-50">
          <p className="text-xs text-slate-500">
            <strong>Observação:</strong> esta é uma DRE <em>gerencial</em> simplificada — receita
            reconhecida pelos valores do fechamento de caixa (Bloco B) e despesas pelas contas pagas
            no período (regime de caixa). Não substitui a contabilidade fiscal.
          </p>
        </Card>
      </div>
    </div>
  )
}
