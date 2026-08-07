import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireUsuario } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { PageHeader, Card, Badge } from '@/components/ui'
import { formatBRL } from '@/lib/money'
import { TURNO_LABEL, type Turno } from '@/lib/types'

const dtFmt = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function rel(r: unknown): string {
  if (!r) return '—'
  if (Array.isArray(r)) return (r[0] as { nome?: string })?.nome ?? '—'
  return (r as { nome?: string }).nome ?? '—'
}

export default async function DetalheFechamento({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireUsuario()
  const { id } = await params
  const supabase = await createClient()

  const { data: f } = await supabase
    .from('fechamentos_caixa')
    .select(
      '*, unidade:unidades(nome), usuario:usuarios(nome), lavagens:fechamento_lavagens(quantidade, tipo:tipos_lavagem(nome, ordem))',
    )
    .eq('id', id)
    .single()

  if (!f) notFound()

  const linhas = [
    { nome: 'Dinheiro', maq: null, sis: f.sistema_dinheiro, q: f.sistema_qtd_dinheiro, dif: null },
    { nome: 'Pix', maq: f.maquina_pix, sis: f.sistema_pix, q: f.sistema_qtd_pix, dif: f.diferenca_pix },
    { nome: 'Crédito', maq: f.maquina_credito, sis: f.sistema_credito, q: f.sistema_qtd_credito, dif: f.diferenca_credito },
    { nome: 'Débito', maq: f.maquina_debito, sis: f.sistema_debito, q: f.sistema_qtd_debito, dif: f.diferenca_debito },
    { nome: 'Voucher', maq: null, sis: f.sistema_voucher, q: f.sistema_qtd_voucher, dif: null },
    { nome: 'Empresarial a Prazo', maq: null, sis: f.sistema_empresarial ?? 0, q: f.sistema_qtd_empresarial ?? 0, dif: null },
  ]

  const totalSistema =
    f.sistema_dinheiro +
    f.sistema_pix +
    f.sistema_credito +
    f.sistema_debito +
    f.sistema_voucher +
    (f.sistema_empresarial ?? 0)

  type Lav = { quantidade: number; tipo: { nome: string; ordem: number } | { nome: string; ordem: number }[] | null }
  const lavagens = ((f.lavagens ?? []) as Lav[])
    .map((l) => ({
      quantidade: l.quantidade,
      nome: rel(l.tipo),
      ordem: Array.isArray(l.tipo) ? (l.tipo[0]?.ordem ?? 0) : (l.tipo?.ordem ?? 0),
    }))
    .sort((a, b) => a.ordem - b.ordem)

  return (
    <div className="max-w-4xl">
      <PageHeader
        titulo="Fechamento de Caixa"
        descricao={`${rel(f.unidade)} · Turno ${TURNO_LABEL[f.turno as Turno] ?? f.turno} · ${dtFmt.format(new Date(f.data_hora))}`}
        acao={
          <Link href="/fechamentos" className="text-sm text-brand hover:underline">
            ← Voltar
          </Link>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Info label="Colaborador" valor={rel(f.usuario)} />
        <Info label="Máquina" valor={f.maquina_cartao} />
        <Info label="Total sistema" valor={formatBRL(totalSistema)} />
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Diferença</p>
          <div className="mt-1">
            {f.fechado_com_diferenca ? (
              <Badge tone="danger">{formatBRL(f.diferenca_total)}</Badge>
            ) : (
              <Badge tone="success">Sem diferença</Badge>
            )}
          </div>
        </div>
      </div>

      <Card className="mb-6 p-0">
        <div className="border-b border-slate-200 px-5 py-3">
          <h2 className="font-semibold text-brand-dark">Conferência por forma de pagamento</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-5 py-2 font-medium">Forma</th>
                <th className="px-3 py-2 text-right font-medium">Máquina</th>
                <th className="px-3 py-2 text-right font-medium">Sistema</th>
                <th className="px-3 py-2 text-right font-medium">Qtd.</th>
                <th className="px-5 py-2 text-right font-medium">Diferença</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.nome} className="border-b border-slate-100 last:border-0">
                  <td className="px-5 py-2 font-medium text-slate-700">{l.nome}</td>
                  <td className="px-3 py-2 text-right text-slate-600">
                    {l.maq === null ? '—' : formatBRL(l.maq)}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-600">{formatBRL(l.sis)}</td>
                  <td className="px-3 py-2 text-right text-slate-600">{l.q}</td>
                  <td className="px-5 py-2 text-right font-medium">
                    {l.dif === null ? (
                      <span className="text-slate-300">—</span>
                    ) : Math.abs(l.dif) > 0.004 ? (
                      <span className="text-danger">{formatBRL(l.dif)}</span>
                    ) : (
                      <span className="text-success">OK</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-brand-dark">Lavagens por tipo</h2>
          <span className="rounded-lg bg-brand-light px-3 py-1 text-sm text-brand-dark">
            Kits vendidos: <strong>{f.kits_vendidos ?? 0}</strong>
          </span>
        </div>
        {lavagens.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma lavagem registrada.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {lavagens.map((l) => (
              <div key={l.nome} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                <span className="text-sm text-slate-600">{l.nome}</span>
                <span className="font-semibold text-brand-dark">{l.quantidade}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function Info({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-medium text-slate-700">{valor}</p>
    </div>
  )
}
