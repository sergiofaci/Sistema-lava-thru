// Utilitários de valores em Reais (pt-BR).

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

// "1.234,56" | "1234,56" | "1234.56" | "" -> number
export function parseBRL(v: string | number | null | undefined): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  if (!v) return 0
  const limpo = String(v).trim().replace(/\s/g, '').replace(/\./g, '').replace(',', '.')
  const n = Number(limpo)
  return Number.isFinite(n) ? n : 0
}

export function formatBRL(v: number): string {
  return BRL.format(v ?? 0)
}

// arredonda para 2 casas evitando ruído de ponto flutuante
export function round2(v: number): number {
  return Math.round((v + Number.EPSILON) * 100) / 100
}
