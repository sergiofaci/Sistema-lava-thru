'use client'

import { useTransition } from 'react'
import { estornarMovimento } from './actions'

export function EstornarMovimento({ id, tipo }: { id: string; tipo: 'entrada' | 'saida' }) {
  const [pending, startTransition] = useTransition()

  function estornar() {
    const msg =
      tipo === 'entrada'
        ? 'Estornar esta entrada? Será criada uma baixa compensatória.'
        : 'Estornar esta baixa? O produto voltará ao estoque.'
    if (!window.confirm(msg)) return
    const fd = new FormData()
    fd.set('id', id)
    fd.set('tipo', tipo)
    startTransition(async () => {
      const r = await estornarMovimento(fd)
      if (r?.erro) window.alert(r.erro)
    })
  }

  return (
    <button
      type="button"
      onClick={estornar}
      disabled={pending}
      className="text-danger hover:underline disabled:opacity-50"
    >
      {pending ? '…' : 'Estornar'}
    </button>
  )
}
