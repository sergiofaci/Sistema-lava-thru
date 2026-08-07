'use client'

import { useActionState } from 'react'
import { Card, Field, inputClass, btnPrimary } from '@/components/ui'
import type { EstoqueState } from './actions'

type Produto = { id: string; nome: string; unidade_medida: string }
type Opt = { id: string; nome: string }

export function MovimentoForm({
  acao,
  produtos,
  unidades,
  unidadeFixaNome,
  locais,
  hoje,
  mostrarObservacao = false,
  mostrarPreco = false,
  submitLabel,
}: {
  acao: (prev: EstoqueState, formData: FormData) => Promise<EstoqueState>
  produtos: Produto[]
  unidades: Opt[] | null
  unidadeFixaNome?: string
  locais?: Opt[]
  hoje: string
  mostrarObservacao?: boolean
  mostrarPreco?: boolean
  submitLabel: string
}) {
  const [state, formAction, pending] = useActionState<EstoqueState, FormData>(acao, {})

  return (
    <Card>
      <form action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {unidades ? (
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
        ) : (
          <Field label="Unidade">
            <div className="rounded-lg bg-muted px-3 py-2 text-sm text-slate-600">{unidadeFixaNome}</div>
          </Field>
        )}

        <Field label="Produto" htmlFor="produto_id">
          <select id="produto_id" name="produto_id" required className={inputClass} defaultValue="">
            <option value="">Selecione…</option>
            {produtos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome} ({p.unidade_medida})
              </option>
            ))}
          </select>
        </Field>

        <Field label="Quantidade" htmlFor="quantidade">
          <input id="quantidade" name="quantidade" inputMode="decimal" required placeholder="0" className={inputClass} />
        </Field>

        {mostrarPreco && (
          <Field label="Preço unitário (R$)" htmlFor="preco_unitario" hint="Custo por unidade de medida">
            <input id="preco_unitario" name="preco_unitario" inputMode="decimal" placeholder="0,00" className={inputClass} />
          </Field>
        )}

        <Field label="Data" htmlFor="data">
          <input id="data" name="data" type="date" required defaultValue={hoje} className={inputClass} />
        </Field>

        {locais && (
          <Field label="Local / finalidade de uso" htmlFor="local_uso_id">
            <select id="local_uso_id" name="local_uso_id" className={inputClass} defaultValue="">
              <option value="">— não informado —</option>
              {locais.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nome}
                </option>
              ))}
            </select>
          </Field>
        )}

        {mostrarObservacao && (
          <Field label="Observação / fornecedor" htmlFor="observacao" hint="Opcional">
            <input id="observacao" name="observacao" className={inputClass} placeholder="Ex.: NF 123 — Fornecedor X" />
          </Field>
        )}

        <div className="sm:col-span-2">
          {state.erro && (
            <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{state.erro}</p>
          )}
          <button type="submit" disabled={pending} className={btnPrimary}>
            {pending ? 'Salvando…' : submitLabel}
          </button>
        </div>
      </form>
    </Card>
  )
}
