'use client'

import { useMemo, useState, useTransition } from 'react'
import { Card, Field, inputClass, btnPrimary } from '@/components/ui'
import { formatBRL } from '@/lib/money'
import { importarHistorico, type LinhaImport } from './actions'

type Unidade = { id: string; nome: string }
type Agg = { mes: string; item: string; quantidade: number; valor: number }

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()

const MESES: Record<string, string> = {
  janeiro: '01', jan: '01', fevereiro: '02', fev: '02', marco: '03', mar: '03',
  abril: '04', abr: '04', maio: '05', mai: '05', junho: '06', jun: '06',
  julho: '07', jul: '07', agosto: '08', ago: '08', setembro: '09', set: '09',
  outubro: '10', out: '10', novembro: '11', nov: '11', dezembro: '12', dez: '12',
}

function mesNumero(v: string): string | null {
  const s = norm(v)
  if (/^\d{1,2}$/.test(s)) {
    const n = parseInt(s, 10)
    return n >= 1 && n <= 12 ? String(n).padStart(2, '0') : null
  }
  return MESES[s] ?? null
}

function anoNumero(v: string): string | null {
  const s = v.trim()
  if (/^\d{4}$/.test(s)) return s
  if (/^\d{2}$/.test(s)) return '20' + s
  return null
}

// Retorna 'YYYY-MM-01' a partir de uma "Competência" livre.
function parseCompetencia(v: string): string | null {
  const s = v.trim()
  let m = s.match(/^(\d{4})[-/.](\d{1,2})/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-01`
  m = s.match(/^(\d{1,2})[-/.](\d{4})$/)
  if (m) return `${m[2]}-${m[1].padStart(2, '0')}-01`
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/) // DD/MM/AAAA
  if (m) {
    const ano = anoNumero(m[3])
    return ano ? `${ano}-${m[2].padStart(2, '0')}-01` : null
  }
  m = s.match(/^([a-zç]+)[-/. ]+(\d{2,4})$/i) // jan/25, janeiro 2025
  if (m) {
    const mm = mesNumero(m[1])
    const ano = anoNumero(m[2])
    return mm && ano ? `${ano}-${mm}-01` : null
  }
  return null
}

function splitLinha(line: string, delim: string): string[] {
  const out: string[] = []
  let cur = ''
  let q = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      if (q && line[i + 1] === '"') {
        cur += '"'
        i++
      } else q = !q
    } else if (c === delim && !q) {
      out.push(cur)
      cur = ''
    } else cur += c
  }
  out.push(cur)
  return out.map((s) => s.trim())
}

function parseValor(v: string): number {
  const t = v.replace(/[R$\s]/g, '').trim()
  if (!t) return 0
  let n: number
  if (t.includes(',') && t.includes('.')) n = Number(t.replace(/\./g, '').replace(',', '.'))
  else if (t.includes(',')) n = Number(t.replace(',', '.'))
  else n = Number(t)
  return Number.isFinite(n) ? n : 0
}

export function Importador({ unidades }: { unidades: Unidade[] }) {
  const [unidadeId, setUnidadeId] = useState('')
  const [tipo, setTipo] = useState<'lavagens' | 'assinaturas'>('lavagens')
  const [texto, setTexto] = useState('')
  const [pending, startTransition] = useTransition()
  const [resultado, setResultado] = useState<{ ok?: string; erro?: string } | null>(null)

  const analise = useMemo(() => {
    const linhas = texto.split(/\r?\n/).filter((l) => l.trim() !== '')
    if (linhas.length < 2) return null
    const head = linhas[0]
    const delim = ['\t', ';', ','].sort((a, b) => head.split(b).length - head.split(a).length)[0]
    const cols = splitLinha(head, delim).map(norm)
    const idx = (nome: string) => cols.indexOf(nome)

    const iAno = idx('ano')
    const iMes = idx('mes')
    const iComp = idx('competencia')
    const iItem = tipo === 'lavagens' ? idx('tipo') : idx('plano')
    const iValor = tipo === 'lavagens' ? idx('valor cobrado') : idx('valor mensal')

    const faltando: string[] = []
    if (iItem < 0) faltando.push(tipo === 'lavagens' ? 'Tipo' : 'Plano')
    if (iValor < 0) faltando.push(tipo === 'lavagens' ? 'Valor Cobrado' : 'Valor Mensal')
    if (tipo === 'lavagens' ? iAno < 0 && iComp < 0 : iComp < 0)
      faltando.push(tipo === 'lavagens' ? 'Ano/Mês ou Competência' : 'Competência')

    const mapa = new Map<string, Agg>()
    let ignoradas = 0
    let transacoes = 0
    if (faltando.length === 0) {
      for (let i = 1; i < linhas.length; i++) {
        const f = splitLinha(linhas[i], delim)
        transacoes++
        let mes: string | null = null
        if (tipo === 'lavagens' && iAno >= 0 && iMes >= 0) {
          const ano = anoNumero(f[iAno] ?? '')
          const mm = mesNumero(f[iMes] ?? '')
          mes = ano && mm ? `${ano}-${mm}-01` : null
        }
        if (!mes && iComp >= 0) mes = parseCompetencia(f[iComp] ?? '')
        const item = (f[iItem] ?? '').trim()
        if (!mes || !item) {
          ignoradas++
          continue
        }
        const valor = parseValor(f[iValor] ?? '')
        const chave = `${mes}|${item}`
        const a = mapa.get(chave) ?? { mes, item, quantidade: 0, valor: 0 }
        a.quantidade += 1
        a.valor = Math.round((a.valor + valor) * 100) / 100
        mapa.set(chave, a)
      }
    }
    const rows = [...mapa.values()].sort((a, b) => a.mes.localeCompare(b.mes) || a.item.localeCompare(b.item))
    const totalValor = rows.reduce((s, r) => s + r.valor, 0)
    const meses = new Set(rows.map((r) => r.mes)).size
    return { rows, totalValor, meses, transacoes, ignoradas, faltando }
  }, [texto, tipo])

  const categoria = tipo === 'lavagens' ? 'lavagem' : 'assinatura'

  function importar() {
    if (!unidadeId) {
      setResultado({ erro: 'Selecione a unidade.' })
      return
    }
    if (!analise || analise.rows.length === 0) {
      setResultado({ erro: 'Nada para importar. Confira a prévia.' })
      return
    }
    const linhas: LinhaImport[] = analise.rows.map((r) => ({
      mes: r.mes,
      categoria,
      item: r.item,
      quantidade: r.quantidade,
      valor: r.valor,
    }))
    setResultado(null)
    startTransition(async () => {
      const r = await importarHistorico({ unidade_id: unidadeId, linhas })
      setResultado(r)
      if (r.ok) setTexto('')
    })
  }

  const mesBR = (m: string) => {
    const [y, mm] = m.split('-')
    return `${mm}/${y}`
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Unidade" htmlFor="uni">
            <select id="uni" className={inputClass} value={unidadeId} onChange={(e) => setUnidadeId(e.target.value)}>
              <option value="">Selecione…</option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tipo de planilha" htmlFor="tipo">
            <select id="tipo" className={inputClass} value={tipo} onChange={(e) => setTipo(e.target.value as 'lavagens' | 'assinaturas')}>
              <option value="lavagens">Lavagens (detalhado)</option>
              <option value="assinaturas">Assinaturas mensais</option>
            </select>
          </Field>
        </div>
        <div className="mt-4">
          <Field
            label="Cole os dados da planilha (com o cabeçalho)"
            htmlFor="dados"
            hint="Copie as células no Excel e cole aqui (separado por TAB). Também aceita CSV com ; ou ,"
          >
            <textarea
              id="dados"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={8}
              className={`${inputClass} font-mono text-xs`}
              placeholder={
                tipo === 'lavagens'
                  ? 'Competência\tAno\tMês\tData\t...\tTipo\t...\tValor Cobrado\tOrigem'
                  : 'Competência\tData de Adesão\tPlano\tPlaca\tTipo\tCliente\tValor Mensal'
              }
            />
          </Field>
        </div>
      </Card>

      {analise && analise.faltando.length > 0 && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-warning">
          Não encontrei a(s) coluna(s): <strong>{analise.faltando.join(', ')}</strong>. Confira se o
          cabeçalho foi colado junto e se o tipo de planilha está certo.
        </p>
      )}

      {analise && analise.faltando.length === 0 && (
        <Card className="p-0">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-3">
            <div>
              <h2 className="font-semibold text-brand-dark">Prévia da importação</h2>
              <p className="text-xs text-slate-500">
                {analise.transacoes} transação(ões) → {analise.rows.length} item(ns) em {analise.meses} mês(es) ·{' '}
                total {formatBRL(analise.totalValor)}
                {analise.ignoradas > 0 && (
                  <span className="text-warning"> · {analise.ignoradas} linha(s) ignorada(s) (sem mês/item)</span>
                )}
              </p>
            </div>
            <button type="button" onClick={importar} disabled={pending || analise.rows.length === 0} className={btnPrimary}>
              {pending ? 'Importando…' : `Importar (${categoria})`}
            </button>
          </div>
          <div className="max-h-80 overflow-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-2 font-medium">Mês</th>
                  <th className="px-5 py-2 font-medium">Item</th>
                  <th className="px-5 py-2 text-right font-medium">Qtd.</th>
                  <th className="px-5 py-2 text-right font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {analise.rows.map((r) => (
                  <tr key={`${r.mes}|${r.item}`} className="border-b border-slate-100 last:border-0">
                    <td className="px-5 py-2 text-slate-600">{mesBR(r.mes)}</td>
                    <td className="px-5 py-2 text-slate-700">{r.item}</td>
                    <td className="px-5 py-2 text-right text-slate-600">{r.quantidade}</td>
                    <td className="px-5 py-2 text-right font-medium text-slate-700">{formatBRL(r.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {resultado?.ok && <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-success">✓ {resultado.ok}</p>}
      {resultado?.erro && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-danger">{resultado.erro}</p>}
    </div>
  )
}
