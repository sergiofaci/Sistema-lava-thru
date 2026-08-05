'use client'

import { useActionState, useState } from 'react'
import { criarUsuario, type NovoUsuarioState } from './actions'
import { Card, Field, inputClass, btnPrimary } from '@/components/ui'

type UnidadeOpt = { id: string; nome: string }

export function NovoUsuarioForm({ unidades }: { unidades: UnidadeOpt[] }) {
  const [state, formAction, pending] = useActionState<NovoUsuarioState, FormData>(
    criarUsuario,
    {},
  )
  const [papel, setPapel] = useState('caixa')
  const precisaUnidade = papel !== 'admin'

  return (
    <Card className="mb-6">
      <form action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Nome completo" htmlFor="nome">
          <input id="nome" name="nome" required className={inputClass} />
        </Field>
        <Field label="E-mail (login)" htmlFor="email">
          <input id="email" name="email" type="email" required className={inputClass} />
        </Field>
        <Field label="Senha inicial" htmlFor="senha" hint="Mínimo 6 caracteres.">
          <input id="senha" name="senha" type="text" required minLength={6} className={inputClass} />
        </Field>
        <Field label="Papel" htmlFor="papel">
          <select
            id="papel"
            name="papel"
            className={inputClass}
            value={papel}
            onChange={(e) => setPapel(e.target.value)}
          >
            <option value="caixa">Caixa/Colaborador</option>
            <option value="gerente">Gerente de Unidade</option>
            <option value="admin">Administrador (dono)</option>
          </select>
        </Field>
        <Field label="Unidade" htmlFor="unidade_id" hint={precisaUnidade ? undefined : 'Administrador acessa todas.'}>
          <select
            id="unidade_id"
            name="unidade_id"
            className={inputClass}
            required={precisaUnidade}
            disabled={!precisaUnidade}
          >
            <option value="">{precisaUnidade ? 'Selecione…' : '— todas —'}</option>
            {unidades.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome}
              </option>
            ))}
          </select>
        </Field>

        <div className="sm:col-span-2">
          {state.erro && (
            <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{state.erro}</p>
          )}
          {state.ok && (
            <p className="mb-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-success">{state.ok}</p>
          )}
          <button type="submit" disabled={pending} className={btnPrimary}>
            {pending ? 'Criando…' : 'Criar usuário'}
          </button>
        </div>
      </form>
    </Card>
  )
}
