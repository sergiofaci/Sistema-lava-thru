import { revalidatePath } from 'next/cache'
import { requirePapel } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { CadastroSimples } from '@/components/CadastroSimples'

const ROTA = '/cadastros/locais-uso'
const TABELA = 'locais_uso'

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
      titulo="Locais de Uso"
      descricao="Onde os produtos são consumidos. Ex.: Túnel, Limpeza Interna."
      itens={data ?? []}
      criar={criar}
      alternarAtivo={alternarAtivo}
    />
  )
}
