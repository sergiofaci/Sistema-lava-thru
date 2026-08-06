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

// Quantidade (pode ter decimais: litros, kg). Aceita "2,5" ou "2.5".
export function parseQtd(v: string | number | null | undefined): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  if (!v) return 0
  const s = String(v).trim().replace(/\s/g, '')
  // se tem vírgula, ela é o separador decimal (pontos = milhar)
  const norm = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s
  const n = Number(norm)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

// mostra quantidade sem casas desnecessárias (2.500 -> "2,5")
export function formatQtd(v: number): string {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(v ?? 0)
}
