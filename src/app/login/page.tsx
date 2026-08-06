'use client'

import { useActionState } from 'react'
import { login, type LoginState } from './actions'

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    login,
    {},
  )

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-brand-dark px-4">
      {/* grafismos decorativos da marca */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/grafismo-1.svg"
        alt=""
        aria-hidden
        className="pointer-events-none absolute -left-16 -top-16 w-64 opacity-20"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/grafismo-2.svg"
        alt=""
        aria-hidden
        className="pointer-events-none absolute -bottom-20 -right-16 w-72 opacity-20"
      />

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-vertical.svg" alt="Lava Thru Car Wash" className="w-36 rounded-2xl" />
          <p className="mt-3 text-sm font-medium text-sky">Sistema de Gestão</p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-xl">
          <h1 className="mb-5 text-lg font-bold text-brand-dark">Entrar</h1>
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
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{state.erro}</p>
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
      </div>
    </main>
  )
}
