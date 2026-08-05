import { revalidatePath } from 'next/cache'
import { requirePapel } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { CadastroSimples } from '@/components/CadastroSimples'

const ROTA = '/cadastros/tipos-despesa'
const TABELA = 'tipos_despesa'

export default async function Page() {
  await requirePapel('admin')
  const supabase = await createClient()
  const { data } = await supabase.from(TABELA).select('id, nome, ativo').order('nome')

  async function criar(formData: FormData) {
    'use server'
    await requirePapel('admin')
    const nome = String(formData.get('nome') ?? '').trim()
    if (!nome) return
    const s = await createClient()
    await s.from(TABELA).insert({ nome })
    revalidatePath(ROTA)
  }

  async function alternarAtivo(formData: FormData) {
    'use server'
    await requirePapel('admin')
    const id = String(formData.get('id'))
    const ativo = formData.get('ativo') === '1'
    const s = await createClient()
    await s.from(TABELA).update({ ativo }).eq('id', id)
    revalidatePath(ROTA)
  }

  return (
    <CadastroSimples
      titulo="Tipos de Despesa"
      descricao="Plano de contas. Ex.: Manutenção, Água, Energia, Salários."
      itens={data ?? []}
      criar={criar}
      alternarAtivo={alternarAtivo}
    />
  )
}
