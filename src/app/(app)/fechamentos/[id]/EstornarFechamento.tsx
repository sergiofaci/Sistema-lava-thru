'use client'

import { useTransition } from 'react'
import { estornarFechamento } from '../actions'

export function EstornarFechamento({ id }: { id: string }) {
  const [pending, startTransition] = useTransition()

  function estornar() {
    if (!window.confirm('Estornar este fechamento? Ele será excluído e o turno ficará livre para relançar.')) return
    const fd = new FormData()
    fd.set('id', id)
    startTransition(async () => {
      const r = await estornarFechamento(fd)
      if (r?.erro) window.alert(r.erro)
    })
  }

  return (
    <button
      type="button"
      onClick={estornar}
      disabled={pending}
      className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-danger hover:bg-red-50 disabled:opacity-50"
    >
      {pending ? 'Estornando…' : 'Estornar fechamento'}
    </button>
  )
}
