'use client'

import { useActionState } from 'react'
import { Card, btnPrimary } from '@/components/ui'
import { salvarVisibilidade, type VisibState } from './actions'

type Tipo = { id: string; nome: string; categoria?: string }

export function CargoVisib({
  cargo,
  label,
  tipos,
  selecionados,
  verFaturamento,
  verDespesas,
}: {
  cargo: string
  label: string
  tipos: Tipo[]
  selecionados: string[]
  verFaturamento: boolean
  verDespesas: boolean
}) {
  const [state, action, pending] = useActionState<VisibState, FormData>(salvarVisibilidade, {})
  const sel = new Set(selecionados)

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-semibold text-brand-dark">{label}</h2>
        {state.ok && <span className="text-xs text-success">✓ {state.ok}</span>}
        {state.erro && <span className="text-xs text-danger">{state.erro}</span>}
      </div>
      <form action={action}>
        <input type="hidden" name="cargo" value={cargo} />
        <div className="mb-3 flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="ver_faturamento" defaultChecked={verFaturamento} className="h-4 w-4 rounded border-slate-300 text-brand" />
            Ver meta de faturamento
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="ver_despesas" defaultChecked={verDespesas} className="h-4 w-4 rounded border-slate-300 text-brand" />
            Ver orçamento de despesas
          </label>
        </div>
        <p className="mb-2 text-xs text-slate-500">Itens visíveis para este cargo:</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {tipos.map((t) => (
            <label key={t.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
              <input type="checkbox" name="tipo_id" value={t.id} defaultChecked={sel.has(t.id)} className="h-4 w-4 rounded border-slate-300 text-brand" />
              {t.nome}
            </label>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <button type="submit" disabled={pending} className={btnPrimary}>
            {pending ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </form>
    </Card>
  )
}
