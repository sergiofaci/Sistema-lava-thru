import Link from 'next/link'
import { requirePapel } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { PageHeader, Card, EmptyState, Badge, btnPrimary, btnGhost } from '@/components/ui'
import { formatQtd, formatBRL, round2 } from '@/lib/money'

function rel(r: unknown, campo = 'nome'): string {
  if (!r) return '—'
  const o = Array.isArray(r) ? r[0] : r
  return (o as Record<string, string>)?.[campo] ?? '—'
}
function relNum(r: unknown, campo: string): number {
  if (!r) return 0
  const o = Array.isArray(r) ? r[0] : r
  return Number((o as Record<string, number>)?.[campo] ?? 0)
}

function dataBR(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export default async function EstoquePage() {
  await requirePapel('admin', 'gerente')
  const supabase = await createClient()

  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
  const mesInicio = hoje.slice(0, 7) + '-01'

  const [saldoRes, entradasRes, saidasRes, consumoMesRes] = await Promise.all([
    supabase
      .from('estoque_saldo')
      .select('id, saldo_atual, custo_medio, produto:produtos(nome, unidade_medida, estoque_minimo, ativo), unidade:unidades(nome)'),
    supabase
      .from('estoque_entradas')
      .select('id, quantidade, preco_unitario, data, criado_em, produto:produtos(nome, unidade_medida), unidade:unidades(nome)')
      .order('criado_em', { ascending: false })
      .limit(15),
    supabase
      .from('estoque_saidas')
      .select('id, quantidade, valor_total, data, criado_em, produto:produtos(nome, unidade_medida), unidade:unidades(nome), local:locais_uso(nome)')
      .order('criado_em', { ascending: false })
      .limit(15),
    supabase
      .from('estoque_saidas')
      .select('valor_total')
      .gte('data', mesInicio)
      .lte('data', hoje),
  ])

  const consumoMes = round2(
    ((consumoMesRes.data ?? []) as { valor_total: number }[]).reduce((s, r) => s + (r.valor_total ?? 0), 0),
  )

  const saldos = (saldoRes.data ?? [])
    .map((s) => ({
      id: s.id,
      saldo: Number(s.saldo_atual),
      custo: Number(s.custo_medio ?? 0),
      valor: round2(Number(s.saldo_atual) * Number(s.custo_medio ?? 0)),
      produto: rel(s.produto),
      medida: rel(s.produto, 'unidade_medida'),
      minimo: relNum(s.produto, 'estoque_minimo'),
      ativo: Boolean((Array.isArray(s.produto) ? s.produto[0] : s.produto)?.ativo),
      unidade: rel(s.unidade),
    }))
    .filter((s) => s.ativo)
    .sort((a, b) => a.produto.localeCompare(b.produto))

  const baixos = saldos.filter((s) => s.minimo > 0 && s.saldo < s.minimo)
  const valorEstoque = round2(saldos.reduce((s, x) => s + x.valor, 0))

  const movimentos = [
    ...(entradasRes.data ?? []).map((e) => ({
      id: 'e' + e.id,
      tipo: 'Entrada' as const,
      quantidade: Number(e.quantidade),
      valor: round2(Number(e.quantidade) * Number(e.preco_unitario ?? 0)),
      data: e.data,
      criado_em: e.criado_em,
      produto: rel(e.produto),
      medida: rel(e.produto, 'unidade_medida'),
      unidade: rel(e.unidade),
      local: '—',
    })),
    ...(saidasRes.data ?? []).map((s) => ({
      id: 's' + s.id,
      tipo: 'Baixa' as const,
      quantidade: Number(s.quantidade),
      valor: Number(s.valor_total ?? 0),
      data: s.data,
      criado_em: s.criado_em,
      produto: rel(s.produto),
      medida: rel(s.produto, 'unidade_medida'),
      unidade: rel(s.unidade),
      local: rel(s.local),
    })),
  ]
    .sort((a, b) => (a.criado_em < b.criado_em ? 1 : -1))
    .slice(0, 15)

  return (
    <div>
      <PageHeader
        titulo="Estoque e Consumo"
        descricao="Saldo por unidade e movimentações."
        acao={
          <div className="flex gap-2">
            <Link href="/estoque/entrada" className={btnGhost}>
              + Entrada
            </Link>
            <Link href="/estoque/baixa" className={btnPrimary}>
              − Baixa
            </Link>
          </div>
        }
      />

      {/* Resumo de custo (contabilidade) */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-xs text-slate-500">Valor em estoque (custo médio)</p>
          <p className="mt-1 text-2xl font-bold text-brand-dark">{formatBRL(valorEstoque)}</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Custo do consumo no mês</p>
          <p className="mt-1 text-2xl font-bold text-brand">{formatBRL(consumoMes)}</p>
        </Card>
      </div>

      {/* Alerta de estoque baixo */}
      {baixos.length > 0 && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-warning">
            ⚠️ {baixos.length} produto(s) abaixo do estoque mínimo
          </p>
          <p className="mt-1 text-sm text-amber-700">
            {baixos
              .map((b) => `${b.produto} (${b.unidade}): ${formatQtd(b.saldo)} ${b.medida}`)
              .join(' · ')}
          </p>
        </div>
      )}

      {/* Saldo atual */}
      <Card className="mb-6 p-0">
        <div className="border-b border-slate-200 px-5 py-3">
          <h2 className="font-semibold text-brand-dark">Saldo atual</h2>
        </div>
        {saldos.length === 0 ? (
          <div className="p-6">
            <EmptyState>
              Nenhum saldo ainda. Registre uma <strong>entrada</strong> para começar.
            </EmptyState>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="px-5 py-3 font-medium">Produto</th>
                  <th className="px-5 py-3 font-medium">Unidade</th>
                  <th className="px-5 py-3 text-right font-medium">Saldo</th>
                  <th className="px-5 py-3 text-right font-medium">Mínimo</th>
                  <th className="px-5 py-3 text-right font-medium">Custo méd.</th>
                  <th className="px-5 py-3 text-right font-medium">Valor</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {saldos.map((s) => {
                  const baixo = s.minimo > 0 && s.saldo < s.minimo
                  return (
                    <tr
                      key={s.id}
                      className={`border-b border-slate-100 last:border-0 ${baixo ? 'bg-red-50' : ''}`}
                    >
                      <td className="px-5 py-3 font-medium text-slate-700">{s.produto}</td>
                      <td className="px-5 py-3 text-slate-600">{s.unidade}</td>
                      <td className={`px-5 py-3 text-right font-medium ${baixo ? 'text-danger' : 'text-slate-700'}`}>
                        {formatQtd(s.saldo)} {s.medida}
                      </td>
                      <td className="px-5 py-3 text-right text-slate-500">
                        {formatQtd(s.minimo)} {s.medida}
                      </td>
                      <td className="px-5 py-3 text-right text-slate-500">{formatBRL(s.custo)}</td>
                      <td className="px-5 py-3 text-right font-medium text-slate-700">{formatBRL(s.valor)}</td>
                      <td className="px-5 py-3">
                        {baixo ? <Badge tone="danger">Estoque baixo</Badge> : <Badge tone="success">OK</Badge>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Movimentações recentes */}
      <Card className="p-0">
        <div className="border-b border-slate-200 px-5 py-3">
          <h2 className="font-semibold text-brand-dark">Movimentações recentes</h2>
        </div>
        {movimentos.length === 0 ? (
          <div className="p-6">
            <EmptyState>Nenhuma movimentação registrada.</EmptyState>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="px-5 py-3 font-medium">Data</th>
                  <th className="px-5 py-3 font-medium">Tipo</th>
                  <th className="px-5 py-3 font-medium">Produto</th>
                  <th className="px-5 py-3 font-medium">Unidade</th>
                  <th className="px-5 py-3 font-medium">Local</th>
                  <th className="px-5 py-3 text-right font-medium">Qtd.</th>
                  <th className="px-5 py-3 text-right font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {movimentos.map((m) => (
                  <tr key={m.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-5 py-3 text-slate-700">{dataBR(m.data)}</td>
                    <td className="px-5 py-3">
                      {m.tipo === 'Entrada' ? (
                        <Badge tone="success">Entrada</Badge>
                      ) : (
                        <Badge tone="warning">Baixa</Badge>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-600">{m.produto}</td>
                    <td className="px-5 py-3 text-slate-600">{m.unidade}</td>
                    <td className="px-5 py-3 text-slate-500">{m.local}</td>
                    <td className="px-5 py-3 text-right font-medium text-slate-700">
                      {m.tipo === 'Baixa' ? '−' : '+'}
                      {formatQtd(m.quantidade)} {m.medida}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-600">
                      {m.valor > 0 ? formatBRL(m.valor) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
