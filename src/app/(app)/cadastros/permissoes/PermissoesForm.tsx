'use client'

import { useActionState } from 'react'
import { Card, btnPrimary } from '@/components/ui'
import { MODULOS } from '@/lib/modulos'
import { salvarPermissoes, type PermState } from './actions'

export function PermissoesForm({ atual }: { atual: Record<string, boolean> }) {
  const [state, action, pending] = useActionState<PermState, FormData>(salvarPermissoes, {})

  return (
    <Card className="max-w-2xl p-0">
      <form action={action}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="px-5 py-3 text-left font-medium">Módulo</th>
              <th className="px-5 py-3 text-center font-medium">Gerente</th>
              <th className="px-5 py-3 text-center font-medium">Caixa</th>
            </tr>
          </thead>
          <tbody>
            {MODULOS.map((m) => (
              <tr key={m.key} className="border-b border-slate-100 last:border-0">
                <td className="px-5 py-3 text-slate-700">{m.label}</td>
                {(['gerente', 'caixa'] as const).map((papel) => (
                  <td key={papel} className="px-5 py-3 text-center">
                    <input
                      type="checkbox"
                      name={`${papel}:${m.key}`}
                      defaultChecked={atual[`${papel}:${m.key}`]}
                      className="h-4 w-4 accent-[var(--color-brand)]"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-4">
          <div className="text-sm">
            {state.ok && <span className="text-success">✓ {state.ok}</span>}
            {state.erro && <span className="text-danger">{state.erro}</span>}
          </div>
          <button type="submit" disabled={pending} className={btnPrimary}>
            {pending ? 'Salvando…' : 'Salvar permissões'}
          </button>
        </div>
      </form>
    </Card>
  )
}
