'use client'

import { useMemo, useState, useTransition } from 'react'
import { Card, btnPrimary } from '@/components/ui'
import { formatBRL, round2 } from '@/lib/money'
import { salvarMetasItem } from './actions'

type Tipo = { id: string; nome: string; categoria?: string; preco: number }

const num = (v: string) => {
  const n = Number(String(v ?? '').replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : 0
}

export function MetasItemGrid({
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
  const [qtd, setQtd] = useState<Record<string, string>>(
    Object.fromEntries(tipos.map((t) => [t.id, atual[t.id] ? String(atual[t.id]) : ''])),
  )
  const [pending, startTransition] = useTransition()
  const [res, setRes] = useState<{ ok?: string; erro?: string } | null>(null)

  const lavagens = useMemo(() => tipos.filter((t) => t.categoria !== 'servico'), [tipos])
  const servicos = useMemo(() => tipos.filter((t) => t.categoria === 'servico'), [tipos])

  const subtotal = (lista: Tipo[]) =>
    round2(lista.reduce((s, t) => s + num(qtd[t.id] ?? '') * Number(t.preco), 0))

  const totalLavagens = useMemo(() => subtotal(lavagens), [qtd, lavagens])
  const totalServicos = useMemo(() => subtotal(servicos), [qtd, servicos])
  const totalGeral = round2(totalLavagens + totalServicos)

  function setUm(id: string, valor: string) {
    setQtd((prev) => ({ ...prev, [id]: valor }))
  }

  function salvar() {
    if (!unidadeId) {
      setRes({ erro: 'Selecione a unidade.' })
      return
    }
    setRes(null)
    const itens = tipos.map((t) => ({ tipo_lavagem_id: t.id, quantidade: num(qtd[t.id] ?? '') }))
    startTransition(async () => {
      const r = await salvarMetasItem({ unidade_id: unidadeId, mes, itens })
      setRes(r)
    })
  }

  const grupos = [
    { titulo: 'Lavagens', lista: lavagens, total: totalLavagens },
    { titulo: 'Serviços e adicionais', lista: servicos, total: totalServicos },
  ]

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-brand-dark px-5 py-4 text-white">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm text-white/70">Meta de faturamento do mês (Σ quantidade × preço)</span>
          <span className="text-2xl font-bold">{formatBRL(totalGeral)}</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-white/70">
          <span>
            Lavagens: <strong className="text-white">{formatBRL(totalLavagens)}</strong>
          </span>
          <span>
            Serviços: <strong className="text-white">{formatBRL(totalServicos)}</strong>
          </span>
        </div>
      </div>

      {grupos.map(
        (grupo) =>
          grupo.lista.length > 0 && (
            <Card key={grupo.titulo} className="p-0">
              <div className="border-b border-slate-200 px-4 py-3">
                <h2 className="font-semibold text-brand-dark">{grupo.titulo}</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-2 font-medium">Item</th>
                      <th className="px-4 py-2 text-right font-medium">Preço</th>
                      <th className="px-4 py-2 text-right font-medium">Meta (qtd/mês)</th>
                      <th className="px-4 py-2 text-right font-medium">Meta (R$)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grupo.lista.map((t) => {
                      const valor = round2(num(qtd[t.id] ?? '') * Number(t.preco))
                      return (
                        <tr key={t.id} className="border-b border-slate-100 last:border-0">
                          <td className="px-4 py-2 text-slate-700">{t.nome}</td>
                          <td className="px-4 py-2 text-right text-slate-500">{formatBRL(Number(t.preco))}</td>
                          <td className="px-4 py-2 text-right">
                            <input
                              inputMode="numeric"
                              value={qtd[t.id] ?? ''}
                              onChange={(e) => setUm(t.id, e.target.value)}
                              className="w-24 rounded-md border border-slate-300 px-2 py-1 text-right text-sm"
                              placeholder="0"
                            />
                          </td>
                          <td className="px-4 py-2 text-right font-medium text-slate-700">
                            {valor > 0 ? formatBRL(valor) : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 font-semibold">
                      <td className="px-4 py-3 text-slate-700" colSpan={3}>
                        Total {grupo.titulo.toLowerCase()}
                      </td>
                      <td className="px-4 py-3 text-right text-brand-dark">{formatBRL(grupo.total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          ),
      )}

      {res?.ok && <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-success">✓ {res.ok}</p>}
      {res?.erro && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-danger">{res.erro}</p>}

      <div className="flex justify-end">
        <button type="button" onClick={salvar} disabled={pending} className={btnPrimary}>
          {pending ? 'Salvando…' : 'Salvar metas do mês'}
        </button>
      </div>
    </div>
  )
}
