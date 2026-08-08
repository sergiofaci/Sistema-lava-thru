import { requireModulo } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { PageHeader, Card, inputClass, btnPrimary, EmptyState } from '@/components/ui'
import { formatBRL, round2 } from '@/lib/money'
import { TURNO_LABEL } from '@/lib/types'
import { toCSV } from '@/lib/csv'
import { ExportBar } from '@/components/ExportBar'

type SP = { unidade?: string; mes?: string }

// Bônus por lavagem/serviço vêm da tabela bonificacao_regras (configurável).
// As regras globais abaixo seguem fixas (ticket médio, kits, gerente).
const ASSINATURA = 'Assinatura Mensal' // excluída do ticket médio
const RATE_KIT = 2.5
const KIT_MIN = 60

function ticketBonus(t: number): number {
  if (t > 60) return 250
  if (t > 59) return 200
  if (t > 58) return 150
  if (t > 57) return 100
  return 0
}
function gerentePct(meses: number): number {
  if (meses <= 12) return 0.5
  if (meses <= 24) return 0.6
  if (meses <= 36) return 0.7
  if (meses <= 48) return 0.8
  return 0.9
}
function rel(r: unknown, campo = 'nome'): string {
  if (!r) return '—'
  const o = Array.isArray(r) ? r[0] : r
  return (o as Record<string, string>)?.[campo] ?? '—'
}

type Lav = { quantidade: number; tipo: unknown }
type Fech = {
  turno: string
  usuario_id: string
  kits_vendidos: number
  sistema_dinheiro: number
  sistema_pix: number
  sistema_credito: number
  sistema_debito: number
  sistema_voucher: number
  sistema_empresarial: number
  usuario: unknown
  lavagens: Lav[]
}
function faturamento(f: Fech): number {
  return (
    f.sistema_dinheiro +
    f.sistema_pix +
    f.sistema_credito +
    f.sistema_debito +
    f.sistema_voucher +
    (f.sistema_empresarial ?? 0)
  )
}

export default async function BonificacoesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const usuario = await requireModulo('bonificacoes')
  const sp = await searchParams
  const supabase = await createClient()

  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
  const mes = sp.mes && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : hoje.slice(0, 7)
  const [Y, M] = mes.split('-').map(Number)
  const mesInicio = `${mes}-01`
  const mesFim = `${mes}-${String(new Date(Y, M, 0).getDate()).padStart(2, '0')}`

  const unidadeId = usuario.papel === 'admin' ? sp.unidade || '' : usuario.unidade_id || ''
  const unidades =
    usuario.papel === 'admin'
      ? (await supabase.from('unidades').select('id, nome').eq('ativo', true).order('nome')).data ?? []
      : []
  const mesLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(
    new Date(Y, M - 1, 1),
  )

  const filtro = (
    <form method="get" className="flex flex-wrap items-center gap-2">
      {usuario.papel === 'admin' && (
        <select name="unidade" defaultValue={unidadeId} className={inputClass}>
          <option value="">Selecione a unidade…</option>
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
  )

  if (!unidadeId) {
    return (
      <div>
        <PageHeader titulo="Bonificações" descricao="Selecione uma unidade e o mês." acao={filtro} />
        <EmptyState>Selecione uma unidade para calcular as bonificações.</EmptyState>
      </div>
    )
  }

  const [{ data: fechData }, { data: colabData }, { data: regrasData }] = await Promise.all([
    supabase
      .from('fechamentos_caixa')
      .select(
        'turno, usuario_id, kits_vendidos, sistema_dinheiro, sistema_pix, sistema_credito, sistema_debito, sistema_voucher, sistema_empresarial, usuario:usuarios(nome), lavagens:fechamento_lavagens(quantidade, tipo:tipos_lavagem(id, nome, categoria))',
      )
      .eq('unidade_id', unidadeId)
      .gte('data', mesInicio)
      .lte('data', mesFim),
    supabase
      .from('colaboradores')
      .select('nome, cargo, turno, data_admissao')
      .eq('unidade_id', unidadeId)
      .eq('ativo', true),
    supabase.from('bonificacao_regras').select('tipo_lavagem_id, cargo, valor, rateio').eq('ativo', true),
  ])

  const fechs = (fechData ?? []) as Fech[]
  const colabs = (colabData ?? []) as {
    nome: string
    cargo: string
    turno: string
    data_admissao: string | null
  }[]
  const regras = (regrasData ?? []) as {
    tipo_lavagem_id: string
    cargo: string
    valor: number
    rateio: string
  }[]

  // Agregações da unidade — por tipo de lavagem (id)
  let fatTotal = 0
  const tipoInfo = new Map<string, { nome: string; categoria: string }>()
  const washByTipo = new Map<string, number>()
  const washByTipoTurno = new Map<string, number>() // chave `${tipoId}:${turno}`
  const porCaixa = new Map<
    string,
    { nome: string; fat: number; kits: number; wash: Map<string, number> }
  >()

  for (const f of fechs) {
    const fat = faturamento(f)
    fatTotal += fat
    const c = porCaixa.get(f.usuario_id) ?? { nome: rel(f.usuario), fat: 0, kits: 0, wash: new Map() }
    c.fat += fat
    c.kits += f.kits_vendidos ?? 0
    for (const l of f.lavagens ?? []) {
      const id = rel(l.tipo, 'id')
      if (id === '—') continue
      tipoInfo.set(id, { nome: rel(l.tipo), categoria: rel(l.tipo, 'categoria') })
      washByTipo.set(id, (washByTipo.get(id) ?? 0) + l.quantidade)
      c.wash.set(id, (c.wash.get(id) ?? 0) + l.quantidade)
      if (f.turno === 'manha' || f.turno === 'tarde') {
        const k = `${id}:${f.turno}`
        washByTipoTurno.set(k, (washByTipoTurno.get(k) ?? 0) + l.quantidade)
      }
    }
    porCaixa.set(f.usuario_id, c)
  }

  const ehServico = (id: string) => tipoInfo.get(id)?.categoria === 'servico'
  const ehAssinatura = (id: string) => tipoInfo.get(id)?.nome === ASSINATURA
  let totalLavagens = 0
  let servicosTotal = 0
  for (const [id, q] of washByTipo) ehServico(id) ? (servicosTotal += q) : (totalLavagens += q)

  const regrasCaixa = regras.filter((r) => r.cargo === 'caixa')
  const regrasMaquina = regras.filter((r) => r.cargo === 'aux_maquina')
  const regrasLimpeza = regras.filter((r) => r.cargo === 'aux_limpeza')

  // "Veículos túnel" = soma das quantidades dos tipos com regra de máquina
  const tiposMaquina = new Set(regrasMaquina.map((r) => r.tipo_lavagem_id))
  const tunelTotal = [...tiposMaquina].reduce((s, id) => s + (washByTipo.get(id) ?? 0), 0)
  const kitsTotal = fechs.reduce((s, f) => s + (f.kits_vendidos ?? 0), 0)

  // ---- Caixa (bônus individual por lavagem, de quem fechou) -----------
  const caixas = [...porCaixa.values()].map((c) => {
    const bonusLavagens = round2(
      regrasCaixa.reduce((s, r) => s + (c.wash.get(r.tipo_lavagem_id) ?? 0) * Number(r.valor), 0),
    )
    let lavagensTicket = 0
    for (const [id, q] of c.wash) if (!ehServico(id) && !ehAssinatura(id)) lavagensTicket += q
    const ticket = lavagensTicket > 0 ? round2(c.fat / lavagensTicket) : 0
    const bonusTicket = ticketBonus(ticket)
    const bonusKits = c.kits > KIT_MIN ? round2((c.kits - KIT_MIN) * RATE_KIT) : 0
    const total = round2(bonusLavagens + bonusTicket + bonusKits)
    return { nome: c.nome, bonusLavagens, ticket, bonusTicket, kits: c.kits, bonusKits, total }
  })
  const totalCaixa = round2(caixas.reduce((s, c) => s + c.total, 0))

  // ---- Aux. Máquina (pool da unidade) ---------------------------------
  const auxMaquina = colabs.filter((c) => c.cargo === 'aux_maquina')
  const poolMaquina = round2(
    regrasMaquina.reduce((s, r) => s + (washByTipo.get(r.tipo_lavagem_id) ?? 0) * Number(r.valor), 0),
  )
  const porPessoaMaquina = auxMaquina.length > 0 ? round2(poolMaquina / auxMaquina.length) : 0

  // ---- Aux. Limpeza (pool por turno) ----------------------------------
  const auxLimpeza = colabs.filter((c) => c.cargo === 'aux_limpeza')
  const limpezaTurnos = (['manha', 'tarde'] as const).map((t) => {
    const qtd = regrasLimpeza.reduce((s, r) => s + (washByTipoTurno.get(`${r.tipo_lavagem_id}:${t}`) ?? 0), 0)
    const pool = round2(
      regrasLimpeza.reduce((s, r) => s + (washByTipoTurno.get(`${r.tipo_lavagem_id}:${t}`) ?? 0) * Number(r.valor), 0),
    )
    const pessoas = auxLimpeza.filter((c) => c.turno === t || c.turno === 'ambos')
    const porPessoa = pessoas.length > 0 ? round2(pool / pessoas.length) : 0
    return { turno: t, qtd, pool, pessoas, porPessoa }
  })
  const totalLimpeza = round2(limpezaTurnos.reduce((s, x) => s + x.pool, 0))
  const totalMaquina = poolMaquina

  // ---- Gerente --------------------------------------------------------
  const gerentes = colabs
    .filter((c) => c.cargo === 'gerente')
    .map((g) => {
      let meses = 0
      if (g.data_admissao) {
        const [ay, am] = g.data_admissao.split('-').map(Number)
        meses = (Y - ay) * 12 + (M - am)
        if (meses < 0) meses = 0
      }
      const pct = gerentePct(meses)
      const bonus = round2((fatTotal * pct) / 100)
      return { nome: g.nome, meses, pct, bonus, temAdmissao: !!g.data_admissao }
    })
  const totalGerente = round2(gerentes.reduce((s, g) => s + g.bonus, 0))

  const totalGeral = round2(totalCaixa + totalMaquina + totalLimpeza + totalGerente)

  const brl = (n: number) => n.toFixed(2).replace('.', ',')
  const csv = toCSV([
    ['Bonificações — Lava Thru', mesLabel],
    [],
    ['CAIXA'],
    ['Colaborador', 'Bônus lavagens', 'Ticket médio', 'Bônus ticket', 'Kits', 'Bônus kits', 'Total'],
    ...caixas.map((c) => [c.nome, brl(c.bonusLavagens), brl(c.ticket), brl(c.bonusTicket), c.kits, brl(c.bonusKits), brl(c.total)]),
    ['Subtotal Caixa', '', '', '', '', '', brl(totalCaixa)],
    [],
    ['AUX. MÁQUINA', `${tunelTotal} veículos`, 'Pool', brl(poolMaquina), `${auxMaquina.length} pessoa(s)`, 'Por pessoa', brl(porPessoaMaquina)],
    [],
    ['AUX. LIMPEZA'],
    ...limpezaTurnos.map((t) => [TURNO_LABEL[t.turno], `${t.qtd} limpezas`, 'Pool', brl(t.pool), `${t.pessoas.length} pessoa(s)`, 'Por pessoa', brl(t.porPessoa)]),
    [],
    ['GERENTE'],
    ['Nome', 'Tempo (meses)', '%', 'Bônus'],
    ...gerentes.map((g) => [g.nome, g.meses, g.pct.toFixed(1), brl(g.bonus)]),
    [],
    ['TOTAL GERAL', brl(totalGeral)],
  ])

  return (
    <div>
      <PageHeader
        titulo="Bonificações"
        descricao={`${mesLabel} — cálculo mensal por cargo`}
        acao={
          <div className="flex flex-wrap items-center gap-2">
            <ExportBar csv={csv} filename={`bonificacoes-${mes}`} />
            {filtro}
          </div>
        }
      />

      {/* Resumo */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Mini label="Faturamento" valor={formatBRL(fatTotal)} />
        <Mini label="Lavagens" valor={String(totalLavagens)} />
        <Mini label="Veículos túnel" valor={String(tunelTotal)} />
        <Mini label="Kits vendidos" valor={String(kitsTotal)} />
        {servicosTotal > 0 && <Mini label="Serviços adicionais" valor={String(servicosTotal)} />}
      </div>

      <div className="mb-6 rounded-xl bg-brand-dark px-5 py-4 text-white">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm text-white/70">Total de bonificações no mês</span>
          <span className="text-2xl font-bold">{formatBRL(totalGeral)}</span>
        </div>
        <p className="mt-1 text-xs text-white/50">
          Caixa {formatBRL(totalCaixa)} · Máquina {formatBRL(totalMaquina)} · Limpeza{' '}
          {formatBRL(totalLimpeza)} · Gerente {formatBRL(totalGerente)}
        </p>
      </div>

      {/* Caixa */}
      <Secao titulo="Caixa" subtitulo="Bônus por tipo de lavagem, ticket médio e kits (por colaborador).">
        {caixas.length === 0 ? (
          <Vazio>Nenhum fechamento no período.</Vazio>
        ) : (
          <Tabela
            head={['Colaborador', 'Lavagens', 'Ticket médio', 'Bônus ticket', 'Kits', 'Bônus kits', 'Total']}
          >
            {caixas.map((c) => (
              <tr key={c.nome} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-2 text-slate-700">{c.nome}</td>
                <td className="px-4 py-2 text-right">{formatBRL(c.bonusLavagens)}</td>
                <td className="px-4 py-2 text-right text-slate-500">{formatBRL(c.ticket)}</td>
                <td className="px-4 py-2 text-right">{formatBRL(c.bonusTicket)}</td>
                <td className="px-4 py-2 text-right text-slate-500">{c.kits}</td>
                <td className="px-4 py-2 text-right">{formatBRL(c.bonusKits)}</td>
                <td className="px-4 py-2 text-right font-semibold text-brand-dark">{formatBRL(c.total)}</td>
              </tr>
            ))}
          </Tabela>
        )}
      </Secao>

      {/* Aux. Máquina */}
      <Secao
        titulo="Aux. de Lavagem (Máquina)"
        subtitulo="Soma dos bônus por veículo no túnel (conforme regras), dividida igualmente."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Mini label="Veículos túnel" valor={String(tunelTotal)} />
          <Mini label="Pool total" valor={formatBRL(poolMaquina)} />
          <Mini label={`Por pessoa (${auxMaquina.length})`} valor={auxMaquina.length ? formatBRL(porPessoaMaquina) : '—'} />
        </div>
        {auxMaquina.length === 0 ? (
          <p className="mt-3 text-sm text-warning">
            ⚠️ Cadastre os colaboradores com cargo &quot;Aux. de Lavagem (Máquina)&quot; para dividir o valor.
          </p>
        ) : (
          <p className="mt-3 text-sm text-slate-500">
            {auxMaquina.map((c) => c.nome).join(' · ')} — {formatBRL(porPessoaMaquina)} cada
          </p>
        )}
      </Secao>

      {/* Aux. Limpeza */}
      <Secao
        titulo="Aux. de Limpeza Interna"
        subtitulo="Soma dos bônus dos serviços de limpeza (conforme regras), dividida por turno."
      >
        <div className="space-y-3">
          {limpezaTurnos.map((t) => (
            <div key={t.turno} className="rounded-lg border border-slate-200 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-brand-dark">{TURNO_LABEL[t.turno]}</span>
                <span className="text-sm text-slate-500">
                  {t.qtd} limpezas · pool {formatBRL(t.pool)} ·{' '}
                  {t.pessoas.length ? `${formatBRL(t.porPessoa)} cada` : 'sem colaboradores'}
                </span>
              </div>
              {t.pessoas.length > 0 && (
                <p className="mt-1 text-xs text-slate-400">{t.pessoas.map((p) => p.nome).join(' · ')}</p>
              )}
            </div>
          ))}
          {auxLimpeza.length === 0 && (
            <p className="text-sm text-warning">
              ⚠️ Cadastre os colaboradores &quot;Aux. de Limpeza Interna&quot; (com turno) para dividir.
            </p>
          )}
        </div>
      </Secao>

      {/* Gerente */}
      <Secao titulo="Gerente / Supervisor" subtitulo="% do faturamento bruto conforme tempo de empresa.">
        {gerentes.length === 0 ? (
          <p className="text-sm text-warning">
            ⚠️ Cadastre o gerente (com data de admissão) para calcular.
          </p>
        ) : (
          <Tabela head={['Gerente', 'Tempo de empresa', '%', 'Bônus']}>
            {gerentes.map((g) => (
              <tr key={g.nome} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-2 text-slate-700">{g.nome}</td>
                <td className="px-4 py-2 text-slate-500">
                  {g.temAdmissao ? `${g.meses} meses` : 'sem data de admissão'}
                </td>
                <td className="px-4 py-2 text-slate-500">{g.pct.toFixed(1)}%</td>
                <td className="px-4 py-2 text-right font-semibold text-brand-dark">{formatBRL(g.bonus)}</td>
              </tr>
            ))}
          </Tabela>
        )}
      </Secao>

      <Card className="mt-6 bg-slate-50">
        <p className="text-xs text-slate-500">
          <strong>Como é calculado:</strong> Os bônus por lavagem/serviço vêm das regras em{' '}
          <em>Cadastros → Bonificações</em> (cargo, valor por unidade e rateio). Caixa — soma do
          bônus individual das lavagens que registrou + ticket médio + kits. Ticket médio =
          faturamento ÷ (lavagens, exceto Assinatura Mensal e serviços adicionais); faixas
          &gt;57→100, &gt;58→150, &gt;59→200, &gt;60→250. Kits = (kits−60)×R$2,50 acima de 60. Aux.
          Máquina — soma dos bônus dos tipos de túnel ÷ nº de colaboradores. Aux. Limpeza — soma dos
          bônus dos serviços de limpeza, por turno ÷ colaboradores do turno. Gerente — faturamento
          total × % por tempo de empresa.
        </p>
      </Card>
    </div>
  )
}

function Mini({ label, valor }: { label: string; valor: string }) {
  return (
    <Card>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-brand-dark">{valor}</p>
    </Card>
  )
}
function Secao({
  titulo,
  subtitulo,
  children,
}: {
  titulo: string
  subtitulo: string
  children: React.ReactNode
}) {
  return (
    <Card className="mb-6">
      <div className="mb-3">
        <h2 className="font-semibold text-brand-dark">{titulo}</h2>
        <p className="text-xs text-slate-500">{subtitulo}</p>
      </div>
      {children}
    </Card>
  )
}
function Tabela({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
            {head.map((h, i) => (
              <th key={h} className={`px-4 py-2 font-medium ${i === 0 ? '' : 'text-right'}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}
function Vazio({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-400">{children}</p>
}
