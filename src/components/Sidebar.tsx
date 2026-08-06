'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Papel } from '@/lib/types'

type Item = {
  href: string
  label: string
  papeis: Papel[] // quem enxerga
}

const ITENS: Item[] = [
  { href: '/', label: 'Dashboard', papeis: ['admin', 'gerente'] },
  { href: '/dre', label: 'DRE / Resultado', papeis: ['admin', 'gerente'] },
  { href: '/fechamentos', label: 'Fechamento de Caixa', papeis: ['admin', 'gerente', 'caixa'] },
  { href: '/contas', label: 'Contas a Pagar', papeis: ['admin', 'gerente'] },
  { href: '/estoque', label: 'Estoque e Consumo', papeis: ['admin', 'gerente'] },
]

const CADASTROS: Item[] = [
  { href: '/cadastros/unidades', label: 'Unidades', papeis: ['admin'] },
  { href: '/cadastros/usuarios', label: 'Usuários', papeis: ['admin'] },
  { href: '/cadastros/tipos-lavagem', label: 'Tipos de Lavagem', papeis: ['admin'] },
  { href: '/cadastros/centros-custo', label: 'Centros de Custo', papeis: ['admin'] },
  { href: '/cadastros/tipos-despesa', label: 'Tipos de Despesa', papeis: ['admin'] },
  { href: '/cadastros/produtos', label: 'Produtos', papeis: ['admin'] },
  { href: '/cadastros/locais-uso', label: 'Locais de Uso', papeis: ['admin'] },
]

function Grupo({
  titulo,
  itens,
  papel,
  pathname,
}: {
  titulo?: string
  itens: Item[]
  papel: Papel
  pathname: string
}) {
  const visiveis = itens.filter((i) => i.papeis.includes(papel))
  if (visiveis.length === 0) return null
  return (
    <div className="mb-6">
      {titulo && (
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-white/40">
          {titulo}
        </p>
      )}
      <nav className="space-y-1">
        {visiveis.map((i) => {
          const ativo = i.href === '/' ? pathname === '/' : pathname.startsWith(i.href)
          return (
            <Link
              key={i.href}
              href={i.href}
              className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
                ativo ? 'bg-brand text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              {i.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

export function Sidebar({ papel }: { papel: Papel }) {
  const pathname = usePathname()
  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-brand-dark px-4 py-6 md:flex">
      <div className="mb-8 flex justify-center px-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-vertical.svg" alt="Lava Thru Car Wash" className="w-28" />
      </div>
      <div className="flex-1 overflow-y-auto">
        <Grupo itens={ITENS} papel={papel} pathname={pathname} />
        <Grupo titulo="Cadastros" itens={CADASTROS} papel={papel} pathname={pathname} />
      </div>
    </aside>
  )
}
