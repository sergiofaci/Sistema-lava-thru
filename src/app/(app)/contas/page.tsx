import Link from 'next/link'
import { requireModulo } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { PageHeader, Card, EmptyState, btnPrimary, btnGhost, inputClass } from '@/components/ui'
import { formatBRL, round2 } from '@/lib/money'
import { ORIGENS_PAGAMENTO } from '@/lib/types'
import { toCSV } from '@/lib/csv'
import { ExportBar } from '@/components/ExportBar'
import { AcoesConta } from './AcoesConta'

const brl = (n: number) => n.toFixed(2).replace('.', ',')

type SP = {
  unidade?: string
  centro?: string
  tipo?: string
  origem?: string
  de?: string
  ate?: string
}

type Row = {
  id: string
  data: string
  numero_nota: string | null
  valor: number
  origem_pagamento: string
  unidade_id: string
  centro_custo_id: string
  tipo_despesa_id: string
  unidade: { nome: string } | { nome: string }[] | null
  centro: { nome: string } | { nome: string }[] | null
  tipo: { nome: string } | { nome: string }[] | null
}

function rel(r: unknown): string {
  if (!r) return '—'
  if (Array.isArray(r)) return (r[0] as { nome?: string })?.nome ?? '—'
  return (r as { nome?: string }).nome ?? '—'
}

function dataBR(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export default async function ContasPage({ searchParams }: { searchParams: Promise<SP> }) {
  const usuario = await requireModulo('contas')
  const sp = await searchParams
  const supabase = await createClient()

  const [{ data: centros }, { data: tipos }, unidadesRes] = await Promise.all([
    supabase.from('centros_custo').select('id, nome').eq('ativo', true).order('nome'),
    supabase.from('tipos_despesa').select('id, nome').eq('ativo', true).order('nome'),
    usuario.papel === 'admin'
      ? supabase.from('unidades').select('id, nome').eq('ativo', true).order('nome')
      : Promise.resolve({ data: null }),
  ])
  const unidades = unidadesRes.data

  let q = supabase
    .from('contas_pagas')
    .select(
      'id, data, numero_nota, valor, origem_pagamento, unidade_id, centro_custo_id, tipo_despesa_id, unidade:unidades(nome), centro:centros_custo(nome), tipo:tipos_despesa(nome)',
    )
    .order('data', { ascending: false })
    .limit(300)

  if (sp.unidade) q = q.eq('unidade_id', sp.unidade)
  if (sp.centro) q = q.eq('centro_custo_id', sp.centro)
  if (sp.tipo) q = q.eq('tipo_despesa_id', sp.tipo)
  if (sp.origem) q = q.eq('origem_pagamento', sp.origem)
  if (sp.de) q = q.gte('data', sp.de)
  if (sp.ate) q = q.lte('data', sp.ate)

  const { data } = await q
  const contas = (data ?? []) as Row[]
  const total = round2(contas.reduce((s, c) => s + c.valor, 0))

  const csv = toCSV([
    ['Data', 'Unidade', 'Centro de custo', 'Tipo de despesa', 'Nota', 'Origem', 'Valor'],
    ...contas.map((c) => [
      dataBR(c.data),
      rel(c.unidade),
      rel(c.centro),
      rel(c.tipo),
      c.numero_nota ?? '',
      c.origem_pagamento,
      brl(c.valor),
    ]),
    ['', '', '', '', '', 'TOTAL', brl(total)],
  ])

  return (
    <div>
      <PageHeader
        titulo="Contas a Pagar"
        descricao="Despesas pagas por unidade."
        acao={
          <div className="flex flex-wrap items-center gap-2">
            <ExportBar csv={csv} filename="contas-a-pagar" />
            <Link href="/contas/nova" className={btnPrimary}>
              + Novo pagamento
            </Link>
          </div>
        }
      />

      {/* Filtros */}
      <Card className="mb-6">
        <form method="get" className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {unidades && (
            <select name="unidade" defaultValue={sp.unidade ?? ''} className={inputClass}>
              <option value="">Todas unidades</option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </select>
          )}
          <select name="centro" defaultValue={sp.centro ?? ''} className={inputClass}>
            <option value="">Todos centros</option>
            {(centros ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
          <select name="tipo" defaultValue={sp.tipo ?? ''} className={inputClass}>
            <option value="">Todos tipos</option>
            {(tipos ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>
          <select name="origem" defaultValue={sp.origem ?? ''} className={inputClass}>
            <option value="">Todas origens</option>
            {ORIGENS_PAGAMENTO.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          <input type="date" name="de" defaultValue={sp.de ?? ''} className={inputClass} title="De" />
          <input type="date" name="ate" defaultValue={sp.ate ?? ''} className={inputClass} title="Até" />
          <div className="flex gap-2 sm:col-span-3 lg:col-span-6">
            <button type="submit" className={btnPrimary}>
              Filtrar
            </button>
            <Link href="/contas" className={btnGhost}>
              Limpar
            </Link>
          </div>
        </form>
      </Card>

      {/* Resumo */}
      <div className="mb-6">
        <Card>
          <p className="text-xs text-slate-500">Total no filtro atual</p>
          <p className="mt-1 text-2xl font-bold text-brand-dark">{formatBRL(total)}</p>
          <p className="text-xs text-slate-400">{contas.length} lançamento(s)</p>
        </Card>
      </div>

      {contas.length === 0 ? (
        <EmptyState>Nenhum pagamento encontrado para o filtro.</EmptyState>
      ) : (
        <Card className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="px-5 py-3 font-medium">Data</th>
                  <th className="px-5 py-3 font-medium">Unidade</th>
                  <th className="px-5 py-3 font-medium">Centro</th>
                  <th className="px-5 py-3 font-medium">Tipo</th>
                  <th className="px-5 py-3 font-medium">Nota</th>
                  <th className="px-5 py-3 font-medium">Origem</th>
                  <th className="px-5 py-3 text-right font-medium">Valor</th>
                  <th className="no-print px-5 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {contas.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-5 py-3 text-slate-700">{dataBR(c.data)}</td>
                    <td className="px-5 py-3 text-slate-600">{rel(c.unidade)}</td>
                    <td className="px-5 py-3 text-slate-600">{rel(c.centro)}</td>
                    <td className="px-5 py-3 text-slate-600">{rel(c.tipo)}</td>
                    <td className="px-5 py-3 text-slate-500">{c.numero_nota ?? '—'}</td>
                    <td className="px-5 py-3 text-slate-600">{c.origem_pagamento}</td>
                    <td className="px-5 py-3 text-right font-medium text-slate-700">
                      {formatBRL(c.valor)}
                    </td>
                    <td className="no-print px-5 py-3">
                      <AcoesConta
                        conta={{
                          id: c.id,
                          unidade_id: c.unidade_id,
                          centro_custo_id: c.centro_custo_id,
                          tipo_despesa_id: c.tipo_despesa_id,
                          data: c.data,
                          numero_nota: c.numero_nota,
                          valor: c.valor,
                        }}
                        centros={centros ?? []}
                        tipos={tipos ?? []}
                        unidades={unidades ?? null}
                        origem={c.origem_pagamento}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
