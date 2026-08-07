import Link from 'next/link'
import { requireModulo } from '@/lib/auth'
import { modulosDoUsuario } from '@/lib/permissoes'
import { createClient } from '@/lib/supabase/server'
import { PageHeader, Card, EmptyState, Badge, btnPrimary } from '@/components/ui'
import { formatBRL, round2 } from '@/lib/money'
import { TURNO_LABEL, type Turno } from '@/lib/types'

type Row = {
  id: string
  data: string
  data_hora: string
  turno: Turno
  maquina_cartao: string | null
  sistema_dinheiro: number
  sistema_pix: number
  sistema_credito: number
  sistema_debito: number
  sistema_voucher: number
  sistema_empresarial: number
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
    r.sistema_dinheiro +
      r.sistema_pix +
      r.sistema_credito +
      r.sistema_debito +
      r.sistema_voucher +
      (r.sistema_empresarial ?? 0),
  )
}

function dataBR(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export default async function FechamentosPage() {
  const usuario = await requireModulo('fechamentos')
  const mods = await modulosDoUsuario(usuario)
  const verHistorico = mods.has('fechamentos_historico')
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
  const supabase = await createClient()

  let q = supabase
    .from('fechamentos_caixa')
    .select(
      'id, data, data_hora, turno, maquina_cartao, sistema_dinheiro, sistema_pix, sistema_credito, sistema_debito, sistema_voucher, sistema_empresarial, diferenca_total, fechado_com_diferenca, unidade:unidades(nome), usuario:usuarios(nome)',
    )
    .order('data', { ascending: false })
    .order('data_hora', { ascending: false })
    .limit(60)

  // Sem acesso ao histórico: vê só o próprio fechamento do dia.
  if (!verHistorico) q = q.eq('usuario_id', usuario.id).eq('data', hoje)

  const { data } = await q
  const fechamentos = (data ?? []) as Row[]

  return (
    <div>
      <PageHeader
        titulo="Fechamento de Caixa"
        descricao={verHistorico ? 'Histórico de fechamentos.' : 'Seu fechamento de hoje.'}
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
                  <th className="px-5 py-3 font-medium">Turno</th>
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
                    <td className="px-5 py-3 text-slate-700">{dataBR(f.data)}</td>
                    <td className="px-5 py-3">
                      <Badge tone={f.turno === 'manha' ? 'warning' : 'neutral'}>
                        {TURNO_LABEL[f.turno] ?? f.turno}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{nome(f.unidade)}</td>
                    <td className="px-5 py-3 text-slate-600">{nome(f.usuario)}</td>
                    <td className="px-5 py-3 text-slate-600">{f.maquina_cartao ?? 'Rede/Sipag'}</td>
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
