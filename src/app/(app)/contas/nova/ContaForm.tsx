'use client'

import { useActionState, useState, useTransition } from 'react'
import { criarConta, criarFornecedorRapido, type ContaState } from '../actions'
import { Card, Field, inputClass, btnPrimary, btnGhost } from '@/components/ui'
import { ORIGENS_PAGAMENTO } from '@/lib/types'

type Opt = { id: string; nome: string }
type Forn = { id: string; razao_social: string }

const CATEGORIAS_EXEMPLO = [
  'Produtos de limpeza',
  'Produtos para lavagens',
  'Serviços de limpeza',
  'Manutenção elétrica',
]

export function ContaForm({
  unidades,
  centros,
  tipos,
  fornecedores,
  categorias,
  hoje,
}: {
  unidades: Opt[] | null
  centros: Opt[]
  tipos: Opt[]
  fornecedores: Forn[]
  categorias: string[]
  hoje: string
}) {
  const [state, formAction, pending] = useActionState<ContaState, FormData>(criarConta, {})
  const [lista, setLista] = useState<Forn[]>(fornecedores)
  const [fornecedorId, setFornecedorId] = useState('')
  const [modal, setModal] = useState(false)

  const catSugestoes = [...new Set([...CATEGORIAS_EXEMPLO, ...categorias])]

  function onNovo(f: Forn) {
    setLista((l) => [f, ...l].sort((a, b) => a.razao_social.localeCompare(b.razao_social)))
    setFornecedorId(f.id)
    setModal(false)
  }

  return (
    <Card>
      <form action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {unidades && (
          <Field label="Unidade" htmlFor="unidade_id">
            <select id="unidade_id" name="unidade_id" required className={inputClass} defaultValue="">
              <option value="">Selecione…</option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Fornecedor" htmlFor="fornecedor_id" hint="Opcional">
          <div className="flex gap-2">
            <select
              id="fornecedor_id"
              name="fornecedor_id"
              className={inputClass}
              value={fornecedorId}
              onChange={(e) => setFornecedorId(e.target.value)}
            >
              <option value="">— Sem fornecedor —</option>
              {lista.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.razao_social}
                </option>
              ))}
            </select>
            <button type="button" onClick={() => setModal(true)} className={btnGhost} title="Cadastrar novo fornecedor">
              ＋ Novo
            </button>
          </div>
        </Field>

        <Field label="Centro de custo" htmlFor="centro_custo_id">
          <select id="centro_custo_id" name="centro_custo_id" required className={inputClass} defaultValue="">
            <option value="">Selecione…</option>
            {centros.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Tipo de despesa" htmlFor="tipo_despesa_id">
          <select id="tipo_despesa_id" name="tipo_despesa_id" required className={inputClass} defaultValue="">
            <option value="">Selecione…</option>
            {tipos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Data do pagamento" htmlFor="data">
          <input id="data" name="data" type="date" required defaultValue={hoje} className={inputClass} />
        </Field>

        <Field label="Nº da nota / cupom" htmlFor="numero_nota" hint="Opcional">
          <input id="numero_nota" name="numero_nota" className={inputClass} placeholder="Ex.: 12345" />
        </Field>

        <Field label="Valor (R$)" htmlFor="valor">
          <input id="valor" name="valor" inputMode="decimal" required placeholder="0,00" className={inputClass} />
        </Field>

        <Field label="Origem do pagamento" htmlFor="origem_pagamento">
          <select id="origem_pagamento" name="origem_pagamento" required className={inputClass} defaultValue="">
            <option value="">Selecione…</option>
            {ORIGENS_PAGAMENTO.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </Field>

        <div className="sm:col-span-2">
          {state.erro && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{state.erro}</p>}
          <button type="submit" disabled={pending} className={btnPrimary}>
            {pending ? 'Salvando…' : 'Registrar pagamento'}
          </button>
        </div>
      </form>

      {modal && <NovoFornecedorModal categorias={catSugestoes} onClose={() => setModal(false)} onCriado={onNovo} />}
    </Card>
  )
}

function NovoFornecedorModal({
  categorias,
  onClose,
  onCriado,
}: {
  categorias: string[]
  onClose: () => void
  onCriado: (f: Forn) => void
}) {
  const [pending, startTransition] = useTransition()
  const [erro, setErro] = useState('')
  const [f, setF] = useState({ razao_social: '', categoria: '', cnpj: '', contato: '', telefone: '', email: '' })
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value })

  function salvar() {
    setErro('')
    if (!f.razao_social.trim()) {
      setErro('Informe a razão social.')
      return
    }
    startTransition(async () => {
      const r = await criarFornecedorRapido(f)
      if (r.erro) setErro(r.erro)
      else if (r.ok) onCriado(r.ok)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 text-left">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <h3 className="mb-4 text-lg font-bold text-brand-dark">Novo fornecedor</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Razão social" htmlFor="f-razao">
              <input id="f-razao" value={f.razao_social} onChange={set('razao_social')} className={inputClass} placeholder="Obrigatório" />
            </Field>
          </div>
          <Field label="Categoria" htmlFor="f-cat" hint="Digite ou escolha">
            <input id="f-cat" list="cat-sugestoes" value={f.categoria} onChange={set('categoria')} className={inputClass} placeholder="Ex.: Produtos de limpeza" />
            <datalist id="cat-sugestoes">
              {categorias.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field label="CNPJ" htmlFor="f-cnpj">
            <input id="f-cnpj" value={f.cnpj} onChange={set('cnpj')} className={inputClass} placeholder="Opcional" />
          </Field>
          <Field label="Contato" htmlFor="f-contato">
            <input id="f-contato" value={f.contato} onChange={set('contato')} className={inputClass} placeholder="Opcional" />
          </Field>
          <Field label="Telefone" htmlFor="f-tel">
            <input id="f-tel" value={f.telefone} onChange={set('telefone')} className={inputClass} placeholder="Opcional" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="E-mail" htmlFor="f-email">
              <input id="f-email" value={f.email} onChange={set('email')} className={inputClass} placeholder="Opcional" />
            </Field>
          </div>
        </div>
        {erro && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{erro}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={pending} className={btnGhost}>
            Cancelar
          </button>
          <button type="button" onClick={salvar} disabled={pending} className={btnPrimary}>
            {pending ? 'Salvando…' : 'Salvar e selecionar'}
          </button>
        </div>
      </div>
    </div>
  )
}
