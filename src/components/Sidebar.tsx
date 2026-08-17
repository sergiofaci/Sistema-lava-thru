'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Papel } from '@/lib/types'

type Item = { href: string; label: string; modulo: string }

const ITENS: Item[] = [
  { href: '/', label: 'Dashboard', modulo: 'dashboard' },
  { href: '/dre', label: 'DRE / Resultado', modulo: 'dre' },
  { href: '/fechamentos', label: 'Fechamento de Caixa', modulo: 'fechamentos' },
  { href: '/contas', label: 'Contas a Pagar', modulo: 'contas' },
  { href: '/estoque', label: 'Estoque e Consumo', modulo: 'estoque' },
  { href: '/bonificacoes', label: 'Bonificações', modulo: 'bonificacoes' },
]

const CADASTROS = [
  { href: '/cadastros/unidades', label: 'Unidades' },
  { href: '/cadastros/usuarios', label: 'Usuários' },
  { href: '/cadastros/colaboradores', label: 'Colaboradores' },
  { href: '/cadastros/permissoes', label: 'Permissões' },
  { href: '/cadastros/tipos-lavagem', label: 'Tipos de Lavagem' },
  { href: '/cadastros/processos', label: 'Processos das Lavagens' },
  { href: '/cadastros/lavagem-processos', label: 'Composição das Lavagens' },
  { href: '/cadastros/bonificacoes', label: 'Bonificações (regras)' },
  { href: '/cadastros/faturamento-historico', label: 'Histórico de Faturamento' },
  { href: '/cadastros/metas-item', label: 'Metas (por item)' },
  { href: '/cadastros/painel-metas', label: 'Painel de Metas (visibilidade)' },
  { href: '/cadastros/centros-custo', label: 'Centros de Custo' },
  { href: '/cadastros/tipos-despesa', label: 'Tipos de Despesa' },
  { href: '/cadastros/fornecedores', label: 'Fornecedores' },
  { href: '/cadastros/produtos', label: 'Produtos' },
  { href: '/cadastros/locais-uso', label: 'Locais de Uso' },
]

function ItemLink({ href, label, pathname }: { href: string; label: string; pathname: string }) {
  const ativo = href === '/' ? pathname === '/' : pathname.startsWith(href)
  return (
    <Link
      href={href}
      className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
        ativo ? 'bg-brand text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
      }`}
    >
      {label}
    </Link>
  )
}

export function Sidebar({ papel, modulos }: { papel: Papel; modulos: string[] }) {
  const pathname = usePathname()
  const visiveis = ITENS.filter((i) => modulos.includes(i.modulo))

  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-brand-dark px-4 py-6 md:flex">
      <div className="mb-8 flex justify-center px-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-vertical.svg" alt="Lava Thru Car Wash" className="w-28" />
      </div>
      <div className="flex-1 overflow-y-auto">
        <nav className="mb-6 space-y-1">
          <ItemLink href="/painel" label="📊 Painel de Metas" pathname={pathname} />
          {visiveis.map((i) => (
            <ItemLink key={i.href} href={i.href} label={i.label} pathname={pathname} />
          ))}
        </nav>

        {papel === 'admin' && (
          <div>
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-white/40">
              Cadastros
            </p>
            <nav className="space-y-1">
              {CADASTROS.map((i) => (
                <ItemLink key={i.href} href={i.href} label={i.label} pathname={pathname} />
              ))}
            </nav>
          </div>
        )}
      </div>
    </aside>
  )
}
