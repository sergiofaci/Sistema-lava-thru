'use client'

import type { ReactNode } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'
import { formatBRL } from '@/lib/money'

type Ponto = { label: string; value: number }

// Gráfico de barras horizontais reutilizável.
export function BarsCard({
  data,
  tipo = 'brl',
  cor = '#0d1d60',
}: {
  data: Ponto[]
  tipo?: 'brl' | 'int'
  cor?: string
}) {
  const fmt = (n: number) =>
    tipo === 'brl' ? formatBRL(n) : new Intl.NumberFormat('pt-BR').format(n)
  const labelFmt = (v: ReactNode) => fmt(Number(v))

  if (data.length === 0 || data.every((d) => d.value === 0)) {
    return <p className="py-8 text-center text-sm text-slate-400">Sem dados no período.</p>
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(140, data.length * 46)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 56, bottom: 4, left: 8 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          width={150}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: '#475569' }}
        />
        <Tooltip
          formatter={(v) => fmt(Number(v))}
          cursor={{ fill: 'rgba(0,0,0,0.04)' }}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
        />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} fill={cor} label={{ position: 'right', formatter: labelFmt, fontSize: 11, fill: '#475569' }} />
      </BarChart>
    </ResponsiveContainer>
  )
}
