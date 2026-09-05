import Link from 'next/link'
import { requireModulo } from '@/lib/auth'
import { modulosDoUsuario } from '@/lib/permissoes'
import { createClient } from '@/lib/supabase/server'
import { PageHeader, Card, EmptyState, Badge, btnPrimary, inputClass } from '@/components/ui'
import { formatBRL, round2 } from '@/lib/money'
import { TURNO_LABEL, type Turno } from '@/lib/types'
import { DiasColapsaveis, type DiaView } from './DiasColapsaveis'

type SP = { unidade?: string; mes?: string }

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

function labelDia(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const semana = dt.toLocaleDateString('pt-BR', { weekday: 'long' })
  return `${semana.charAt(0).toUpperCase()}${semana.slice(1)}, ${dataBR(iso)}`
}

const SELECT =
  'id, data, data_hora, turno, maquina_cartao, sistema_dinheiro, sistema_pix, sistema_credito, sistema_debito, sistema_voucher, sistema_empresarial, diferenca_total, fechado_com_diferenca, unidade:unidades(nome), usuario:usuarios(nome)'

export default async function FechamentosPage({ searchParams }: { searchParams: Promise<SP> }) {
  const usuario = await requireModulo('fechamentos')
  const mods = await modulosDoUsuario(usuario)
  const verHistorico = mods.has('fechamentos_historico')
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
  const supabase = await createClient()

  // Sem acesso ao histórico: vê só o próprio fechamento do dia (sem filtros).
  if (!verHistorico) {
    const { data } = await supabase
      .from('fechamentos_caixa')
      .select(SELECT)
      .eq('usuario_id', usuario.id)
      .eq('data', hoje)
      .order('data_hora', { ascending: false })
    const fechamentos = (data ?? []) as Row[]
    return (
      <div>
        <PageHeader
          titulo="Fechamento de Caixa"
          descricao="Seu fechamento de hoje."
          acao={
            <Link href="/fechamentos/novo" className={btnPrimary}>
              + Novo fechamento
            </Link>
          }
        />
        {fechamentos.length === 0 ? (
          <EmptyState>
            Nenhum fechamento registrado hoje.
            <br />
            Clique em <strong>Novo fechamento</strong> para começar.
          </EmptyState>
        ) : (
          <ListaSimples fechamentos={fechamentos} />
        )}
      </div>
    )
  }

  // Com histórico: filtro por mês + unidade, agrupado por dia.
  const sp = await searchParams
  const mes = sp.mes && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : hoje.slice(0, 7)
  const [Y, M] = mes.split('-').map(Number)
  const mesInicio = `${mes}-01`
  const mesFim = `${mes}-${String(new Date(Y, M, 0).getDate()).padStart(2, '0')}`
  const mesLabel = new Date(Y, M - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  const unidadeFiltro = usuario.papel === 'admin' ? sp.unidade || '' : ''
  const unidades =
    usuario.papel === 'admin'
      ? (await supabase.from('unidades').select('id, nome').eq('ativo', true).order('nome')).data ?? []
      : []

  let q = supabase
    .from('fechamentos_caixa')
    .select(SELECT)
    .gte('data', mesInicio)
    .lte('data', mesFim)
    .order('data', { ascending: false })
    .order('data_hora', { ascending: false })
  if (unidadeFiltro) q = q.eq('unidade_id', unidadeFiltro)
  const { data } = await q
  const fechamentos = (data ?? []) as Row[]

  // Resumo do mês
  const totalMes = round2(fechamentos.reduce((s, f) => s + totalSistema(f), 0))
  const comDif = fechamentos.filter((f) => f.fechado_com_diferenca).length

  // Agrupa por dia (mantém ordem desc que veio do banco) e monta a visão do client.
  const porDia = new Map<string, Row[]>()
  for (const f of fechamentos) {
    const arr = porDia.get(f.data) ?? []
    arr.push(f)
    porDia.set(f.data, arr)
  }
  const diasView: DiaView[] = [...porDia.entries()].map(([dia, linhas]) => ({
    dia,
    label: labelDia(dia),
    total: round2(linhas.reduce((s, f) => s + totalSistema(f), 0)),
    comDiferenca: linhas.some((f) => f.fechado_com_diferenca),
    linhas: linhas.map((f) => ({
      id: f.id,
      manha: f.turno === 'manha',
      turnoLabel: TURNO_LABEL[f.turno] ?? f.turno,
      unidade: nome(f.unidade),
      usuario: nome(f.usuario),
      maquina: f.maquina_cartao ?? 'Rede/Sipag',
      total: totalSistema(f),
      comDif: f.fechado_com_diferenca,
      diferenca: f.diferenca_total,
    })),
  }))

  return (
    <div>
      <PageHeader
        titulo="Fechamento de Caixa"
        descricao="Histórico de fechamentos, por mês."
        acao={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/fechamentos/lavagens-dia" className="text-sm text-brand hover:underline">
              📋 Lavagens por dia
            </Link>
            <form method="get" className="flex flex-wrap items-center gap-2">
              {usuario.papel === 'admin' && (
                <select name="unidade" defaultValue={unidadeFiltro} className={inputClass}>
                  <option value="">Todas as unidades</option>
                  {unidades.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nome}
                    </option>
                  ))}
                </select>
              )}
              <input type="month" name="mes" defaultValue={mes} className={inputClass} />
              <button type="submit" className={btnPrimary}>
                Aplicar
              </button>
            </form>
            <Link href="/fechamentos/novo" className={btnPrimary}>
              + Novo fechamento
            </Link>
          </div>
        }
      />

      {fechamentos.length === 0 ? (
        <EmptyState>Nenhum fechamento em {mesLabel}.</EmptyState>
      ) : (
        <>
          {/* Resumo do mês */}
          <div className="mb-6 grid grid-cols-3 gap-3">
            <Card className="text-center">
              <p className="text-xs text-slate-500">Total do mês</p>
              <p className="text-lg font-bold text-brand-dark">{formatBRL(totalMes)}</p>
            </Card>
            <Card className="text-center">
              <p className="text-xs text-slate-500">Fechamentos</p>
              <p className="text-lg font-bold text-brand-dark">{fechamentos.length}</p>
            </Card>
            <Card className="text-center">
              <p className="text-xs text-slate-500">Com diferença</p>
              <p className={`text-lg font-bold ${comDif > 0 ? 'text-danger' : 'text-success'}`}>{comDif}</p>
            </Card>
          </div>

          <DiasColapsaveis dias={diasView} diaAberto={hoje} />
          <p className="mt-3 text-xs text-slate-400">Clique em um dia para expandir os fechamentos.</p>
        </>
      )}
    </div>
  )
}

function ListaSimples({ fechamentos }: { fechamentos: Row[] }) {
  return (
    <Card className="p-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
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
                <td className="px-5 py-3">
                  <Badge tone={f.turno === 'manha' ? 'warning' : 'neutral'}>
                    {TURNO_LABEL[f.turno] ?? f.turno}
                  </Badge>
                </td>
                <td className="px-5 py-3 text-slate-600">{nome(f.unidade)}</td>
                <td className="px-5 py-3 text-slate-600">{nome(f.usuario)}</td>
                <td className="px-5 py-3 text-slate-600">{f.maquina_cartao ?? 'Rede/Sipag'}</td>
                <td className="px-5 py-3 text-right font-medium text-slate-700">{formatBRL(totalSistema(f))}</td>
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
  )
}
