import { requirePapel } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui'
import { MODULOS, PADRAO } from '@/lib/modulos'
import { PermissoesForm } from './PermissoesForm'

export default async function Page() {
  await requirePapel('admin')
  const supabase = await createClient()
  const { data } = await supabase.from('permissoes_modulo').select('papel, modulo, permitido')

  const map = new Map((data ?? []).map((r) => [`${r.papel}:${r.modulo}`, r.permitido]))
  const atual: Record<string, boolean> = {}
  for (const papel of ['gerente', 'caixa'] as const) {
    for (const m of MODULOS) {
      const key = `${papel}:${m.key}`
      atual[key] = map.has(key) ? Boolean(map.get(key)) : PADRAO[papel].includes(m.key)
    }
  }

  return (
    <div>
      <PageHeader
        titulo="Permissões de Acesso"
        descricao="Escolha quais módulos cada cargo pode acessar. O administrador sempre vê tudo."
      />
      <PermissoesForm atual={atual} />
    </div>
  )
}
