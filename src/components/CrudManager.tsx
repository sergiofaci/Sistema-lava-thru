'use client'

import { useActionState, useEffect, useRef, useState, useTransition } from 'react'
import {
  PageHeader,
  Card,
  Field,
  inputClass,
  btnPrimary,
  btnGhost,
  EmptyState,
  Badge,
} from '@/components/ui'

export type CrudField = {
  name: string
  label: string
  type?: 'text' | 'number' | 'select'
  options?: { value: string; label: string }[]
  required?: boolean
  placeholder?: string
  hint?: string
  defaultValue?: string | number
}

export type CrudRow = { id: string; ativo: boolean } & Record<string, unknown>

type Estado = { ok?: string; erro?: string }
type ActionState = (prev: Estado, fd: FormData) => Promise<Estado>
type ActionPlain = (fd: FormData) => Promise<Estado | void>

function Inputs({
  fields,
  row,
  idPrefix,
}: {
  fields: CrudField[]
  row?: CrudRow
  idPrefix: string
}) {
  return (
    <>
      {fields.map((f) => {
        const id = `${idPrefix}-${f.name}`
        const val = (row?.[f.name] ?? f.defaultValue ?? '') as string | number
        return (
          <Field key={f.name} label={f.label} htmlFor={id} hint={f.hint}>
            {f.type === 'select' ? (
              <select id={id} name={f.name} required={f.required} className={inputClass} defaultValue={String(val)}>
                {!f.required && <option value="">—</option>}
                {(f.options ?? []).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={id}
                name={f.name}
                type={f.type === 'number' ? 'number' : 'text'}
                step={f.type === 'number' ? 'any' : undefined}
                required={f.required}
                placeholder={f.placeholder}
                defaultValue={String(val)}
                className={inputClass}
              />
            )}
          </Field>
        )
      })}
    </>
  )
}

export function CrudManager({
  titulo,
  descricao,
  fields,
  itens,
  criar,
  atualizar,
  alternarAtivo,
  excluir,
}: {
  titulo: string
  descricao?: string
  fields: CrudField[]
  itens: CrudRow[]
  criar: ActionState
  atualizar: ActionState
  alternarAtivo: ActionPlain
  excluir: ActionPlain
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [criarState, criarAction, criando] = useActionState<Estado, FormData>(criar, {})
  const [editando, setEditando] = useState<CrudRow | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [linhaErro, setLinhaErro] = useState<string>('')
  const [pending, startTransition] = useTransition()

  // limpa o formulário quando cria com sucesso
  useEffect(() => {
    if (criarState.ok) formRef.current?.reset()
  }, [criarState.ok])

  function toggle(id: string, ativo: boolean) {
    setLinhaErro('')
    setBusyId(id)
    const fd = new FormData()
    fd.set('id', id)
    fd.set('ativo', ativo ? '0' : '1')
    startTransition(async () => {
      const r = await alternarAtivo(fd)
      if (r && 'erro' in r && r.erro) setLinhaErro(r.erro)
      setBusyId(null)
    })
  }

  function remover(id: string, rotulo: string) {
    if (!window.confirm(`Excluir "${rotulo}"? Esta ação não pode ser desfeita.`)) return
    setLinhaErro('')
    setBusyId(id)
    const fd = new FormData()
    fd.set('id', id)
    startTransition(async () => {
      const r = await excluir(fd)
      if (r && 'erro' in r && r.erro) setLinhaErro(r.erro)
      setBusyId(null)
    })
  }

  const primeiro = fields[0]?.name ?? 'nome'

  return (
    <div className="max-w-4xl">
      <PageHeader titulo={titulo} descricao={descricao} />

      {/* criar */}
      <Card className="mb-6">
        <form ref={formRef} action={criarAction} className="flex flex-wrap items-end gap-3">
          <div className="flex flex-1 flex-wrap items-end gap-3">
            <Inputs fields={fields} idPrefix="novo" />
          </div>
          <button type="submit" disabled={criando} className={btnPrimary}>
            {criando ? 'Salvando…' : 'Adicionar'}
          </button>
        </form>
        {criarState.ok && (
          <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-success">✓ {criarState.ok}</p>
        )}
        {criarState.erro && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{criarState.erro}</p>
        )}
      </Card>

      {linhaErro && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{linhaErro}</p>
      )}

      {itens.length === 0 ? (
        <EmptyState>Nenhum registro cadastrado ainda.</EmptyState>
      ) : (
        <Card className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  {fields.map((f) => (
                    <th key={f.name} className="px-5 py-3 font-medium">
                      {f.label}
                    </th>
                  ))}
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((row) => {
                  const busy = busyId === row.id && pending
                  return (
                    <tr key={row.id} className="border-b border-slate-100 last:border-0">
                      {fields.map((f) => (
                        <td key={f.name} className="px-5 py-3 text-slate-700">
                          {f.type === 'select'
                            ? f.options?.find((o) => String(o.value) === String(row[f.name]))?.label ??
                              String(row[f.name] ?? '—')
                            : String(row[f.name] ?? '—')}
                        </td>
                      ))}
                      <td className="px-5 py-3">
                        {row.ativo ? <Badge tone="success">Ativo</Badge> : <Badge>Inativo</Badge>}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-3 whitespace-nowrap">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setEditando(row)}
                            className="text-brand hover:underline disabled:opacity-50"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => toggle(row.id, row.ativo)}
                            className="text-slate-600 hover:underline disabled:opacity-50"
                          >
                            {row.ativo ? 'Desativar' : 'Ativar'}
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => remover(row.id, String(row[primeiro] ?? ''))}
                            className="text-danger hover:underline disabled:opacity-50"
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {editando && (
        <EditarModal
          fields={fields}
          row={editando}
          atualizar={atualizar}
          onClose={() => setEditando(null)}
        />
      )}
    </div>
  )
}

function EditarModal({
  fields,
  row,
  atualizar,
  onClose,
}: {
  fields: CrudField[]
  row: CrudRow
  atualizar: ActionState
  onClose: () => void
}) {
  const [state, action, pending] = useActionState<Estado, FormData>(atualizar, {})
  useEffect(() => {
    if (state.ok) onClose()
  }, [state.ok, onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h3 className="mb-4 text-lg font-bold text-brand-dark">Editar</h3>
        <form action={action} className="space-y-4">
          <input type="hidden" name="id" value={row.id} />
          <Inputs fields={fields} row={row} idPrefix={`edit-${row.id}`} />
          {state.erro && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{state.erro}</p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={pending} className={btnGhost}>
              Cancelar
            </button>
            <button type="submit" disabled={pending} className={btnPrimary}>
              {pending ? 'Salvando…' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
