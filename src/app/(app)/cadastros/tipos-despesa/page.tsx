import { revalidatePath } from 'next/cache'
import { requirePapel } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { CrudManager } from '@/components/CrudManager'
import { crudInserir, crudAtualizar, crudToggle, crudExcluir } from '@/lib/crud-helpers'

const ROTA = '/cadastros/tipos-despesa'
const TABELA = 'tipos_despesa'
const ROTULO = 'Tipo de despesa'

const GRUPOS_DRE = ['deducao', 'cmv', 'operacional', 'financeira', 'imposto'] as const
// Escopo de módulo: server actions inline não podem capturar função local.
const normGrupo = (v: unknown) => {
  const s = String(v ?? '')
  return (GRUPOS_DRE as readonly string[]).includes(s) ? s : 'operacional'
}

export default async function Page() {
  await requirePapel('admin')
  const s = await createClient()
  const { data } = await s.from(TABELA).select('id, nome, grupo_dre, ativo').order('nome')

  async function criar(_p: { ok?: string; erro?: string }, fd: FormData) {
    'use server'
    const nome = String(fd.get('nome') ?? '').trim()
    if (!nome) return { erro: 'Informe o nome.' }
    const grupo_dre = normGrupo(fd.get('grupo_dre'))
    const r = await crudInserir(TABELA, { nome, grupo_dre }, ROTULO)
    if (r.ok) revalidatePath(ROTA)
    return r
  }
  async function atualizar(_p: { ok?: string; erro?: string }, fd: FormData) {
    'use server'
    const id = String(fd.get('id'))
    const nome = String(fd.get('nome') ?? '').trim()
    if (!nome) return { erro: 'Informe o nome.' }
    const grupo_dre = normGrupo(fd.get('grupo_dre'))
    const r = await crudAtualizar(TABELA, id, { nome, grupo_dre }, ROTULO)
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
      ]}
      itens={data ?? []}
      criar={criar}
      atualizar={atualizar}
      alternarAtivo={alternarAtivo}
      excluir={excluir}
    />
  )
}
