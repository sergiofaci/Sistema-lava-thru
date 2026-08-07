import Link from 'next/link'
import { requireModulo } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui'
import { MovimentoForm } from '../MovimentoForm'
import { registrarBaixa } from '../actions'

export default async function BaixaPage() {
  const usuario = await requireModulo('estoque')
  const supabase = await createClient()

  const [{ data: produtos }, { data: locais }] = await Promise.all([
    supabase.from('produtos').select('id, nome, unidade_medida').eq('ativo', true).order('nome'),
    supabase.from('locais_uso').select('id, nome').eq('ativo', true).order('nome'),
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
        titulo="Baixa de Estoque"
        descricao="Registre o consumo diário de produtos."
        acao={
          <Link href="/estoque" className="text-sm text-brand hover:underline">
            ← Voltar
          </Link>
        }
      />
      <MovimentoForm
        acao={registrarBaixa}
        produtos={produtos ?? []}
        unidades={unidades}
        unidadeFixaNome={usuario.unidade?.nome ?? '—'}
        locais={locais ?? []}
        hoje={hoje}
        submitLabel="Registrar baixa"
      />
    </div>
  )
}
