import Link from 'next/link'
import { requireUsuario } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { PageHeader, Card, EmptyState, Badge, btnPrimary } from '@/components/ui'
import { formatBRL, round2 } from '@/lib/money'

type Row = {
  id: string
  data: string
  data_hora: string
  maquina_cartao: string
  sistema_dinheiro: number
  sistema_pix: number
  sistema_credito: number
  sistema_debito: number
  sistema_voucher: number
  diferenca_total: number
  fechado_com_diferenca: boolean
  unidade: { nome: string } | { nome: string }[] | null
  usuario: { nome: string } | { nome: string }[] | null
}

function nome(rel: Row['unidade']): string {
  if (!rel) return '—'
  return Array.isArray(rel) ? (rel[0]?.nome ?? '—') : rel.nome
}

function totalSistema(r: Row): number {
  return round2(
    r.sistema_dinheiro + r.sistema_pix + r.sistema_credito + r.sistema_debito + r.sistema_voucher,
  )
}

const dataFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

export default async function FechamentosPage() {
  await requireUsuario()
  const supabase = await createClient()

  const { data } = await supabase
    .from('fechamentos_caixa')
    .select(
      'id, data, data_hora, maquina_cartao, sistema_dinheiro, sistema_pix, sistema_credito, sistema_debito, sistema_voucher, diferenca_total, fechado_com_diferenca, unidade:unidades(nome), usuario:usuarios(nome)',
    )
    .order('data_hora', { ascending: false })
    .limit(60)

  const fechamentos = (data ?? []) as Row[]

  return (
    <div>
      <PageHeader
        titulo="Fechamento de Caixa"
        descricao="Histórico de fechamentos da(s) unidade(s)."
        acao={
          <Link href="/fechamentos/novo" className={btnPrimary}>
            + Novo fechamento
          </Link>
        }
      />

      {fechamentos.length === 0 ? (
        <EmptyState>
          Nenhum fechamento registrado ainda.
          <br />
          Clique em <strong>Novo fechamento</strong> para começar.
        </EmptyState>
      ) : (
        <Card className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="px-5 py-3 font-medium">Data</th>
                  <th className="px-5 py-3 font-medium">Unidade</th>
                  <th className="px-5 py-3 font-medium">Colaborador</th>
                  <th className="px-5 py-3 font-medium">Máquina</th>
                  <th className="px-5 py-3 text-right font-medium">Total sistema</th>
                  <th className="px-5 py-3 font-medium">Diferença</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {fechamentos.map((f) => (
                  <tr key={f.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-5 py-3 text-slate-700">
                      {dataFmt.format(new Date(f.data_hora))}
                    </td>
                    <td className="px-5 py-3 text-slate-600">{nome(f.unidade)}</td>
                    <td className="px-5 py-3 text-slate-600">{nome(f.usuario)}</td>
                    <td className="px-5 py-3 text-slate-600">{f.maquina_cartao}</td>
                    <td className="px-5 py-3 text-right font-medium text-slate-700">
                      {formatBRL(totalSistema(f))}
                    </td>
                    <td className="px-5 py-3">
                      {f.fechado_com_diferenca ? (
                        <Badge tone="danger">{formatBRL(f.diferenca_total)}</Badge>
                      ) : (
                        <Badge tone="success">OK</Badge>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link href={`/fechamentos/${f.id}`} className="text-sm text-brand hover:underline">
                        Ver
                      </Link>
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
