'use client'

import { useActionState } from 'react'
import { criarConta, type ContaState } from '../actions'
import { Card, Field, inputClass, btnPrimary } from '@/components/ui'
import { ORIGENS_PAGAMENTO } from '@/lib/types'

type Opt = { id: string; nome: string }

export function ContaForm({
  unidades,
  centros,
  tipos,
  hoje,
}: {
  unidades: Opt[] | null // só para admin
  centros: Opt[]
  tipos: Opt[]
  hoje: string
}) {
  const [state, formAction, pending] = useActionState<ContaState, FormData>(criarConta, {})

  return (
    <Card>
      <form action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {unidades && (
          <Field label="Unidade" htmlFor="unidade_id">
            <select id="unidade_id" name="unidade_id" required className={inputClass} defaultValue="">
              <option value="">Selecione…</option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Centro de custo" htmlFor="centro_custo_id">
          <select id="centro_custo_id" name="centro_custo_id" required className={inputClass} defaultValue="">
            <option value="">Selecione…</option>
            {centros.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Tipo de despesa" htmlFor="tipo_despesa_id">
          <select id="tipo_despesa_id" name="tipo_despesa_id" required className={inputClass} defaultValue="">
            <option value="">Selecione…</option>
            {tipos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Data do pagamento" htmlFor="data">
          <input id="data" name="data" type="date" required defaultValue={hoje} className={inputClass} />
        </Field>

        <Field label="Nº da nota / cupom" htmlFor="numero_nota" hint="Opcional">
          <input id="numero_nota" name="numero_nota" className={inputClass} placeholder="Ex.: 12345" />
        </Field>

        <Field label="Valor (R$)" htmlFor="valor">
          <input id="valor" name="valor" inputMode="decimal" required placeholder="0,00" className={inputClass} />
        </Field>

        <Field label="Origem do pagamento" htmlFor="origem_pagamento">
          <select id="origem_pagamento" name="origem_pagamento" required className={inputClass} defaultValue="">
            <option value="">Selecione…</option>
            {ORIGENS_PAGAMENTO.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </Field>

        <div className="sm:col-span-2">
          {state.erro && (
            <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{state.erro}</p>
          )}
          <button type="submit" disabled={pending} className={btnPrimary}>
            {pending ? 'Salvando…' : 'Registrar pagamento'}
          </button>
        </div>
      </form>
    </Card>
  )
}
