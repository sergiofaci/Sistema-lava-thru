'use client'

import { useActionState } from 'react'
import { Card, btnPrimary } from '@/components/ui'
import { salvarComposicao, type ComposicaoState } from './actions'

type Proc = { id: string; nome: string }

export function ComposicaoTipo({
  tipo,
  processos,
  selecionados,
}: {
  tipo: { id: string; nome: string; categoria?: string }
  processos: Proc[]
  selecionados: string[]
}) {
  const [state, action, pending] = useActionState<ComposicaoState, FormData>(salvarComposicao, {})
  const sel = new Set(selecionados)

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-semibold text-brand-dark">
          {tipo.nome}
          {tipo.categoria === 'servico' && (
            <span className="ml-2 rounded bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-500">
              serviço
            </span>
          )}
        </h2>
        {state.ok && <span className="text-xs text-success">✓ {state.ok}</span>}
        {state.erro && <span className="text-xs text-danger">{state.erro}</span>}
      </div>
      <form action={action}>
        <input type="hidden" name="tipo_id" value={tipo.id} />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {processos.map((p) => (
            <label
              key={p.id}
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <input
                type="checkbox"
                name="processo_id"
                value={p.id}
                defaultChecked={sel.has(p.id)}
                className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
              />
              {p.nome}
            </label>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <button type="submit" disabled={pending} className={btnPrimary}>
            {pending ? 'Salvando…' : 'Salvar composição'}
          </button>
        </div>
      </form>
    </Card>
  )
}
