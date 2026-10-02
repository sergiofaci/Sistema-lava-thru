import { revalidatePath } from 'next/cache'
import { requirePapel } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { CrudManager } from '@/components/CrudManager'
import { crudInserir, crudAtualizar, crudToggle, crudExcluir } from '@/lib/crud-helpers'

const ROTA = '/cadastros/bonificacoes'
const TABELA = 'bonificacao_regras'
const ROTULO = 'Regra de bonificação'

const CARGOS = ['caixa', 'aux_maquina', 'aux_limpeza'] as const
const RATEIOS = ['individual', 'pool_cargo', 'pool_turno'] as const

const valorNum = (v: unknown) => {
  const s = String(v ?? '').trim().replace(/\./g, '').replace(',', '.')
  const n = Number(/[.,]/.test(String(v ?? '')) ? s : String(v ?? ''))
  return Number.isFinite(n) && n >= 0 ? n : 0
}

export default async function Page() {
  await requirePapel('admin')
  const s = await createClient()

  const [{ data: regras }, { data: tipos }] = await Promise.all([
    s.from(TABELA).select('id, tipo_lavagem_id, cargo, valor, rateio, ativo').order('criado_em'),
    s.from('tipos_lavagem').select('id, nome').eq('ativo', true).order('ordem'),
  ])

  const tipoOptions = (tipos ?? []).map((t) => ({ value: t.id, label: t.nome }))
  const cargoOptions = [
    { value: 'caixa', label: 'Caixa (individual)' },
    { value: 'aux_maquina', label: 'Aux. Máquina (pool)' },
    { value: 'aux_limpeza', label: 'Aux. Limpeza (pool por turno)' },
  ]
  const rateioOptions = [
    { value: 'individual', label: 'Individual (quem registrou)' },
    { value: 'pool_cargo', label: 'Pool do cargo na unidade' },
    { value: 'pool_turno', label: 'Pool por turno' },
  ]

  function ler(fd: FormData) {
    const tipo_lavagem_id = String(fd.get('tipo_lavagem_id') ?? '').trim()
    const cargo = String(fd.get('cargo') ?? '').trim()
    const rateio = String(fd.get('rateio') ?? '').trim()
    const valor = valorNum(fd.get('valor'))
    if (!tipo_lavagem_id) return { erro: 'Selecione o tipo.' }
    if (!CARGOS.includes(cargo as (typeof CARGOS)[number])) return { erro: 'Selecione o cargo.' }
    if (!RATEIOS.includes(rateio as (typeof RATEIOS)[number])) return { erro: 'Selecione o rateio.' }
    if (!(valor > 0)) return { erro: 'Informe um valor maior que zero.' }
    return { valores: { tipo_lavagem_id, cargo, rateio, valor } }
  }

  async function criar(_p: { ok?: string; erro?: string }, fd: FormData) {
    'use server'
    const p = ler(fd)
    if (p.erro) return { erro: p.erro }
    const r = await crudInserir(TABELA, p.valores!, ROTULO)
    if (r.ok) revalidatePath(ROTA)
    return r
  }
  async function atualizar(_p: { ok?: string; erro?: string }, fd: FormData) {
    'use server'
    const p = ler(fd)
    if (p.erro) return { erro: p.erro }
    const r = await crudAtualizar(TABELA, String(fd.get('id')), p.valores!, ROTULO)
    if (r.ok) revalidatePath(ROTA)
    return r
  }
  async function alternarAtivo(fd: FormData) {
    'use server'
    const r = await crudToggle(TABELA, String(fd.get('id')), fd.get('ativo') === '1')
    if (!r.erro) revalidatePath(ROTA)
    return r
  }
  async function excluir(fd: FormData) {
    'use server'
    const r = await crudExcluir(TABELA, String(fd.get('id')))
    if (!r.erro) revalidatePath(ROTA)
    return r
  }

  return (
    <CrudManager
      titulo="Bonificações por tipo"
      descricao="Defina quais lavagens/serviços geram bônus, para qual cargo, o valor (R$ por unidade) e a forma de rateio. Um tipo pode ter mais de uma regra."
      fields={[
        { name: 'tipo_lavagem_id', label: 'Tipo', type: 'select', required: true, options: tipoOptions },
        { name: 'cargo', label: 'Cargo', type: 'select', required: true, options: cargoOptions },
        { name: 'valor', label: 'Valor (R$/un.)', type: 'number', defaultValue: 0, hint: 'Por lavagem/serviço' },
        { name: 'rateio', label: 'Rateio', type: 'select', required: true, defaultValue: 'individual', options: rateioOptions },
      ]}
      itens={regras ?? []}
      criar={criar}
      atualizar={atualizar}
      alternarAtivo={alternarAtivo}
      excluir={excluir}
    />
  )
}
