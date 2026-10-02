'use client'

import { useActionState, useTransition } from 'react'
import { Card, Field, inputClass, btnPrimary } from '@/components/ui'
import { salvarMeta, excluirMeta, type MetaState } from './actions'

type Unidade = { id: string; nome: string }

export function MetaForm({ unidades, mesPadrao }: { unidades: Unidade[]; mesPadrao: string }) {
  const [state, action, pending] = useActionState<MetaState, FormData>(salvarMeta, {})
  return (
    <Card className="mb-6">
      <form action={action} className="grid grid-cols-1 gap-4 sm:grid-cols-4 sm:items-end">
        <Field label="Unidade" htmlFor="m-uni">
          <select id="m-uni" name="unidade_id" className={inputClass} defaultValue="">
            <option value="">Selecione…</option>
            {unidades.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Mês" htmlFor="m-mes">
          <input id="m-mes" name="mes" type="month" defaultValue={mesPadrao} className={inputClass} />
        </Field>
        <Field label="Meta (R$)" htmlFor="m-valor">
          <input id="m-valor" name="valor" inputMode="decimal" placeholder="0,00" className={inputClass} />
        </Field>
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? 'Salvando…' : 'Salvar meta'}
        </button>
      </form>
      {state.ok && <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-success">✓ {state.ok}</p>}
      {state.erro && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{state.erro}</p>}
    </Card>
  )
}

export function ExcluirMeta({ id }: { id: string }) {
  const [pending, startTransition] = useTransition()
  function remover() {
    if (!window.confirm('Excluir esta meta?')) return
    const fd = new FormData()
    fd.set('id', id)
    startTransition(async () => {
      const r = await excluirMeta(fd)
      if (r?.erro) window.alert(r.erro)
    })
  }
  return (
    <button type="button" onClick={remover} disabled={pending} className="text-danger hover:underline disabled:opacity-50">
      Excluir
    </button>
  )
}
