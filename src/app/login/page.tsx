'use client'

import { useActionState } from 'react'
import { login, type LoginState } from './actions'

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    login,
    {},
  )

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-dark px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-brand text-2xl font-black text-white">
            LT
          </div>
          <h1 className="text-xl font-bold text-brand-dark">Lava Thru</h1>
          <p className="text-sm text-slate-500">Sistema de Gestão</p>
        </div>

        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
              E-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>

          <div>
            <label htmlFor="senha" className="mb-1 block text-sm font-medium text-slate-700">
              Senha
            </label>
            <input
              id="senha"
              name="senha"
              type="password"
              autoComplete="current-password"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>

          {state.erro && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">
              {state.erro}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white transition hover:bg-brand/90 disabled:opacity-60"
          >
            {pending ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </main>
  )
}
