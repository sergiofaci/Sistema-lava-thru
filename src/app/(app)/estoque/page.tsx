import { requirePapel } from '@/lib/auth'
import { PageHeader, Card } from '@/components/ui'

export default async function Page() {
  await requirePapel('admin', 'gerente')
  return (
    <div>
      <PageHeader titulo="Estoque e Consumo" descricao="Entradas, baixas e saldo por unidade." />
      <Card>
        <p className="text-sm text-slate-600">
          Módulo em construção (<strong>Fase 4</strong>): entrada de produtos, baixa por local de
          uso e saldo com alerta de estoque mínimo.
        </p>
      </Card>
    </div>
  )
}
