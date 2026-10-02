'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, Badge } from '@/components/ui'
import { formatBRL } from '@/lib/money'

export type LinhaView = {
  id: string
  manha: boolean
  turnoLabel: string
  unidade: string
  usuario: string
  maquina: string
  total: number
  comDif: boolean
  diferenca: number
}
export type DiaView = {
  dia: string
  label: string
  total: number
  comDiferenca: boolean
  linhas: LinhaView[]
}

export function DiasColapsaveis({ dias, diaAberto }: { dias: DiaView[]; diaAberto: string }) {
  const inicial = dias.some((d) => d.dia === diaAberto) ? diaAberto : dias[0]?.dia
  const [aberto, setAberto] = useState<Record<string, boolean>>(inicial ? { [inicial]: true } : {})

  function toggle(dia: string) {
    setAberto((prev) => ({ ...prev, [dia]: !prev[dia] }))
  }

  return (
    <div className="space-y-3">
      {dias.map((d) => {
        const isOpen = aberto[d.dia] ?? false
        return (
          <div key={d.dia}>
            <button
              type="button"
              onClick={() => toggle(d.dia)}
              className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-left transition hover:bg-slate-50"
            >
              <span className="flex items-center gap-2">
                <span className={`text-[10px] text-slate-400 transition-transform ${isOpen ? 'rotate-90' : ''}`}>▶</span>
                <span className="text-sm font-semibold capitalize text-brand-dark">{d.label}</span>
                <span className="text-xs text-slate-400">
                  ({d.linhas.length} {d.linhas.length === 1 ? 'fech.' : 'fech.'})
                </span>
              </span>
              <span className="flex items-center gap-2 text-sm">
                <span className="font-semibold text-slate-700">{formatBRL(d.total)}</span>
                {d.comDiferenca ? <Badge tone="danger">c/ diferença</Badge> : <Badge tone="success">OK</Badge>}
              </span>
            </button>

            {isOpen && (
              <Card className="mt-1 p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-sm">
                    <tbody>
                      {d.linhas.map((f) => (
                        <tr key={f.id} className="border-b border-slate-100 last:border-0">
                          <td className="px-5 py-3">
                            <Badge tone={f.manha ? 'warning' : 'neutral'}>{f.turnoLabel}</Badge>
                          </td>
                          <td className="px-5 py-3 text-slate-600">{f.unidade}</td>
                          <td className="px-5 py-3 text-slate-600">{f.usuario}</td>
                          <td className="px-5 py-3 text-slate-600">{f.maquina}</td>
                          <td className="px-5 py-3 text-right font-medium text-slate-700">{formatBRL(f.total)}</td>
                          <td className="px-5 py-3">
                            {f.comDif ? <Badge tone="danger">{formatBRL(f.diferenca)}</Badge> : <Badge tone="success">OK</Badge>}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <Link href={`/fechamentos/${f.id}`} className="text-sm text-brand hover:underline">
                              Ver
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        )
      })}
    </div>
  )
}
