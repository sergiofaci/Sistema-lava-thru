import { Card } from '@/components/ui'
import { formatBRL } from '@/lib/money'

export type LinhaGrupo = { total: number; itens: { label: string; value: number }[] }

export type DREData = {
  mesLabel: string
  receitas: { label: string; value: number }[]
  receitaBruta: number
  deducoes: LinhaGrupo
  receitaLiquida: number
  cmv: LinhaGrupo
  lucroBruto: number
  margemBruta: number | null
  operacional: LinhaGrupo
  ebitda: number
  margemEbitda: number | null
  financeira: LinhaGrupo
  impostos: LinhaGrupo
  lucroLiquido: number
  margemLiquida: number | null
  comparativo?: { receitaAnt: number; lucroLiquidoAnt: number }
}

function Linha({
  label,
  valor,
  nivel = 0,
  forte,
  cor,
  sinal,
}: {
  label: string
  valor: number
  nivel?: number
  forte?: boolean
  cor?: string
  sinal?: '+' | '−'
}) {
  return (
    <div
      className={`flex items-center justify-between py-2 ${nivel === 0 ? 'border-b border-slate-100' : ''}`}
      style={{ paddingLeft: nivel * 20 }}
    >
      <span className={`text-sm ${forte ? 'font-semibold text-brand-dark' : 'text-slate-600'}`}>{label}</span>
      <span className={`text-sm tabular-nums ${forte ? 'font-bold' : 'font-medium'} ${cor ?? 'text-slate-700'}`}>
        {sinal === '−' && valor > 0 ? '(' + formatBRL(valor) + ')' : formatBRL(valor)}
      </span>
    </div>
  )
}

// Subtotal (linha de resultado parcial) com destaque e, opcionalmente, margem %.
function Subtotal({ label, valor, margem, margemLabel }: { label: string; valor: number; margem?: number | null; margemLabel?: string }) {
  return (
    <div className="mt-1 flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
      <span className="text-sm font-semibold text-brand-dark">
        {label}
        {margem !== undefined && (
          <span className="ml-2 text-xs font-normal text-slate-500">
            {margemLabel}: {margem === null ? '—' : `${margem.toFixed(1)}%`}
          </span>
        )}
      </span>
      <span className={`text-sm font-bold tabular-nums ${valor >= 0 ? 'text-slate-800' : 'text-danger'}`}>
        {formatBRL(valor)}
      </span>
    </div>
  )
}

function Grupo({ titulo, g }: { titulo: string; g: LinhaGrupo }) {
  if (g.total === 0 && g.itens.length === 0) {
    return <Linha label={titulo} valor={0} nivel={1} forte sinal="−" />
  }
  return (
    <div>
      <Linha label={titulo} valor={g.total} nivel={1} forte sinal="−" />
      {g.itens.map((i) => (
        <Linha key={i.label} label={i.label} valor={i.value} nivel={2} sinal="−" />
      ))}
    </div>
  )
}

export function DRETabela({ data }: { data: DREData }) {
  const variacao =
    data.comparativo && data.comparativo.lucroLiquidoAnt !== 0
      ? ((data.lucroLiquido - data.comparativo.lucroLiquidoAnt) / Math.abs(data.comparativo.lucroLiquidoAnt)) * 100
      : null

  return (
    <div className="max-w-2xl">
      <Card>
        <div className="mb-4 border-b border-slate-200 pb-3">
          <h2 className="font-semibold text-brand-dark">Demonstração de Resultado (gerencial)</h2>
          <p className="text-xs capitalize text-slate-500">{data.mesLabel}</p>
        </div>

        {/* Receita bruta */}
        <Linha label="RECEITA BRUTA" valor={data.receitaBruta} forte cor="text-success" sinal="+" />
        {data.receitas.map((r) => (
          <Linha key={r.label} label={r.label} valor={r.value} nivel={1} />
        ))}

        {/* Deduções -> Receita líquida */}
        <div className="mt-3">
          <Grupo titulo="(−) Deduções (ISS, PIS/COFINS)" g={data.deducoes} />
        </div>
        <Subtotal label="= RECEITA LÍQUIDA" valor={data.receitaLiquida} />

        {/* CMV -> Lucro bruto */}
        <div className="mt-3">
          <Grupo titulo="(−) CMV / CSV (custos variáveis)" g={data.cmv} />
        </div>
        <Subtotal label="= LUCRO BRUTO" valor={data.lucroBruto} margem={data.margemBruta} margemLabel="margem bruta" />

        {/* Despesas operacionais -> EBITDA */}
        <div className="mt-3">
          <Grupo titulo="(−) Despesas operacionais" g={data.operacional} />
        </div>
        <Subtotal label="= EBITDA" valor={data.ebitda} margem={data.margemEbitda} margemLabel="EBITDA" />

        {/* Financeiras e impostos -> Lucro líquido */}
        <div className="mt-3">
          <Grupo titulo="(−) Despesas financeiras" g={data.financeira} />
          <Grupo titulo="(−) Impostos sobre o resultado" g={data.impostos} />
        </div>

        {/* Lucro líquido */}
        <div className="mt-4 rounded-lg bg-brand-light px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-brand-dark">= LUCRO LÍQUIDO</span>
            <span className={`text-lg font-bold tabular-nums ${data.lucroLiquido >= 0 ? 'text-success' : 'text-danger'}`}>
              {formatBRL(data.lucroLiquido)}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
            <span>Margem líquida: {data.margemLiquida === null ? '—' : `${data.margemLiquida.toFixed(1)}%`}</span>
            {variacao !== null && (
              <span className={variacao >= 0 ? 'text-success' : 'text-danger'}>
                {variacao >= 0 ? '▲' : '▼'} {Math.abs(variacao).toFixed(1)}% vs. mês anterior
              </span>
            )}
          </div>
        </div>

        {/* Resumo de margens */}
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-lg border border-slate-200 py-2">
            <p className="text-slate-500">Margem bruta</p>
            <p className="font-medium text-slate-700">{data.margemBruta === null ? '—' : `${data.margemBruta.toFixed(1)}%`}</p>
          </div>
          <div className="rounded-lg border border-slate-200 py-2">
            <p className="text-slate-500">EBITDA</p>
            <p className="font-medium text-slate-700">{data.margemEbitda === null ? '—' : `${data.margemEbitda.toFixed(1)}%`}</p>
          </div>
          <div className="rounded-lg border border-slate-200 py-2">
            <p className="text-slate-500">Margem líquida</p>
            <p className="font-medium text-slate-700">{data.margemLiquida === null ? '—' : `${data.margemLiquida.toFixed(1)}%`}</p>
          </div>
        </div>

        {data.comparativo && (
          <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
            <div className="rounded-lg border border-slate-200 py-2">
              <p className="text-slate-500">Receita mês ant.</p>
              <p className="font-medium text-slate-700">{formatBRL(data.comparativo.receitaAnt)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 py-2">
              <p className="text-slate-500">Lucro líq. mês ant.</p>
              <p className="font-medium text-slate-700">{formatBRL(data.comparativo.lucroLiquidoAnt)}</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
