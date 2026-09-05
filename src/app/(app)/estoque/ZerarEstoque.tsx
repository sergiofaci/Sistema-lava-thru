'use client'

import { useTransition } from 'react'
import { zerarEstoque } from './actions'

export function ZerarEstoque() {
  const [pending, startTransition] = useTransition()

  function run() {
    const r = window.prompt(
      'Isso APAGA todas as entradas, saídas e saldos de estoque de TODAS as unidades. ' +
        'Os cadastros de produtos e locais são mantidos.\n\nDigite ZERAR para confirmar:',
    )
    if (r?.trim().toUpperCase() !== 'ZERAR') return
    startTransition(async () => {
      const res = await zerarEstoque()
      if (res?.erro) window.alert(res.erro)
      else window.alert('Estoque zerado com sucesso.')
    })
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={pending}
      className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-danger hover:bg-red-50 disabled:opacity-50"
    >
      {pending ? 'Zerando…' : '⚠ Zerar estoque'}
    </button>
  )
}
