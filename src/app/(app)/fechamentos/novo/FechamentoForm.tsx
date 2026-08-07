'use client'

import { useMemo, useState, useTransition } from 'react'
import { parseBRL, formatBRL, round2 } from '@/lib/money'
import { Card, Field, inputClass, btnPrimary, btnGhost } from '@/components/ui'
import { criarFechamento, type FechamentoResult } from '../actions'

type Tipo = { id: string; nome: string; categoria?: string }
type Unidade = { id: string; nome: string }
type Tres = { pix: string; credito: string; debito: string }

const money =
  'w-full rounded-md border border-slate-300 px-2 py-1.5 text-right text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20'
const qtd =
  'w-20 rounded-md border border-slate-300 px-2 py-1.5 text-right text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20'

function toInt(v: string) {
  const n = parseInt(v, 10)
  return Number.isFinite(n) && n > 0 ? n : 0
}

export function FechamentoForm({
  tipos,
  unidades,
  unidadeFixaNome,
  turnoPadrao,
  isAdmin = false,
  hoje,
}: {
  tipos: Tipo[]
  unidades: Unidade[] | null // preenchido só para admin
  unidadeFixaNome?: string
  turnoPadrao: 'manha' | 'tarde'
  isAdmin?: boolean
  hoje: string
}) {
  const [turno, setTurno] = useState<'manha' | 'tarde'>(turnoPadrao)
  const [unidadeId, setUnidadeId] = useState('')
  const [dataFech, setDataFech] = useState(hoje) // admin pode lançar retroativo

  // Bloco A: as duas maquininhas · Bloco B: sistema — valores como texto
  const [rede, setRede] = useState<Tres>({ pix: '', credito: '', debito: '' })
  const [sipag, setSipag] = useState<Tres>({ pix: '', credito: '', debito: '' })
  const [b, setB] = useState({ dinheiro: '', pix: '', credito: '', debito: '', voucher: '', empresarial: '' })
  const [q, setQ] = useState({ dinheiro: '', pix: '', credito: '', debito: '', voucher: '', empresarial: '' })
  const [kits, setKits] = useState('')
  const [lav, setLav] = useState<Record<string, string>>({})

  const [modal, setModal] = useState<{ diferenca: number } | null>(null)
  const [erro, setErro] = useState('')
  const [pending, startTransition] = useTransition()

  // máquina (total) = rede + sipag, por forma
  const maq = useMemo(
    () => ({
      pix: round2(parseBRL(rede.pix) + parseBRL(sipag.pix)),
      credito: round2(parseBRL(rede.credito) + parseBRL(sipag.credito)),
      debito: round2(parseBRL(rede.debito) + parseBRL(sipag.debito)),
    }),
    [rede, sipag],
  )

  const diffs = useMemo(() => {
    const pix = round2(maq.pix - parseBRL(b.pix))
    const credito = round2(maq.credito - parseBRL(b.credito))
    const debito = round2(maq.debito - parseBRL(b.debito))
    const total = round2(Math.abs(pix) + Math.abs(credito) + Math.abs(debito))
    return { pix, credito, debito, total }
  }, [maq, b])

  function montarPayload(confirmado: boolean) {
    return {
      unidade_id: unidades ? unidadeId || undefined : undefined,
      data: isAdmin ? dataFech : undefined,
      turno,
      maquina: {
        rede: { pix: parseBRL(rede.pix), credito: parseBRL(rede.credito), debito: parseBRL(rede.debito) },
        sipag: { pix: parseBRL(sipag.pix), credito: parseBRL(sipag.credito), debito: parseBRL(sipag.debito) },
      },
      sistema: {
        dinheiro: parseBRL(b.dinheiro),
        pix: parseBRL(b.pix),
        credito: parseBRL(b.credito),
        debito: parseBRL(b.debito),
        voucher: parseBRL(b.voucher),
        empresarial: parseBRL(b.empresarial),
      },
      qtd: {
        dinheiro: toInt(q.dinheiro),
        pix: toInt(q.pix),
        credito: toInt(q.credito),
        debito: toInt(q.debito),
        voucher: toInt(q.voucher),
        empresarial: toInt(q.empresarial),
      },
      kits: toInt(kits),
      lavagens: Object.fromEntries(tipos.map((t) => [t.id, toInt(lav[t.id] ?? '')])),
      confirmado_com_diferenca: confirmado,
    }
  }

  function enviar(confirmado: boolean) {
    setErro('')
    if (unidades && !unidadeId) {
      setErro('Selecione a unidade do fechamento.')
      return
    }
    startTransition(async () => {
      const res: FechamentoResult = await criarFechamento(montarPayload(confirmado))
      if (res && res.ok === false) {
        if ('precisaConfirmar' in res) setModal({ diferenca: res.diferenca })
        else setErro(res.erro)
      }
    })
  }

  function tentarFechar() {
    if (diffs.total > 0.004) setModal({ diferenca: diffs.total })
    else enviar(false)
  }

  const somaSistema = round2(
    parseBRL(b.dinheiro) +
      parseBRL(b.pix) +
      parseBRL(b.credito) +
      parseBRL(b.debito) +
      parseBRL(b.voucher) +
      parseBRL(b.empresarial),
  )

  return (
    <div className="max-w-4xl space-y-6">
      {/* Cabeçalho: unidade + data + turno */}
      <Card>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {unidades ? (
            <Field label="Unidade" htmlFor="unidade">
              <select id="unidade" className={inputClass} value={unidadeId} onChange={(e) => setUnidadeId(e.target.value)}>
                <option value="">Selecione…</option>
                {unidades.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <Field label="Unidade">
              <div className="rounded-lg bg-muted px-3 py-2 text-sm text-slate-600">{unidadeFixaNome}</div>
            </Field>
          )}
          {isAdmin && (
            <Field label="Data do fechamento" htmlFor="dataFech" hint="Admin pode lançar retroativo">
              <input id="dataFech" type="date" max={hoje} className={inputClass} value={dataFech} onChange={(e) => setDataFech(e.target.value)} />
            </Field>
          )}
          <Field label="Turno" htmlFor="turno">
            <select id="turno" className={inputClass} value={turno} onChange={(e) => setTurno(e.target.value as 'manha' | 'tarde')}>
              <option value="manha">Manhã</option>
              <option value="tarde">Tarde</option>
            </select>
          </Field>
        </div>
      </Card>

      {/* Tabela de conferência: (Rede + Sipag) x sistema */}
      <Card className="p-0">
        <div className="border-b border-slate-200 px-5 py-3">
          <h2 className="font-semibold text-brand-dark">Conferência por forma de pagamento</h2>
          <p className="text-xs text-slate-500">
            Bloco A = maquininhas (Rede Card e Sipag) · Bloco B = sistema interno. A diferença compara
            (Rede + Sipag) com o sistema.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-5 py-2 font-medium">Forma</th>
                <th className="px-3 py-2 text-right font-medium">Rede Card</th>
                <th className="px-3 py-2 text-right font-medium">Sipag</th>
                <th className="px-3 py-2 text-right font-medium">Sistema (B)</th>
                <th className="px-3 py-2 text-right font-medium">Qtd.</th>
                <th className="px-5 py-2 text-right font-medium">Diferença</th>
              </tr>
            </thead>
            <tbody>
              <LinhaSemMaquina nome="Dinheiro" valor={b.dinheiro} onValor={(v) => setB({ ...b, dinheiro: v })} q={q.dinheiro} onQ={(v) => setQ({ ...q, dinheiro: v })} />
              <LinhaComparada
                nome="Pix"
                rede={rede.pix}
                onRede={(v) => setRede({ ...rede, pix: v })}
                sipag={sipag.pix}
                onSipag={(v) => setSipag({ ...sipag, pix: v })}
                bVal={b.pix}
                onB={(v) => setB({ ...b, pix: v })}
                q={q.pix}
                onQ={(v) => setQ({ ...q, pix: v })}
                diff={diffs.pix}
              />
              <LinhaComparada
                nome="Crédito"
                rede={rede.credito}
                onRede={(v) => setRede({ ...rede, credito: v })}
                sipag={sipag.credito}
                onSipag={(v) => setSipag({ ...sipag, credito: v })}
                bVal={b.credito}
                onB={(v) => setB({ ...b, credito: v })}
                q={q.credito}
                onQ={(v) => setQ({ ...q, credito: v })}
                diff={diffs.credito}
              />
              <LinhaComparada
                nome="Débito"
                rede={rede.debito}
                onRede={(v) => setRede({ ...rede, debito: v })}
                sipag={sipag.debito}
                onSipag={(v) => setSipag({ ...sipag, debito: v })}
                bVal={b.debito}
                onB={(v) => setB({ ...b, debito: v })}
                q={q.debito}
                onQ={(v) => setQ({ ...q, debito: v })}
                diff={diffs.debito}
              />
              <LinhaSemMaquina nome="Voucher" valor={b.voucher} onValor={(v) => setB({ ...b, voucher: v })} q={q.voucher} onQ={(v) => setQ({ ...q, voucher: v })} />
              <LinhaSemMaquina nome="Empresarial a Prazo" valor={b.empresarial} onValor={(v) => setB({ ...b, empresarial: v })} q={q.empresarial} onQ={(v) => setQ({ ...q, empresarial: v })} />
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 bg-slate-50 font-medium">
                <td className="px-5 py-3 text-slate-600">Total sistema</td>
                <td />
                <td />
                <td className="px-3 py-3 text-right text-brand-dark">{formatBRL(somaSistema)}</td>
                <td />
                <td className="px-5 py-3 text-right">
                  {diffs.total > 0.004 ? (
                    <span className="text-danger">{formatBRL(diffs.total)}</span>
                  ) : (
                    <span className="text-success">Sem diferença</span>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Lavagens por tipo */}
      <Card>
        <h2 className="mb-1 font-semibold text-brand-dark">Lavagens realizadas no período</h2>
        <p className="mb-4 text-xs text-slate-500">Quantidade por tipo de serviço.</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {tipos
            .filter((t) => t.categoria !== 'servico')
            .map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2">
                <label htmlFor={`lav-${t.id}`} className="text-sm text-slate-600">
                  {t.nome}
                </label>
                <input
                  id={`lav-${t.id}`}
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={lav[t.id] ?? ''}
                  onChange={(e) => setLav({ ...lav, [t.id]: e.target.value })}
                  className="w-16 rounded-md border border-slate-300 px-2 py-1 text-right text-sm"
                  placeholder="0"
                />
              </div>
            ))}
        </div>

        {tipos.some((t) => t.categoria === 'servico') && (
          <div className="mt-5">
            <h3 className="mb-1 text-sm font-semibold text-slate-600">Serviços adicionais</h3>
            <p className="mb-3 text-xs text-slate-400">Não contam como lavagem nas estatísticas.</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {tipos
                .filter((t) => t.categoria === 'servico')
                .map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2">
                    <label htmlFor={`lav-${t.id}`} className="text-sm text-slate-600">
                      {t.nome}
                    </label>
                    <input
                      id={`lav-${t.id}`}
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={lav[t.id] ?? ''}
                      onChange={(e) => setLav({ ...lav, [t.id]: e.target.value })}
                      className="w-16 rounded-md border border-slate-300 px-2 py-1 text-right text-sm"
                      placeholder="0"
                    />
                  </div>
                ))}
            </div>
          </div>
        )}
        <div className="mt-4 flex items-center justify-between gap-2 rounded-lg border border-brand/30 bg-brand-light/40 px-3 py-2 sm:max-w-xs">
          <label htmlFor="kits" className="text-sm font-medium text-brand-dark">
            Kits vendidos
          </label>
          <input
            id="kits"
            type="number"
            min={0}
            inputMode="numeric"
            value={kits}
            onChange={(e) => setKits(e.target.value)}
            className="w-16 rounded-md border border-slate-300 px-2 py-1 text-right text-sm"
            placeholder="0"
          />
        </div>
      </Card>

      {erro && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-danger">{erro}</p>}

      <div className="flex justify-end gap-3">
        <button type="button" disabled={pending} onClick={tentarFechar} className={btnPrimary}>
          {pending ? 'Salvando…' : 'Fechar caixa'}
        </button>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-brand-dark">Diferença identificada</h3>
            <p className="mt-2 text-sm text-slate-600">
              Foi identificada uma diferença de{' '}
              <strong className="text-danger">{formatBRL(modal.diferenca)}</strong> entre a máquina e o
              sistema. Deseja fechar o caixa mesmo assim, com a diferença registrada?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" className={btnGhost} onClick={() => setModal(null)} disabled={pending}>
                Revisar valores
              </button>
              <button
                type="button"
                className={btnPrimary}
                onClick={() => {
                  setModal(null)
                  enviar(true)
                }}
                disabled={pending}
              >
                {pending ? 'Salvando…' : 'Sim, fechar com diferença'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function LinhaComparada({
  nome,
  rede,
  onRede,
  sipag,
  onSipag,
  bVal,
  onB,
  q,
  onQ,
  diff,
}: {
  nome: string
  rede: string
  onRede: (v: string) => void
  sipag: string
  onSipag: (v: string) => void
  bVal: string
  onB: (v: string) => void
  q: string
  onQ: (v: string) => void
  diff: number
}) {
  const temDiff = Math.abs(diff) > 0.004
  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="px-5 py-2 font-medium text-slate-700">{nome}</td>
      <td className="px-3 py-2">
        <input className={money} inputMode="decimal" placeholder="0,00" value={rede} onChange={(e) => onRede(e.target.value)} />
      </td>
      <td className="px-3 py-2">
        <input className={money} inputMode="decimal" placeholder="0,00" value={sipag} onChange={(e) => onSipag(e.target.value)} />
      </td>
      <td className="px-3 py-2">
        <input className={money} inputMode="decimal" placeholder="0,00" value={bVal} onChange={(e) => onB(e.target.value)} />
      </td>
      <td className="px-3 py-2 text-right">
        <input className={qtd} inputMode="numeric" placeholder="0" value={q} onChange={(e) => onQ(e.target.value)} />
      </td>
      <td className="px-5 py-2 text-right font-medium">
        {temDiff ? <span className="text-danger">{formatBRL(diff)}</span> : <span className="text-slate-300">—</span>}
      </td>
    </tr>
  )
}

function LinhaSemMaquina({
  nome,
  valor,
  onValor,
  q,
  onQ,
}: {
  nome: string
  valor: string
  onValor: (v: string) => void
  q: string
  onQ: (v: string) => void
}) {
  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="px-5 py-2 font-medium text-slate-700">{nome}</td>
      <td className="px-3 py-2 text-right text-slate-300">—</td>
      <td className="px-3 py-2 text-right text-slate-300">—</td>
      <td className="px-3 py-2">
        <input className={money} inputMode="decimal" placeholder="0,00" value={valor} onChange={(e) => onValor(e.target.value)} />
      </td>
      <td className="px-3 py-2 text-right">
        <input className={qtd} inputMode="numeric" placeholder="0" value={q} onChange={(e) => onQ(e.target.value)} />
      </td>
      <td className="px-5 py-2 text-right text-slate-300">—</td>
    </tr>
  )
}
