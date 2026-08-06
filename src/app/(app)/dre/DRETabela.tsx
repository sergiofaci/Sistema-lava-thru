import { Card } from '@/components/ui'
import { formatBRL } from '@/lib/money'

export type DREData = {
  mesLabel: string
  receitas: { label: string; value: number }[]
  receitaBruta: number
  grupos: { centro: string; total: number; itens: { label: string; value: number }[] }[]
  despesasTotal: number
  resultado: number
  margem: number | null
  comparativo?: { receitaAnt: number; despesaAnt: number; resultadoAnt: number }
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
      <span className={`text-sm ${forte ? 'font-semibold text-brand-dark' : 'text-slate-600'}`}>
        {label}
      </span>
      <span className={`text-sm tabular-nums ${forte ? 'font-bold' : 'font-medium'} ${cor ?? 'text-slate-700'}`}>
        {sinal === '−' && valor > 0 ? '(' + formatBRL(valor) + ')' : formatBRL(valor)}
      </span>
    </div>
  )
}

export function DRETabela({ data }: { data: DREData }) {
  const variacao =
    data.comparativo && data.comparativo.resultadoAnt !== 0
      ? ((data.resultado - data.comparativo.resultadoAnt) / Math.abs(data.comparativo.resultadoAnt)) * 100
      : null

  return (
    <div className="max-w-2xl">
      <Card>
        <div className="mb-4 border-b border-slate-200 pb-3">
          <h2 className="font-semibold text-brand-dark">Demonstração de Resultado (gerencial)</h2>
          <p className="text-xs capitalize text-slate-500">{data.mesLabel}</p>
        </div>

        {/* Receitas */}
        <Linha label="RECEITA OPERACIONAL" valor={data.receitaBruta} forte cor="text-success" sinal="+" />
        {data.receitas.map((r) => (
          <Linha key={r.label} label={r.label} valor={r.value} nivel={1} />
        ))}

        {/* Despesas */}
        <div className="mt-3">
          <Linha label="(−) DESPESAS" valor={data.despesasTotal} forte cor="text-danger" sinal="−" />
          {data.grupos.length === 0 && (
            <p className="py-2 pl-5 text-sm text-slate-400">Sem despesas no período.</p>
          )}
          {data.grupos.map((g) => (
            <div key={g.centro}>
              <Linha label={g.centro} valor={g.total} nivel={1} forte sinal="−" />
              {g.itens.map((i) => (
                <Linha key={i.label} label={i.label} valor={i.value} nivel={2} sinal="−" />
              ))}
            </div>
          ))}
        </div>

        {/* Resultado */}
        <div className="mt-4 rounded-lg bg-brand-light px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-brand-dark">= RESULTADO DO PERÍODO</span>
            <span className={`text-lg font-bold tabular-nums ${data.resultado >= 0 ? 'text-success' : 'text-danger'}`}>
              {formatBRL(data.resultado)}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
            <span>
              Margem: {data.margem === null ? '—' : `${data.margem.toFixed(1)}%`}
            </span>
            {variacao !== null && (
              <span className={variacao >= 0 ? 'text-success' : 'text-danger'}>
                {variacao >= 0 ? '▲' : '▼'} {Math.abs(variacao).toFixed(1)}% vs. mês anterior
              </span>
            )}
          </div>
        </div>

        {data.comparativo && (
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-lg border border-slate-200 py-2">
              <p className="text-slate-500">Receita ant.</p>
              <p className="font-medium text-slate-700">{formatBRL(data.comparativo.receitaAnt)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 py-2">
              <p className="text-slate-500">Despesa ant.</p>
              <p className="font-medium text-slate-700">{formatBRL(data.comparativo.despesaAnt)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 py-2">
              <p className="text-slate-500">Resultado ant.</p>
              <p className="font-medium text-slate-700">{formatBRL(data.comparativo.resultadoAnt)}</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
