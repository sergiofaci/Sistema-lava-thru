'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { Papel } from '@/lib/types'

// Regra de visibilidade por item: módulo liberado, admin, ou sempre.
type Leaf = { href: string; label: string; modulo?: string; admin?: boolean }
type Node = { kind: 'item'; item: Leaf } | { kind: 'group'; titulo: string; icone: string; itens: Leaf[] }

const NAV: Node[] = [
  {
    kind: 'group',
    titulo: 'Indicadores de Performance',
    icone: '📊',
    itens: [
      { href: '/painel', label: 'Painel de Metas' },
      { href: '/', label: 'Dashboard', modulo: 'dashboard' },
      { href: '/cadastros/metas-item', label: 'Metas (por item)', admin: true },
      { href: '/cadastros/orcamento', label: 'Orçamento de Despesas', admin: true },
      { href: '/cadastros/painel-metas', label: 'Painel de Metas (visibilidade)', admin: true },
    ],
  },
  {
    kind: 'group',
    titulo: 'Financeiro',
    icone: '💰',
    itens: [
      { href: '/dre', label: 'DRE / Resultado', modulo: 'dre' },
      { href: '/fechamentos', label: 'Fechamento de Caixa', modulo: 'fechamentos' },
      { href: '/contas', label: 'Contas a Pagar', modulo: 'contas' },
      { href: '/cadastros/faturamento-historico', label: 'Histórico de Faturamento', admin: true },
      { href: '/cadastros/centros-custo', label: 'Centros de Custo', admin: true },
      { href: '/cadastros/tipos-despesa', label: 'Tipos de Despesa', admin: true },
      { href: '/cadastros/fornecedores', label: 'Fornecedores', admin: true },
    ],
  },
  { kind: 'item', item: { href: '/estoque', label: '📦 Estoque e Consumo', modulo: 'estoque' } },
  {
    kind: 'group',
    titulo: 'Gestão Administrativa',
    icone: '⚙️',
    itens: [
      { href: '/bonificacoes', label: 'Bonificações', modulo: 'bonificacoes' },
      { href: '/cadastros/bonificacoes', label: 'Bonificações (regras)', admin: true },
    ],
  },
  {
    kind: 'group',
    titulo: 'Cadastros',
    icone: '🗂️',
    itens: [
      { href: '/cadastros/unidades', label: 'Unidades', admin: true },
      { href: '/cadastros/usuarios', label: 'Usuários', admin: true },
      { href: '/cadastros/colaboradores', label: 'Colaboradores', admin: true },
      { href: '/cadastros/permissoes', label: 'Permissões', admin: true },
      { href: '/cadastros/tipos-lavagem', label: 'Tipos de Lavagem', admin: true },
      { href: '/cadastros/processos', label: 'Processos das Lavagens', admin: true },
      { href: '/cadastros/lavagem-processos', label: 'Composição das Lavagens', admin: true },
      { href: '/cadastros/produtos', label: 'Produtos', admin: true },
      { href: '/cadastros/locais-uso', label: 'Locais de Uso', admin: true },
    ],
  },
]

function ehAtivo(href: string, pathname: string): boolean {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/')
}

function ItemLink({ href, label, pathname, nivel = 0 }: { href: string; label: string; pathname: string; nivel?: number }) {
  const ativo = ehAtivo(href, pathname)
  return (
    <Link
      href={href}
      className={`block rounded-lg py-2 text-sm font-medium transition ${nivel === 0 ? 'px-3' : 'px-3'} ${
        ativo ? 'bg-brand text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
      }`}
    >
      {label}
    </Link>
  )
}

export function Sidebar({ papel, modulos }: { papel: Papel; modulos: string[] }) {
  const pathname = usePathname()

  const visivel = (l: Leaf) => (l.modulo ? modulos.includes(l.modulo) : l.admin ? papel === 'admin' : true)

  // Grupos com pelo menos um item visível para este usuário.
  const grupos = NAV.flatMap((n) => (n.kind === 'group' ? [{ ...n, itens: n.itens.filter(visivel) }] : [])).filter(
    (g) => g.itens.length > 0,
  )
  const itensSoltos = NAV.flatMap((n) => (n.kind === 'item' && visivel(n.item) ? [n.item] : []))

  // Abre por padrão o grupo que contém a página atual.
  const grupoAtivo = (g: { itens: Leaf[] }) => g.itens.some((i) => ehAtivo(i.href, pathname))
  const [aberto, setAberto] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(grupos.map((g) => [g.titulo, grupoAtivo(g)])),
  )

  // Restaura o que o usuário deixou aberto/fechado da última vez.
  useEffect(() => {
    try {
      const raw = localStorage.getItem('sidebar-aberto')
      if (raw) setAberto((prev) => ({ ...prev, ...(JSON.parse(raw) as Record<string, boolean>) }))
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function toggle(titulo: string) {
    setAberto((prev) => {
      const next = { ...prev, [titulo]: !prev[titulo] }
      try {
        localStorage.setItem('sidebar-aberto', JSON.stringify(next))
      } catch {
        /* ignore */
      }
      return next
    })
  }

  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-brand-dark px-4 py-6 md:flex">
      <div className="mb-8 flex justify-center px-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-vertical.svg" alt="Lava Thru Car Wash" className="w-28" />
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto">
        {NAV.map((n) => {
          if (n.kind === 'item') {
            const item = itensSoltos.find((i) => i.href === n.item.href)
            return item ? <ItemLink key={item.href} href={item.href} label={item.label} pathname={pathname} /> : null
          }
          const g = grupos.find((x) => x.titulo === n.titulo)
          if (!g) return null
          const isOpen = aberto[g.titulo] ?? false
          return (
            <div key={g.titulo}>
              <button
                type="button"
                onClick={() => toggle(g.titulo)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white/50 transition hover:bg-white/5 hover:text-white/80"
              >
                <span>
                  <span className="mr-2">{g.icone}</span>
                  {g.titulo}
                </span>
                <span className={`text-[10px] transition-transform ${isOpen ? 'rotate-90' : ''}`}>▶</span>
              </button>
              {isOpen && (
                <nav className="mt-1 space-y-1 pl-1">
                  {g.itens.map((i) => (
                    <ItemLink key={i.href} href={i.href} label={i.label} pathname={pathname} nivel={1} />
                  ))}
                </nav>
              )}
            </div>
          )
        })}
      </div>
    </aside>
  )
}
