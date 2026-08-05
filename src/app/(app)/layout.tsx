import { redirect } from 'next/navigation'
import { requireUsuario } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/Sidebar'
import { PAPEL_LABEL } from '@/lib/types'

async function sair() {
  'use server'
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export default async function AppLayout({ children }: LayoutProps<'/'>) {
  const usuario = await requireUsuario()

  return (
    <div className="flex min-h-screen">
      <Sidebar papel={usuario.papel} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <div className="text-sm text-slate-500">
            {usuario.unidade ? (
              <span>
                Unidade: <span className="font-medium text-slate-700">{usuario.unidade.nome}</span>
              </span>
            ) : (
              <span className="font-medium text-slate-700">Todas as unidades</span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-700">{usuario.nome}</p>
              <p className="text-xs text-slate-400">{PAPEL_LABEL[usuario.papel]}</p>
            </div>
            <form action={sair}>
              <button
                type="submit"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
              >
                Sair
              </button>
            </form>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
