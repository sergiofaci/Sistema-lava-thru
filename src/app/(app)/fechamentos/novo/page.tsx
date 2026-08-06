import Link from 'next/link'
import { requireUsuario } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui'
import { FechamentoForm } from './FechamentoForm'

export default async function NovoFechamentoPage() {
  const usuario = await requireUsuario()
  const supabase = await createClient()

  const { data: tipos } = await supabase
    .from('tipos_lavagem')
    .select('id, nome')
    .eq('ativo', true)
    .order('ordem')

  // Admin escolhe a unidade; gerente/caixa têm a sua fixa.
  let unidades: { id: string; nome: string }[] | null = null
  if (usuario.papel === 'admin') {
    const { data } = await supabase
      .from('unidades')
      .select('id, nome')
      .eq('ativo', true)
      .order('nome')
    unidades = data ?? []
  }

  // Sugere o turno pelo horário atual (manhã até 14h, tarde depois).
  const horaSP = Number(
    new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      hour12: false,
    }).format(new Date()),
  )
  const turnoPadrao: 'manha' | 'tarde' = horaSP < 14 ? 'manha' : 'tarde'

  return (
    <div>
      <PageHeader
        titulo="Novo Fechamento de Caixa"
        descricao="Confira os valores da maquininha com os do sistema."
        acao={
          <Link href="/fechamentos" className="text-sm text-brand hover:underline">
            ← Voltar
          </Link>
        }
      />
      <FechamentoForm
        tipos={tipos ?? []}
        unidades={unidades}
        unidadeFixaNome={usuario.unidade?.nome ?? '—'}
        turnoPadrao={turnoPadrao}
      />
    </div>
  )
}
