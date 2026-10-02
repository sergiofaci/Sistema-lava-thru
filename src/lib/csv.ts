// Gera CSV compatível com Excel pt-BR (separador ';' e BOM UTF-8).
export function toCSV(rows: (string | number | null | undefined)[][]): string {
  const esc = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
  }
  const corpo = rows.map((r) => r.map(esc).join(';')).join('\r\n')
  return '﻿' + corpo
}
