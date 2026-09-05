import { revalidatePath } from 'next/cache'
import { requirePapel } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { CrudManager } from '@/components/CrudManager'
import { crudInserir, crudAtualizar, crudToggle, crudExcluir } from '@/lib/crud-helpers'

const ROTA = '/cadastros/tipos-despesa'
const TABELA = 'tipos_despesa'
const ROTULO = 'Tipo de despesa'

const GRUPOS_DRE = ['deducao', 'cmv', 'operacional', 'financeira', 'imposto'] as const
const COMPORTAMENTOS = ['fixo', 'variavel', 'deducao', 'nao_aplicavel'] as const
// Escopo de módulo: server actions inline não podem capturar função local.
const normGrupo = (v: unknown) => {
  const s = String(v ?? '')
  return (GRUPOS_DRE as readonly string[]).includes(s) ? s : 'operacional'
}
const normComport = (v: unknown) => {
  const s = String(v ?? '')
  return (COMPORTAMENTOS as readonly string[]).includes(s) ? s : 'fixo'
}
const normExibir = (v: unknown) => String(v ?? '') !== 'nao'

export default async function Page() {
  await requirePapel('admin')
  const s = await createClient()
  const { data } = await s.from(TABELA).select('id, nome, grupo_dre, comportamento, exibir_na_dre, ativo').order('nome')
  // exibir_na_dre é boolean no banco; o form usa 'sim'/'nao' — normalizamos para exibir na listagem.
  const itens = (data ?? []).map((t) => ({ ...t, exibir_na_dre: t.exibir_na_dre === false ? 'nao' : 'sim' }))

  async function criar(_p: { ok?: string; erro?: string }, fd: FormData) {
    'use server'
    const nome = String(fd.get('nome') ?? '').trim()
    if (!nome) return { erro: 'Informe o nome.' }
    const payload = { nome, grupo_dre: normGrupo(fd.get('grupo_dre')), comportamento: normComport(fd.get('comportamento')), exibir_na_dre: normExibir(fd.get('exibir_na_dre')) }
    const r = await crudInserir(TABELA, payload, ROTULO)
    if (r.ok) revalidatePath(ROTA)
    return r
  }
  async function atualizar(_p: { ok?: string; erro?: string }, fd: FormData) {
    'use server'
    const id = String(fd.get('id'))
    const nome = String(fd.get('nome') ?? '').trim()
    if (!nome) return { erro: 'Informe o nome.' }
    const payload = { nome, grupo_dre: normGrupo(fd.get('grupo_dre')), comportamento: normComport(fd.get('comportamento')), exibir_na_dre: normExibir(fd.get('exibir_na_dre')) }
    const r = await crudAtualizar(TABELA, id, payload, ROTULO)
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
      titulo="Tipos de Despesa"
      descricao="Plano de contas. O grupo na DRE define em qual linha da demonstração cada tipo entra."
      fields={[
        { name: 'nome', label: 'Nome', required: true, placeholder: 'Ex.: Energia, ISS, Detergente' },
        {
          name: 'grupo_dre',
          label: 'Grupo na DRE',
          type: 'select',
          required: true,
          defaultValue: 'operacional',
          hint: 'Onde entra na DRE',
          options: [
            { value: 'deducao', label: 'Dedução (ISS, PIS/COFINS)' },
            { value: 'cmv', label: 'CMV / CSV (custo variável)' },
            { value: 'operacional', label: 'Despesa operacional / fixa' },
            { value: 'financeira', label: 'Despesa financeira (juros)' },
            { value: 'imposto', label: 'Imposto sobre o resultado' },
          ],
        },
        {
          name: 'comportamento',
          label: 'Comportamento',
          type: 'select',
          required: true,
          defaultValue: 'fixo',
          hint: 'Fixo × variável',
          options: [
            { value: 'fixo', label: 'Fixo' },
            { value: 'variavel', label: 'Variável' },
            { value: 'deducao', label: 'Dedução' },
            { value: 'nao_aplicavel', label: 'Não aplicável' },
          ],
        },
        {
          name: 'exibir_na_dre',
          label: 'Entra na DRE?',
          type: 'select',
          required: true,
          defaultValue: 'sim',
          hint: 'Não = passivo/repasse, não é resultado',
          options: [
            { value: 'sim', label: 'Sim' },
            { value: 'nao', label: 'Não' },
          ],
        },
      ]}
      itens={itens}
      criar={criar}
      atualizar={atualizar}
      alternarAtivo={alternarAtivo}
      excluir={excluir}
    />
  )
}
