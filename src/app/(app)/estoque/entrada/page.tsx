import Link from 'next/link'
import { requireModulo } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui'
import { MovimentoForm } from '../MovimentoForm'
import { registrarEntrada } from '../actions'

export default async function EntradaPage() {
  const usuario = await requireModulo('estoque')
  const supabase = await createClient()

  const { data: produtos } = await supabase
    .from('produtos')
    .select('id, nome, unidade_medida')
    .eq('ativo', true)
    .order('nome')

  let unidades: { id: string; nome: string }[] | null = null
  if (usuario.papel === 'admin') {
    const { data } = await supabase.from('unidades').select('id, nome').eq('ativo', true).order('nome')
    unidades = data ?? []
  }

  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())

  return (
    <div className="max-w-3xl">
      <PageHeader
        titulo="Entrada de Estoque"
        descricao="Registre a chegada/reposição de produtos."
        acao={
          <Link href="/estoque" className="text-sm text-brand hover:underline">
            ← Voltar
          </Link>
        }
      />
      <MovimentoForm
        acao={registrarEntrada}
        produtos={produtos ?? []}
        unidades={unidades}
        unidadeFixaNome={usuario.unidade?.nome ?? '—'}
        hoje={hoje}
        mostrarObservacao
        mostrarPreco
        submitLabel="Registrar entrada"
      />
    </div>
  )
}
