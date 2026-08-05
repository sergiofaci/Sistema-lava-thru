import Link from 'next/link'

export default function SemPermissao() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-bold text-brand-dark">Acesso não autorizado</h1>
      <p className="text-slate-500">Você não tem permissão para acessar esta área.</p>
      <Link href="/" className="text-brand hover:underline">
        Voltar ao início
      </Link>
    </main>
  )
}
