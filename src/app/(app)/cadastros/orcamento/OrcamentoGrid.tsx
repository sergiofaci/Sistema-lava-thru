'use client'

import { useMemo, useState, useTransition } from 'react'
import { Card, btnPrimary } from '@/components/ui'
import { formatBRL, round2 } from '@/lib/money'
import { salvarOrcamento } from './actions'

type Tipo = { id: string; nome: string }

export function OrcamentoGrid({
  tipos,
  atual,
  unidadeId,
  mes,
}: {
  tipos: Tipo[]
  atual: Record<string, number>
  unidadeId: string
  mes: string
}) {
  const [valor, setValor] = useState<Record<string, string>>(
    Object.fromEntries(tipos.map((t) => [t.id, atual[t.id] ? String(atual[t.id]).replace('.', ',') : ''])),
  )
  const [pending, startTransition] = useTransition()
  const [res, setRes] = useState<{ ok?: string; erro?: string } | null>(null)

  const num = (v: string) => {
    const s = String(v).replace(/[R$\s]/g, '')
    const n = s.includes(',') ? Number(s.replace(/\./g, '').replace(',', '.')) : Number(s)
    return Number.isFinite(n) && n > 0 ? n : 0
  }

  const total = useMemo(() => round2(tipos.reduce((s, t) => s + num(valor[t.id] ?? ''), 0)), [valor, tipos])

  function salvar() {
    if (!unidadeId) {
      setRes({ erro: 'Selecione a unidade.' })
      return
    }
    setRes(null)
    const itens = tipos.map((t) => ({ tipo_despesa_id: t.id, valor: num(valor[t.id] ?? '') }))
    startTransition(async () => {
      const r = await salvarOrcamento({ unidade_id: unidadeId, mes, itens })
      setRes(r)
    })
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-brand-dark px-5 py-4 text-white">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm text-white/70">Orçamento total de despesas do mês</span>
          <span className="text-2xl font-bold">{formatBRL(total)}</span>
        </div>
      </div>

      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2 font-medium">Tipo de despesa</th>
                <th className="px-4 py-2 text-right font-medium">Orçado (R$)</th>
              </tr>
            </thead>
            <tbody>
              {tipos.map((t) => (
                <tr key={t.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2 text-slate-700">{t.nome}</td>
                  <td className="px-4 py-2 text-right">
                    <input
                      inputMode="decimal"
                      value={valor[t.id] ?? ''}
                      onChange={(e) => setValor({ ...valor, [t.id]: e.target.value })}
                      className="w-28 rounded-md border border-slate-300 px-2 py-1 text-right text-sm"
                      placeholder="0,00"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {res?.ok && <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-success">✓ {res.ok}</p>}
      {res?.erro && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-danger">{res.erro}</p>}

      <div className="flex justify-end">
        <button type="button" onClick={salvar} disabled={pending} className={btnPrimary}>
          {pending ? 'Salvando…' : 'Salvar orçamento do mês'}
        </button>
      </div>
    </div>
  )
}
