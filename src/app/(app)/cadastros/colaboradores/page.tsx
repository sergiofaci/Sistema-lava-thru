import { revalidatePath } from 'next/cache'
import { requirePapel } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { CrudManager } from '@/components/CrudManager'
import { crudInserir, crudAtualizar, crudToggle, crudExcluir } from '@/lib/crud-helpers'

const ROTA = '/cadastros/colaboradores'
const TABELA = 'colaboradores'
const ROTULO = 'Colaborador'

const CARGOS = [
  { value: 'caixa', label: 'Caixa' },
  { value: 'aux_limpeza', label: 'Aux. de Limpeza Interna' },
  { value: 'aux_maquina', label: 'Aux. de Lavagem (Máquina)' },
  { value: 'gerente', label: 'Gerente / Supervisor' },
]
const TURNOS = [
  { value: 'manha', label: 'Manhã' },
  { value: 'tarde', label: 'Tarde' },
  { value: 'ambos', label: 'Ambos' },
]

export default async function Page() {
  await requirePapel('admin')
  const s = await createClient()
  const [{ data }, { data: unidades }] = await Promise.all([
    s.from(TABELA).select('id, nome, cargo, turno, unidade_id, data_admissao, ativo').order('nome'),
    s.from('unidades').select('id, nome').eq('ativo', true).order('nome'),
  ])
  const unidadeOpts = (unidades ?? []).map((u) => ({ value: u.id, label: u.nome }))

  function valores(fd: FormData) {
    return {
      nome: String(fd.get('nome') ?? '').trim(),
      cargo: String(fd.get('cargo') ?? '').trim(),
      turno: String(fd.get('turno') ?? 'ambos').trim(),
      unidade_id: String(fd.get('unidade_id') ?? '').trim(),
      data_admissao: String(fd.get('data_admissao') ?? '').trim() || null,
    }
  }

  async function criar(_p: { ok?: string; erro?: string }, fd: FormData) {
    'use server'
    const v = valores(fd)
    if (!v.nome || !v.cargo || !v.unidade_id) return { erro: 'Informe nome, cargo e unidade.' }
    const r = await crudInserir(TABELA, v, ROTULO)
    if (r.ok) revalidatePath(ROTA)
    return r
  }
  async function atualizar(_p: { ok?: string; erro?: string }, fd: FormData) {
    'use server'
    const v = valores(fd)
    if (!v.nome || !v.cargo || !v.unidade_id) return { erro: 'Informe nome, cargo e unidade.' }
    const r = await crudAtualizar(TABELA, String(fd.get('id')), v, ROTULO)
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
      titulo="Colaboradores"
      descricao="Equipe para o cálculo das bonificações (inclui pátio/máquina sem login)."
      fields={[
        { name: 'nome', label: 'Nome', required: true, placeholder: 'Nome completo' },
        { name: 'cargo', label: 'Cargo', type: 'select', required: true, options: CARGOS },
        { name: 'turno', label: 'Turno', type: 'select', required: true, defaultValue: 'ambos', options: TURNOS },
        { name: 'unidade_id', label: 'Unidade', type: 'select', required: true, options: unidadeOpts },
        { name: 'data_admissao', label: 'Admissão', type: 'date', hint: 'Para o gerente' },
      ]}
      itens={data ?? []}
      criar={criar}
      atualizar={atualizar}
      alternarAtivo={alternarAtivo}
      excluir={excluir}
    />
  )
}
