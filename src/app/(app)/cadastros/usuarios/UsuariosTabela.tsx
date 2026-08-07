'use client'

import { useActionState, useEffect, useState, useTransition } from 'react'
import { Card, EmptyState, Badge, Field, inputClass, btnPrimary, btnGhost } from '@/components/ui'
import { PAPEL_LABEL, type Papel } from '@/lib/types'
import { atualizarUsuario, alternarAtivoUsuario, excluirUsuario, type UsuarioState } from './actions'

type Row = {
  id: string
  nome: string
  email: string
  papel: Papel
  ativo: boolean
  unidadeId: string | null
  unidadeNome: string
}
type Unidade = { id: string; nome: string }

export function UsuariosTabela({
  usuarios,
  unidades,
  meId,
}: {
  usuarios: Row[]
  unidades: Unidade[]
  meId: string
}) {
  const [editando, setEditando] = useState<Row | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [erro, setErro] = useState('')
  const [pending, startTransition] = useTransition()

  function toggle(row: Row) {
    setErro('')
    setBusyId(row.id)
    const fd = new FormData()
    fd.set('id', row.id)
    fd.set('ativo', row.ativo ? '0' : '1')
    startTransition(async () => {
      const r = await alternarAtivoUsuario(fd)
      if (r?.erro) setErro(r.erro)
      setBusyId(null)
    })
  }

  function remover(row: Row) {
    if (!window.confirm(`Excluir o usuário "${row.nome}"? Esta ação não pode ser desfeita.`)) return
    setErro('')
    setBusyId(row.id)
    const fd = new FormData()
    fd.set('id', row.id)
    startTransition(async () => {
      const r = await excluirUsuario(fd)
      if (r?.erro) setErro(r.erro)
      setBusyId(null)
    })
  }

  if (usuarios.length === 0) return <EmptyState>Nenhum usuário cadastrado ainda.</EmptyState>

  return (
    <>
      {erro && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{erro}</p>}
      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="px-5 py-3 font-medium">Nome</th>
                <th className="px-5 py-3 font-medium">E-mail</th>
                <th className="px-5 py-3 font-medium">Papel</th>
                <th className="px-5 py-3 font-medium">Unidade</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => {
                const busy = busyId === u.id && pending
                const sou = u.id === meId
                return (
                  <tr key={u.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-5 py-3 font-medium text-slate-700">
                      {u.nome} {sou && <span className="text-xs text-slate-400">(você)</span>}
                    </td>
                    <td className="px-5 py-3 text-slate-500">{u.email}</td>
                    <td className="px-5 py-3 text-slate-500">{PAPEL_LABEL[u.papel]}</td>
                    <td className="px-5 py-3 text-slate-500">{u.unidadeNome}</td>
                    <td className="px-5 py-3">
                      {u.ativo ? <Badge tone="success">Ativo</Badge> : <Badge>Inativo</Badge>}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-3 whitespace-nowrap">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setEditando(u)}
                          className="text-brand hover:underline disabled:opacity-50"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          disabled={busy || sou}
                          title={sou ? 'Não é possível desativar o próprio usuário' : ''}
                          onClick={() => toggle(u)}
                          className="text-slate-600 hover:underline disabled:opacity-40"
                        >
                          {u.ativo ? 'Desativar' : 'Ativar'}
                        </button>
                        <button
                          type="button"
                          disabled={busy || sou}
                          title={sou ? 'Não é possível excluir o próprio usuário' : ''}
                          onClick={() => remover(u)}
                          className="text-danger hover:underline disabled:opacity-40"
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

      {editando && (
        <EditarUsuarioModal row={editando} unidades={unidades} onClose={() => setEditando(null)} />
      )}
    </>
  )
}

function EditarUsuarioModal({
  row,
  unidades,
  onClose,
}: {
  row: Row
  unidades: Unidade[]
  onClose: () => void
}) {
  const [state, action, pending] = useActionState<UsuarioState, FormData>(atualizarUsuario, {})
  const [papel, setPapel] = useState<Papel>(row.papel)
  const precisaUnidade = papel !== 'admin'

  useEffect(() => {
    if (state.ok) onClose()
  }, [state.ok, onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h3 className="mb-1 text-lg font-bold text-brand-dark">Editar usuário</h3>
        <p className="mb-4 text-sm text-slate-500">{row.email}</p>
        <form action={action} className="space-y-4">
          <input type="hidden" name="id" value={row.id} />
          <Field label="Nome completo" htmlFor="edit-nome">
            <input id="edit-nome" name="nome" required defaultValue={row.nome} className={inputClass} />
          </Field>
          <Field label="Papel" htmlFor="edit-papel">
            <select
              id="edit-papel"
              name="papel"
              className={inputClass}
              value={papel}
              onChange={(e) => setPapel(e.target.value as Papel)}
            >
              <option value="caixa">Caixa/Colaborador</option>
              <option value="gerente">Gerente de Unidade</option>
              <option value="admin">Administrador (dono)</option>
            </select>
          </Field>
          <Field
            label="Unidade"
            htmlFor="edit-unidade"
            hint={precisaUnidade ? undefined : 'Administrador acessa todas.'}
          >
            <select
              id="edit-unidade"
              name="unidade_id"
              className={inputClass}
              required={precisaUnidade}
              disabled={!precisaUnidade}
              defaultValue={row.unidadeId ?? ''}
            >
              <option value="">{precisaUnidade ? 'Selecione…' : '— todas —'}</option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </select>
          </Field>

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
