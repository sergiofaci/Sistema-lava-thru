'use client'

import type { ReactNode } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ComposedChart,
  Line,
  Legend,
  CartesianGrid,
} from 'recharts'
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

type MesPonto = { mes: string; faturamento: number; despesas: number; resultado: number }

const compacto = (n: number) =>
  new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(n)

// Evolução mensal: faturamento e despesas (barras) + resultado (linha).
export function TrendChart({ data }: { data: MesPonto[] }) {
  if (data.length === 0 || data.every((d) => d.faturamento === 0 && d.despesas === 0)) {
    return <p className="py-8 text-center text-sm text-slate-400">Sem histórico no período.</p>
  }
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
        <CartesianGrid vertical={false} stroke="#eef2f7" />
        <XAxis dataKey="mes" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#475569' }} />
        <YAxis
          width={56}
          tickFormatter={(v) => compacto(Number(v))}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: '#94a3b8' }}
        />
        <Tooltip
          formatter={(v: ReactNode, n: ReactNode) => [formatBRL(Number(v)), String(n)]}
          cursor={{ fill: 'rgba(0,0,0,0.04)' }}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="faturamento" name="Faturamento" fill="#0d1d60" radius={[4, 4, 0, 0]} maxBarSize={26} />
        <Bar dataKey="despesas" name="Despesas" fill="#f54f03" radius={[4, 4, 0, 0]} maxBarSize={26} />
        <Line type="monotone" dataKey="resultado" name="Resultado" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

type YoYPonto = { mes: string; atual: number | null; anterior: number | null }

// Comparação ano a ano: barras do ano atual x ano anterior, por mês.
export function YoYChart({
  data,
  labelAtual,
  labelAnterior,
}: {
  data: YoYPonto[]
  labelAtual: string
  labelAnterior: string
}) {
  if (data.every((d) => !d.atual && !d.anterior)) {
    return <p className="py-8 text-center text-sm text-slate-400">Sem dados para comparar.</p>
  }
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
        <CartesianGrid vertical={false} stroke="#eef2f7" />
        <XAxis dataKey="mes" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#475569' }} />
        <YAxis width={56} tickFormatter={(v) => compacto(Number(v))} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
        <Tooltip
          formatter={(v: ReactNode, n: ReactNode) => [formatBRL(Number(v)), String(n)]}
          cursor={{ fill: 'rgba(0,0,0,0.04)' }}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="anterior" name={labelAnterior} fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={22} />
        <Bar dataKey="atual" name={labelAtual} fill="#0d1d60" radius={[4, 4, 0, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// Tendência de um valor (linha), formato BRL.
export function TicketChart({ data }: { data: { mes: string; valor: number }[] }) {
  if (data.every((d) => !d.valor)) {
    return <p className="py-8 text-center text-sm text-slate-400">Sem dados no período.</p>
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
        <CartesianGrid vertical={false} stroke="#eef2f7" />
        <XAxis dataKey="mes" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#475569' }} />
        <YAxis width={56} tickFormatter={(v) => compacto(Number(v))} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
        <Tooltip
          formatter={(v: ReactNode) => [formatBRL(Number(v)), 'Ticket médio']}
          cursor={{ fill: 'rgba(0,0,0,0.04)' }}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
        />
        <Line type="monotone" dataKey="valor" name="Ticket médio" stroke="#0d1d60" strokeWidth={2} dot={{ r: 3 }} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
