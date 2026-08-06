import Link from 'next/link'
import { requirePapel } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui'
import { ContaForm } from './ContaForm'

export default async function NovaContaPage() {
  const usuario = await requirePapel('admin', 'gerente')
  const supabase = await createClient()

  const [{ data: centros }, { data: tipos }] = await Promise.all([
    supabase.from('centros_custo').select('id, nome').eq('ativo', true).order('nome'),
    supabase.from('tipos_despesa').select('id, nome').eq('ativo', true).order('nome'),
  ])

  let unidades: { id: string; nome: string }[] | null = null
  if (usuario.papel === 'admin') {
    const { data } = await supabase.from('unidades').select('id, nome').eq('ativo', true).order('nome')
    unidades = data ?? []
  }

  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())

  return (
    <div className="max-w-3xl">
      <PageHeader
        titulo="Novo Pagamento"
        descricao="Registre uma despesa paga."
        acao={
          <Link href="/contas" className="text-sm text-brand hover:underline">
            ← Voltar
          </Link>
        }
      />
      <ContaForm unidades={unidades} centros={centros ?? []} tipos={tipos ?? []} hoje={hoje} />
    </div>
  )
}
