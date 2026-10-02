import Link from 'next/link'
import { requireModulo } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui'
import { ContaForm } from './ContaForm'

export default async function NovaContaPage() {
  const usuario = await requireModulo('contas')
  const supabase = await createClient()

  const [{ data: centros }, { data: tipos }, { data: fornecedores }] = await Promise.all([
    supabase.from('centros_custo').select('id, nome').eq('ativo', true).order('nome'),
    supabase.from('tipos_despesa').select('id, nome').eq('ativo', true).order('nome'),
    supabase.from('fornecedores').select('id, razao_social, categoria').eq('ativo', true).order('razao_social'),
  ])
  const categorias = [
    ...new Set((fornecedores ?? []).map((f) => (f.categoria ?? '').trim()).filter(Boolean)),
  ]

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
      <ContaForm
        unidades={unidades}
        centros={centros ?? []}
        tipos={tipos ?? []}
        fornecedores={(fornecedores ?? []).map((f) => ({ id: f.id, razao_social: f.razao_social }))}
        categorias={categorias}
        hoje={hoje}
      />
    </div>
  )
}
