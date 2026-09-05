'use client'

import { btnGhost } from '@/components/ui'

// Botões de exportar (CSV) e imprimir (PDF via impressão do navegador).
export function ExportBar({ csv, filename }: { csv: string; filename: string }) {
  function baixarCsv() {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="no-print flex gap-2">
      <button type="button" onClick={baixarCsv} className={btnGhost}>
        ⬇ Exportar CSV
      </button>
      <button type="button" onClick={() => window.print()} className={btnGhost}>
        🖨 Imprimir / PDF
      </button>
    </div>
  )
}
