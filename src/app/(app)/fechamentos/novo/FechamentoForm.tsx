'use client'

import { useMemo, useState, useTransition } from 'react'
import { parseBRL, formatBRL, round2 } from '@/lib/money'
import { Card, Field, inputClass, btnPrimary, btnGhost } from '@/components/ui'
import { criarFechamento, type FechamentoResult } from '../actions'

type Tipo = { id: string; nome: string }
type Unidade = { id: string; nome: string }

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
}: {
  tipos: Tipo[]
  unidades: Unidade[] | null // preenchido só para admin
  unidadeFixaNome?: string
  turnoPadrao: 'manha' | 'tarde'
}) {
  const [maquinaCartao, setMaquinaCartao] = useState<'Rede Card' | 'Sipag'>('Rede Card')
  const [turno, setTurno] = useState<'manha' | 'tarde'>(turnoPadrao)
  const [unidadeId, setUnidadeId] = useState('')

  // Bloco A (máquina) e Bloco B (sistema) — valores como texto
  const [a, setA] = useState({ pix: '', credito: '', debito: '' })
  const [b, setB] = useState({ dinheiro: '', pix: '', credito: '', debito: '', voucher: '' })
  const [q, setQ] = useState({ dinheiro: '', pix: '', credito: '', debito: '', voucher: '' })
  const [lav, setLav] = useState<Record<string, string>>({})

  const [modal, setModal] = useState<{ diferenca: number } | null>(null)
  const [erro, setErro] = useState('')
  const [pending, startTransition] = useTransition()

  const diffs = useMemo(() => {
    const pix = round2(parseBRL(a.pix) - parseBRL(b.pix))
    const credito = round2(parseBRL(a.credito) - parseBRL(b.credito))
    const debito = round2(parseBRL(a.debito) - parseBRL(b.debito))
    const total = round2(Math.abs(pix) + Math.abs(credito) + Math.abs(debito))
    return { pix, credito, debito, total }
  }, [a, b])

  function montarPayload(confirmado: boolean) {
    return {
      unidade_id: unidades ? unidadeId || undefined : undefined,
      turno,
      maquina_cartao: maquinaCartao,
      maquina: { pix: parseBRL(a.pix), credito: parseBRL(a.credito), debito: parseBRL(a.debito) },
      sistema: {
        dinheiro: parseBRL(b.dinheiro),
        pix: parseBRL(b.pix),
        credito: parseBRL(b.credito),
        debito: parseBRL(b.debito),
        voucher: parseBRL(b.voucher),
      },
      qtd: {
        dinheiro: toInt(q.dinheiro),
        pix: toInt(q.pix),
        credito: toInt(q.credito),
        debito: toInt(q.debito),
        voucher: toInt(q.voucher),
      },
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
      // sucesso => redirect no servidor (não retorna); aqui só tratamos erros
      if (res && res.ok === false) {
        if ('precisaConfirmar' in res) {
          setModal({ diferenca: res.diferenca })
        } else {
          setErro(res.erro)
        }
      }
    })
  }

  function tentarFechar() {
    if (diffs.total > 0.004) {
      setModal({ diferenca: diffs.total }) // pergunta antes de enviar
    } else {
      enviar(false)
    }
  }

  const somaSistema = round2(
    parseBRL(b.dinheiro) +
      parseBRL(b.pix) +
      parseBRL(b.credito) +
      parseBRL(b.debito) +
      parseBRL(b.voucher),
  )

  return (
    <div className="max-w-4xl space-y-6">
      {/* Cabeçalho: unidade + turno + máquina */}
      <Card>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {unidades ? (
            <Field label="Unidade" htmlFor="unidade">
              <select
                id="unidade"
                className={inputClass}
                value={unidadeId}
                onChange={(e) => setUnidadeId(e.target.value)}
              >
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
              <div className="rounded-lg bg-muted px-3 py-2 text-sm text-slate-600">
                {unidadeFixaNome}
              </div>
            </Field>
          )}
          <Field label="Turno" htmlFor="turno">
            <select
              id="turno"
              className={inputClass}
              value={turno}
              onChange={(e) => setTurno(e.target.value as 'manha' | 'tarde')}
            >
              <option value="manha">Manhã</option>
              <option value="tarde">Tarde</option>
            </select>
          </Field>
          <Field label="Máquina de cartão" htmlFor="maquina">
            <select
              id="maquina"
              className={inputClass}
              value={maquinaCartao}
              onChange={(e) => setMaquinaCartao(e.target.value as 'Rede Card' | 'Sipag')}
            >
              <option value="Rede Card">Rede Card</option>
              <option value="Sipag">Sipag</option>
            </select>
          </Field>
        </div>
      </Card>

      {/* Tabela de conferência: máquina x sistema */}
      <Card className="p-0">
        <div className="border-b border-slate-200 px-5 py-3">
          <h2 className="font-semibold text-brand-dark">Conferência por forma de pagamento</h2>
          <p className="text-xs text-slate-500">
            Bloco A = relatório da maquininha · Bloco B = relatório do sistema interno
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-5 py-2 font-medium">Forma</th>
                <th className="px-3 py-2 text-right font-medium">Máquina (A)</th>
                <th className="px-3 py-2 text-right font-medium">Sistema (B)</th>
                <th className="px-3 py-2 text-right font-medium">Qtd.</th>
                <th className="px-5 py-2 text-right font-medium">Diferença</th>
              </tr>
            </thead>
            <tbody>
              <LinhaSemMaquina
                nome="Dinheiro"
                valor={b.dinheiro}
                onValor={(v) => setB({ ...b, dinheiro: v })}
                q={q.dinheiro}
                onQ={(v) => setQ({ ...q, dinheiro: v })}
              />
              <LinhaComparada
                nome="Pix"
                aVal={a.pix}
                onA={(v) => setA({ ...a, pix: v })}
                bVal={b.pix}
                onB={(v) => setB({ ...b, pix: v })}
                q={q.pix}
                onQ={(v) => setQ({ ...q, pix: v })}
                diff={diffs.pix}
              />
              <LinhaComparada
                nome="Crédito"
                aVal={a.credito}
                onA={(v) => setA({ ...a, credito: v })}
                bVal={b.credito}
                onB={(v) => setB({ ...b, credito: v })}
                q={q.credito}
                onQ={(v) => setQ({ ...q, credito: v })}
                diff={diffs.credito}
              />
              <LinhaComparada
                nome="Débito"
                aVal={a.debito}
                onA={(v) => setA({ ...a, debito: v })}
                bVal={b.debito}
                onB={(v) => setB({ ...b, debito: v })}
                q={q.debito}
                onQ={(v) => setQ({ ...q, debito: v })}
                diff={diffs.debito}
              />
              <LinhaSemMaquina
                nome="Voucher"
                valor={b.voucher}
                onValor={(v) => setB({ ...b, voucher: v })}
                q={q.voucher}
                onQ={(v) => setQ({ ...q, voucher: v })}
              />
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 bg-slate-50 font-medium">
                <td className="px-5 py-3 text-slate-600">Total sistema</td>
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
          {tipos.map((t) => (
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
      </Card>

      {erro && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-danger">{erro}</p>}

      <div className="flex justify-end gap-3">
        <button type="button" disabled={pending} onClick={tentarFechar} className={btnPrimary}>
          {pending ? 'Salvando…' : 'Fechar caixa'}
        </button>
      </div>

      {/* Modal de confirmação de diferença (regra 4.2) */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-brand-dark">Diferença identificada</h3>
            <p className="mt-2 text-sm text-slate-600">
              Foi identificada uma diferença de{' '}
              <strong className="text-danger">{formatBRL(modal.diferenca)}</strong> entre a máquina
              e o sistema. Deseja fechar o caixa mesmo assim, com a diferença registrada?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className={btnGhost}
                onClick={() => setModal(null)}
                disabled={pending}
              >
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
  aVal,
  onA,
  bVal,
  onB,
  q,
  onQ,
  diff,
}: {
  nome: string
  aVal: string
  onA: (v: string) => void
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
        <input className={money} inputMode="decimal" placeholder="0,00" value={aVal} onChange={(e) => onA(e.target.value)} />
      </td>
      <td className="px-3 py-2">
        <input className={money} inputMode="decimal" placeholder="0,00" value={bVal} onChange={(e) => onB(e.target.value)} />
      </td>
      <td className="px-3 py-2 text-right">
        <input className={qtd} inputMode="numeric" placeholder="0" value={q} onChange={(e) => onQ(e.target.value)} />
      </td>
      <td className="px-5 py-2 text-right font-medium">
        {temDiff ? (
          <span className="text-danger">{formatBRL(diff)}</span>
        ) : (
          <span className="text-slate-300">—</span>
        )}
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
