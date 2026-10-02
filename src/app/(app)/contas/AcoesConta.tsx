'use client'

import { useActionState, useEffect, useState, useTransition } from 'react'
import { Field, inputClass, btnPrimary, btnGhost } from '@/components/ui'
import { ORIGENS_PAGAMENTO } from '@/lib/types'
import { atualizarConta, excluirConta, type ContaState } from './actions'

type Opt = { id: string; nome: string }
type Forn = { id: string; razao_social: string }
export type ContaEdit = {
  id: string
  unidade_id: string
  centro_custo_id: string
  tipo_despesa_id: string
  fornecedor_id: string | null
  data: string
  numero_nota: string | null
  valor: number
}

export function AcoesConta({
  conta,
  centros,
  tipos,
  unidades,
  fornecedores,
  origem,
}: {
  conta: ContaEdit
  centros: Opt[]
  tipos: Opt[]
  unidades: Opt[] | null
  fornecedores: Forn[]
  origem: string
}) {
  const [editar, setEditar] = useState(false)
  const [pending, startTransition] = useTransition()

  function remover() {
    if (!window.confirm('Excluir este pagamento? Esta ação não pode ser desfeita.')) return
    const fd = new FormData()
    fd.set('id', conta.id)
    startTransition(async () => {
      const r = await excluirConta(fd)
      if (r?.erro) window.alert(r.erro)
    })
  }

  return (
    <div className="flex justify-end gap-3 whitespace-nowrap">
      <button type="button" onClick={() => setEditar(true)} disabled={pending} className="text-brand hover:underline disabled:opacity-50">
        Editar
      </button>
      <button type="button" onClick={remover} disabled={pending} className="text-danger hover:underline disabled:opacity-50">
        Excluir
      </button>
      {editar && (
        <EditarModal
          conta={conta}
          centros={centros}
          tipos={tipos}
          unidades={unidades}
          fornecedores={fornecedores}
          origem={origem}
          onClose={() => setEditar(false)}
        />
      )}
    </div>
  )
}

function EditarModal({
  conta,
  centros,
  tipos,
  unidades,
  fornecedores,
  origem,
  onClose,
}: {
  conta: ContaEdit
  centros: Opt[]
  tipos: Opt[]
  unidades: Opt[] | null
  fornecedores: Forn[]
  origem: string
  onClose: () => void
}) {
  const [state, action, pending] = useActionState<ContaState, FormData>(atualizarConta, {})
  useEffect(() => {
    if (state.ok) onClose()
  }, [state.ok, onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 text-left">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <h3 className="mb-4 text-lg font-bold text-brand-dark">Editar pagamento</h3>
        <form action={action} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <input type="hidden" name="id" value={conta.id} />
          {unidades && (
            <Field label="Unidade" htmlFor="e-unidade">
              <select id="e-unidade" name="unidade_id" defaultValue={conta.unidade_id} className={inputClass}>
                {unidades.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Fornecedor" htmlFor="e-fornecedor">
            <select id="e-fornecedor" name="fornecedor_id" defaultValue={conta.fornecedor_id ?? ''} className={inputClass}>
              <option value="">— Sem fornecedor —</option>
              {fornecedores.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.razao_social}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Centro de custo" htmlFor="e-centro">
            <select id="e-centro" name="centro_custo_id" defaultValue={conta.centro_custo_id} className={inputClass}>
              {centros.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tipo de despesa" htmlFor="e-tipo">
            <select id="e-tipo" name="tipo_despesa_id" defaultValue={conta.tipo_despesa_id} className={inputClass}>
              {tipos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Data" htmlFor="e-data">
            <input id="e-data" name="data" type="date" defaultValue={conta.data} className={inputClass} />
          </Field>
          <Field label="Nº da nota" htmlFor="e-nota">
            <input id="e-nota" name="numero_nota" defaultValue={conta.numero_nota ?? ''} className={inputClass} />
          </Field>
          <Field label="Valor (R$)" htmlFor="e-valor">
            <input id="e-valor" name="valor" inputMode="decimal" defaultValue={conta.valor.toFixed(2).replace('.', ',')} className={inputClass} />
          </Field>
          <Field label="Origem" htmlFor="e-origem">
            <select id="e-origem" name="origem_pagamento" defaultValue={origem} className={inputClass}>
              {ORIGENS_PAGAMENTO.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </Field>

          <div className="sm:col-span-2">
            {state.erro && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{state.erro}</p>}
            <div className="flex justify-end gap-3">
              <button type="button" onClick={onClose} disabled={pending} className={btnGhost}>
                Cancelar
              </button>
              <button type="submit" disabled={pending} className={btnPrimary}>
                {pending ? 'Salvando…' : 'Salvar alterações'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
