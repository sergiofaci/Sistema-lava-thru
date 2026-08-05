import { requirePapel } from '@/lib/auth'
import { PageHeader, Card } from '@/components/ui'

export default async function Page() {
  await requirePapel('admin', 'gerente')
  return (
    <div>
      <PageHeader titulo="Contas a Pagar" descricao="Lançamento e consulta de despesas." />
      <Card>
        <p className="text-sm text-slate-600">
          Módulo em construção (<strong>Fase 3</strong>): lançamento por centro de custo, tipo de
          despesa e origem do pagamento, com consulta filtrável.
        </p>
      </Card>
    </div>
  )
}
