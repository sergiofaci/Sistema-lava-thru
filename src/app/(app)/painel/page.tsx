import { requireUsuario } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { PageHeader, inputClass, btnPrimary, Card, EmptyState } from '@/components/ui'
import { formatBRL, formatQtd, round2 } from '@/lib/money'

type SP = { unidade?: string; mes?: string; cargo?: string }

const FORMAS = [
  'sistema_dinheiro',
  'sistema_pix',
  'sistema_credito',
  'sistema_debito',
  'sistema_voucher',
  'sistema_empresarial',
] as const

type FechRow = Record<(typeof FORMAS)[number], number> & {
  data: string
  turno: string
  lavagens?: { quantidade: number; tipo_lavagem_id: string }[]
}
const fat = (f: FechRow) => FORMAS.reduce((s, k) => s + (Number(f[k]) || 0), 0)

const CARGOS = [
  { cargo: 'todos', label: 'Todos' },
  { cargo: 'caixa', label: 'Caixa' },
  { cargo: 'aux_maquina', label: 'Aux. Máquina' },
  { cargo: 'aux_limpeza', label: 'Aux. Limpeza' },
  { cargo: 'gerente', label: 'Gerente' },
]

// Semáforo por ritmo: realizado vs meta proporcional até hoje.
function semaforo(realizado: number, metaAcum: number): 'ok' | 'atencao' | 'baixo' | 'none' {
  if (metaAcum <= 0) return 'none'
  const r = realizado / metaAcum
  if (r >= 1) return 'ok'
  if (r >= 0.8) return 'atencao'
  return 'baixo'
}
const COR: Record<string, string> = { ok: 'bg-success', atencao: 'bg-warning', baixo: 'bg-danger', none: 'bg-slate-300' }
const TXT: Record<string, string> = { ok: 'text-success', atencao: 'text-warning', baixo: 'text-danger', none: 'text-slate-400' }

function Barra({ pct, cor }: { pct: number; cor: string }) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full rounded-full ${cor}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  )
}

export default async function PainelPage({ searchParams }: { searchParams: Promise<SP> }) {
  const usuario = await requireUsuario()
  const sp = await searchParams
  const supabase = await createClient()

  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
  const mes = sp.mes && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : hoje.slice(0, 7)
  const [Y, M] = mes.split('-').map(Number)
  const mesInicio = `${mes}-01`
  const mesFim = `${mes}-${String(new Date(Y, M, 0).getDate()).padStart(2, '0')}`
  const diasNoMes = new Date(Y, M, 0).getDate()
  const ehMesAtual = mes === hoje.slice(0, 7)
  const diaAtual = ehMesAtual ? Number(hoje.slice(8, 10)) : diasNoMes
  const fatorAcum = diaAtual / diasNoMes
  const horaSP = Number(new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hour12: false }).format(new Date()))
  const turnoAtual = horaSP < 14 ? 'manha' : 'tarde'

  const cargo = CARGOS.some((c) => c.cargo === sp.cargo) ? sp.cargo! : 'todos'

  // Unidade: admin escolhe; demais usam a própria.
  const unidadesAdmin =
    usuario.papel === 'admin'
      ? (await supabase.from('unidades').select('id, nome').eq('ativo', true).order('nome')).data ?? []
      : []
  const unidadeId = usuario.papel === 'admin' ? sp.unidade || unidadesAdmin[0]?.id || '' : usuario.unidade_id || ''

  const mesLabel = new Date(Y, M - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  if (!unidadeId) {
    return (
      <div>
        <PageHeader titulo="Painel de Metas" descricao="Selecione uma unidade." />
        <EmptyState>Nenhuma unidade disponível.</EmptyState>
      </div>
    )
  }

  const [{ data: tipos }, { data: metas }, { data: fechs }, { data: visItens }, { data: flags }, { data: orcData }, { data: contasData }, { data: fatHistData }, { data: fechsAno }, { data: fatHistAno }, { data: metasAno }] = await Promise.all([
    supabase.from('tipos_lavagem').select('id, nome, categoria, preco, ordem').eq('ativo', true).order('ordem'),
    supabase.from('metas_item').select('tipo_lavagem_id, quantidade').eq('unidade_id', unidadeId).eq('mes', mesInicio),
    supabase
      .from('fechamentos_caixa')
      .select('data, turno, sistema_dinheiro, sistema_pix, sistema_credito, sistema_debito, sistema_voucher, sistema_empresarial, lavagens:fechamento_lavagens(quantidade, tipo_lavagem_id)')
      .eq('unidade_id', unidadeId)
      .gte('data', mesInicio)
      .lte('data', mesFim),
    supabase.from('painel_cargo_item').select('tipo_lavagem_id').eq('cargo', cargo === 'todos' ? '__none__' : cargo),
    supabase.from('painel_cargo_flags').select('ver_faturamento, ver_despesas').eq('cargo', cargo === 'todos' ? '__none__' : cargo).maybeSingle(),
    supabase.from('orcamento_despesa').select('valor').eq('unidade_id', unidadeId).eq('mes', mesInicio),
    supabase.from('contas_pagas').select('valor').eq('unidade_id', unidadeId).gte('data', mesInicio).lte('data', mesFim),
    // Assinaturas: vêm do Histórico de Faturamento (importado 1×/mês), não passam
    // pelo caixa. valor → soma ao faturamento realizado; quantidade → nº de assinantes.
    supabase.from('faturamento_historico').select('valor, quantidade').eq('unidade_id', unidadeId).eq('mes', mesInicio).eq('categoria', 'assinatura'),
    // Faturamento anual — realizado (caixa + assinaturas) e metas dos 12 meses do ano.
    supabase
      .from('fechamentos_caixa')
      .select('sistema_dinheiro, sistema_pix, sistema_credito, sistema_debito, sistema_voucher, sistema_empresarial')
      .eq('unidade_id', unidadeId)
      .gte('data', `${Y}-01-01`)
      .lte('data', `${Y}-12-31`),
    supabase
      .from('faturamento_historico')
      .select('valor')
      .eq('unidade_id', unidadeId)
      .eq('categoria', 'assinatura')
      .gte('mes', `${Y}-01-01`)
      .lte('mes', `${Y}-12-01`),
    supabase
      .from('metas_item')
      .select('tipo_lavagem_id, quantidade')
      .eq('unidade_id', unidadeId)
      .gte('mes', `${Y}-01-01`)
      .lte('mes', `${Y}-12-01`),
  ])

  const tiposList = (tipos ?? []) as { id: string; nome: string; categoria: string; preco: number; ordem: number }[]
  const metaQtd = new Map<string, number>()
  for (const m of metas ?? []) metaQtd.set(m.tipo_lavagem_id, Number(m.quantidade))

  // Realizado por tipo (mês / hoje / turno atual)
  const rMes = new Map<string, number>()
  const rHoje = new Map<string, number>()
  const rTurno = new Map<string, number>()
  let fatCaixaMes = 0
  for (const f of (fechs ?? []) as FechRow[]) {
    fatCaixaMes += fat(f)
    for (const l of f.lavagens ?? []) {
      const id = l.tipo_lavagem_id
      rMes.set(id, (rMes.get(id) ?? 0) + Number(l.quantidade))
      if (f.data === hoje) {
        rHoje.set(id, (rHoje.get(id) ?? 0) + Number(l.quantidade))
        if (f.turno === turnoAtual) rTurno.set(id, (rTurno.get(id) ?? 0) + Number(l.quantidade))
      }
    }
  }
  fatCaixaMes = round2(fatCaixaMes)
  // Assinaturas (Histórico de Faturamento) somam ao realizado; não passam pelo caixa.
  const fatHist = (fatHistData ?? []) as { valor: number; quantidade: number }[]
  const fatAssinMes = round2(fatHist.reduce((s, r) => s + Number(r.valor), 0))
  const fatMesReal = round2(fatCaixaMes + fatAssinMes)
  // Nº de assinantes = quantidade importada no histórico (categoria assinatura).
  const assinantesMes = round2(fatHist.reduce((s, r) => s + Number(r.quantidade), 0))
  // Tipo "Assinatura Mensal" (lançado no fechamento): as lavagens feitas pelos assinantes.
  const ehAssinatura = (nome: string) => nome.toLowerCase().includes('assinatura')
  const tipoAssin = tiposList.find((t) => ehAssinatura(t.nome))
  const lavAssinCaixa = tipoAssin ? round2(rMes.get(tipoAssin.id) ?? 0) : 0
  // Média de utilização = lavagens de assinantes no caixa ÷ nº de assinantes.
  const mediaUtilizacao = assinantesMes > 0 ? round2(lavAssinCaixa / assinantesMes) : 0
  // Ticket médio por lavagem de assinante = receita das assinaturas ÷ utilizações no caixa.
  const ticketAssin = lavAssinCaixa > 0 ? round2(fatAssinMes / lavAssinCaixa) : 0
  // Lavagens avulsas no caixa = tipos lavagem (não serviço) exceto assinatura.
  const lavAvulsaCaixa = round2(
    tiposList
      .filter((t) => t.categoria !== 'servico' && !ehAssinatura(t.nome))
      .reduce((s, t) => s + (rMes.get(t.id) ?? 0), 0),
  )
  // Ticket médio de lavagens avulsas = faturamento do caixa ÷ lavagens avulsas.
  const ticketAvulsa = lavAvulsaCaixa > 0 ? round2(fatCaixaMes / lavAvulsaCaixa) : 0

  // Visibilidade
  const configurado = new Set((visItens ?? []).map((v) => v.tipo_lavagem_id))
  const verFaturamento = flags ? flags.ver_faturamento : true
  const verDespesas = flags ? flags.ver_despesas : true

  // Despesas: orçado × realizado no mês
  const orcado = round2(((orcData ?? []) as { valor: number }[]).reduce((s, o) => s + Number(o.valor), 0))
  const despReal = round2(((contasData ?? []) as { valor: number }[]).reduce((s, c) => s + Number(c.valor), 0))
  const semDesp = orcado > 0 ? (despReal <= round2(orcado * fatorAcum) ? 'ok' : despReal <= orcado ? 'atencao' : 'baixo') : 'none'

  // Itens a mostrar: só os que têm meta; se cargo configurado, restringe.
  const itens = tiposList
    .filter((t) => (metaQtd.get(t.id) ?? 0) > 0)
    .filter((t) => cargo === 'todos' || configurado.size === 0 || configurado.has(t.id))
    .map((t) => {
      const assin = ehAssinatura(t.nome)
      const metaMes = metaQtd.get(t.id) ?? 0
      // Assinatura: realizado = nº de assinantes importados (histórico), não o caixa.
      const feitoMes = assin ? assinantesMes : round2(rMes.get(t.id) ?? 0)
      const metaDia = round2(metaMes / diasNoMes)
      const metaTurno = round2(metaDia / 2)
      // Assinantes são contagem mensal (não acumulam por dia): compara direto com a meta.
      const metaAcum = assin ? metaMes : round2(metaMes * fatorAcum)
      const sem = semaforo(feitoMes, metaAcum)
      return {
        id: t.id,
        nome: t.nome,
        categoria: t.categoria,
        assin,
        metaMes,
        feitoMes,
        pctMes: metaMes > 0 ? (feitoMes / metaMes) * 100 : 0,
        metaDia,
        feitoHoje: round2(rHoje.get(t.id) ?? 0),
        metaTurno,
        feitoTurno: round2(rTurno.get(t.id) ?? 0),
        metaAcum,
        sem,
      }
    })

  const lavagens = itens.filter((i) => i.categoria !== 'servico')
  const servicos = itens.filter((i) => i.categoria === 'servico')

  // Meta de faturamento (derivada) e realizado
  const metaFat = round2(tiposList.reduce((s, t) => s + (metaQtd.get(t.id) ?? 0) * Number(t.preco), 0))
  const metaFatAcum = round2(metaFat * fatorAcum)
  const semFat = semaforo(fatMesReal, metaFatAcum)
  // Projeta a parte do caixa (acumula dia a dia) e soma a assinatura como valor cheio.
  const projFat =
    ehMesAtual && diaAtual > 0 ? round2((fatCaixaMes / diaAtual) * diasNoMes + fatAssinMes) : fatMesReal

  // Faturamento ANUAL (ano do mês selecionado): realizado = caixa + assinaturas do ano.
  const anoAtual = Number(hoje.slice(0, 4))
  const ehAnoAtual = Y === anoAtual
  const fatCaixaAno = round2(((fechsAno ?? []) as FechRow[]).reduce((s, f) => s + fat(f), 0))
  const fatAssinAno = round2(((fatHistAno ?? []) as { valor: number }[]).reduce((s, r) => s + Number(r.valor), 0))
  const fatAnoReal = round2(fatCaixaAno + fatAssinAno)
  // Meta anual = soma das metas de faturamento dos 12 meses (quantidade × preço do item).
  const precoTipo = new Map(tiposList.map((t) => [t.id, Number(t.preco)]))
  const metaFatAno = round2(
    ((metasAno ?? []) as { tipo_lavagem_id: string; quantidade: number }[]).reduce(
      (s, m) => s + Number(m.quantidade) * (precoTipo.get(m.tipo_lavagem_id) ?? 0),
      0,
    ),
  )
  // Fração do ano decorrida (para meta proporcional e projeção), só no ano corrente.
  const fatorAno = ehAnoAtual ? (Number(hoje.slice(5, 7)) - 1 + fatorAcum) / 12 : 1
  const metaFatAnoAcum = round2(metaFatAno * fatorAno)
  const semFatAno = semaforo(fatAnoReal, metaFatAnoAcum)
  const projFatAno = ehAnoAtual && fatorAno > 0 ? round2(fatAnoReal / fatorAno) : fatAnoReal

  const filtro = (
    <form method="get" className="flex flex-wrap items-center gap-2">
      {usuario.papel === 'admin' && (
        <select name="unidade" defaultValue={unidadeId} className={inputClass}>
          {unidadesAdmin.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nome}
            </option>
          ))}
        </select>
      )}
      <select name="cargo" defaultValue={cargo} className={inputClass}>
        {CARGOS.map((c) => (
          <option key={c.cargo} value={c.cargo}>
            {c.label}
          </option>
        ))}
      </select>
      <input type="month" name="mes" defaultValue={mes} className={inputClass} />
      <button type="submit" className={btnPrimary}>
        Aplicar
      </button>
    </form>
  )

  return (
    <div>
      <PageHeader titulo="Painel de Metas" descricao={`${mesLabel} — acompanhamento do mês, dia e turno.`} acao={filtro} />

      {verFaturamento && metaFat > 0 && (
        <Card className="mb-6">
          <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="font-semibold text-brand-dark">Faturamento</h2>
              <p className="text-xs text-slate-500">
                Meta {formatBRL(metaFat)} · realizado {formatBRL(fatMesReal)}
                {fatAssinMes > 0 && (
                  <> (caixa {formatBRL(fatCaixaMes)} + assinaturas {formatBRL(fatAssinMes)})</>
                )}
                {ehMesAtual && <> · projeção {formatBRL(projFat)}</>}
              </p>
            </div>
            <span className={`text-3xl font-bold ${TXT[semFat]}`}>
              {metaFat > 0 ? `${((fatMesReal / metaFat) * 100).toFixed(0)}%` : '—'}
            </span>
          </div>
          <Barra pct={(fatMesReal / metaFat) * 100} cor={COR[semFat]} />
          <p className="mt-2 text-xs text-slate-500">
            Meta proporcional até hoje: <strong>{formatBRL(metaFatAcum)}</strong> ·{' '}
            <span className={TXT[semFat]}>
              {semFat === 'ok' ? 'no ritmo' : semFat === 'atencao' ? 'atenção' : 'abaixo do ritmo'}
            </span>
          </p>
        </Card>
      )}

      {verFaturamento && (fatAnoReal > 0 || metaFatAno > 0) && (
        <Card className="mb-6">
          <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="font-semibold text-brand-dark">Faturamento anual — {Y}</h2>
              <p className="text-xs text-slate-500">
                {metaFatAno > 0 ? <>Meta {formatBRL(metaFatAno)} · </> : <>Sem meta cadastrada para {Y} · </>}
                realizado {formatBRL(fatAnoReal)}
                {fatAssinAno > 0 && <> (caixa {formatBRL(fatCaixaAno)} + assinaturas {formatBRL(fatAssinAno)})</>}
                {ehAnoAtual && metaFatAno > 0 && <> · projeção {formatBRL(projFatAno)}</>}
              </p>
            </div>
            <span className={`text-3xl font-bold ${metaFatAno > 0 ? TXT[semFatAno] : 'text-brand-dark'}`}>
              {metaFatAno > 0 ? `${((fatAnoReal / metaFatAno) * 100).toFixed(0)}%` : formatBRL(fatAnoReal)}
            </span>
          </div>
          {metaFatAno > 0 ? (
            <>
              <Barra pct={(fatAnoReal / metaFatAno) * 100} cor={COR[semFatAno]} />
              <p className="mt-2 text-xs text-slate-500">
                Meta proporcional até hoje: <strong>{formatBRL(metaFatAnoAcum)}</strong> ·{' '}
                <span className={TXT[semFatAno]}>
                  {semFatAno === 'ok' ? 'no ritmo' : semFatAno === 'atencao' ? 'atenção' : 'abaixo do ritmo'}
                </span>
              </p>
            </>
          ) : (
            <p className="mt-1 text-xs text-slate-500">
              Faturamento acumulado do ano (caixa + assinaturas). Defina metas mensais em{' '}
              <strong>Cadastros → Metas (por item)</strong> para acompanhar a meta anual.
            </p>
          )}
        </Card>
      )}

      {verDespesas && orcado > 0 && (
        <Card className="mb-6">
          <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="font-semibold text-brand-dark">Despesas (orçamento)</h2>
              <p className="text-xs text-slate-500">
                Orçado {formatBRL(orcado)} · realizado {formatBRL(despReal)}
              </p>
            </div>
            <span className={`text-3xl font-bold ${TXT[semDesp]}`}>{((despReal / orcado) * 100).toFixed(0)}%</span>
          </div>
          <Barra pct={(despReal / orcado) * 100} cor={COR[semDesp]} />
          <p className="mt-2 text-xs text-slate-500">
            {semDesp === 'baixo' ? (
              <span className="text-danger">acima do orçado</span>
            ) : (
              <span className="text-success">dentro do orçado</span>
            )}{' '}
            · resta {formatBRL(round2(orcado - despReal))}
          </p>
        </Card>
      )}

      {(assinantesMes > 0 || lavAssinCaixa > 0) && (
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <div className="mb-1 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="font-semibold text-brand-dark">Média de utilização de assinantes</h2>
                <p className="text-xs text-slate-500">Lavagens de assinantes (caixa) ÷ assinantes (histórico)</p>
              </div>
              <span className="text-3xl font-bold text-brand-dark">
                {assinantesMes > 0 ? `${formatQtd(mediaUtilizacao)}×` : '—'}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              <strong>{formatQtd(lavAssinCaixa)}</strong> lavagens ÷ <strong>{formatQtd(assinantesMes)}</strong> assinantes
              {assinantesMes > 0 && <> = <strong>{formatQtd(mediaUtilizacao)}</strong> lavagens por assinante no mês</>}
              {assinantesMes === 0 && <> — importe o Histórico de Faturamento das assinaturas para calcular</>}
            </p>
          </Card>
          {verFaturamento && (
            <Card>
              <div className="mb-1 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="font-semibold text-brand-dark">Ticket médio por lavagem de assinante</h2>
                  <p className="text-xs text-slate-500">Receita das assinaturas (R$) ÷ utilizações (caixa)</p>
                </div>
                <span className="text-3xl font-bold text-brand-dark">
                  {lavAssinCaixa > 0 ? formatBRL(ticketAssin) : '—'}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                <strong>{formatBRL(fatAssinMes)}</strong> ÷ <strong>{formatQtd(lavAssinCaixa)}</strong> lavagens
                {lavAssinCaixa > 0 && <> = <strong>{formatBRL(ticketAssin)}</strong> por lavagem de assinante</>}
                {lavAssinCaixa === 0 && <> — sem utilizações de assinantes lançadas no caixa</>}
              </p>
            </Card>
          )}
        </div>
      )}

      {verFaturamento && lavAvulsaCaixa > 0 && (
        <Card className="mb-6">
          <div className="mb-1 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="font-semibold text-brand-dark">Ticket médio de lavagens avulsas</h2>
              <p className="text-xs text-slate-500">Faturamento do caixa (R$) ÷ lavagens avulsas (caixa)</p>
            </div>
            <span className="text-3xl font-bold text-brand-dark">{formatBRL(ticketAvulsa)}</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            <strong>{formatBRL(fatCaixaMes)}</strong> ÷ <strong>{formatQtd(lavAvulsaCaixa)}</strong> lavagens avulsas ={' '}
            <strong>{formatBRL(ticketAvulsa)}</strong> por lavagem
          </p>
        </Card>
      )}

      {itens.length === 0 ? (
        <EmptyState>
          Sem metas para exibir neste filtro. Defina metas em <strong>Cadastros → Metas (por item)</strong>.
        </EmptyState>
      ) : (
        <div className="space-y-6">
          {[
            { titulo: 'Lavagens', lista: lavagens },
            { titulo: 'Serviços e adicionais', lista: servicos },
          ].map(
            (g) =>
              g.lista.length > 0 && (
                <div key={g.titulo}>
                  <h2 className="mb-3 font-semibold text-brand-dark">{g.titulo}</h2>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {g.lista.map((i) => (
                      <Card key={i.id}>
                        <div className="mb-1 flex items-end justify-between gap-2">
                          <h3 className="font-medium text-slate-700">{i.nome}</h3>
                          <span className={`text-2xl font-bold ${TXT[i.sem]}`}>{i.pctMes.toFixed(0)}%</span>
                        </div>
                        <p className="mb-2 text-xs text-slate-500">
                          {i.assin ? 'Assinantes' : 'Mês'}: <strong>{formatQtd(i.feitoMes)}</strong> / {formatQtd(i.metaMes)}
                        </p>
                        <Barra pct={i.pctMes} cor={COR[i.sem]} />
                        {i.assin ? (
                          <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                            Assinantes do mês (importados no Histórico de Faturamento).
                          </p>
                        ) : (
                          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
                            <div className="rounded-lg bg-slate-50 px-3 py-2">
                              Hoje: <strong className="text-slate-700">{formatQtd(i.feitoHoje)}</strong> / {formatQtd(i.metaDia)}
                            </div>
                            <div className="rounded-lg bg-slate-50 px-3 py-2">
                              Turno: <strong className="text-slate-700">{formatQtd(i.feitoTurno)}</strong> / {formatQtd(i.metaTurno)}
                            </div>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                </div>
              ),
          )}
        </div>
      )}
    </div>
  )
}
