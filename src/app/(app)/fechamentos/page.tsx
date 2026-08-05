import { requireUsuario } from '@/lib/auth'
import { PageHeader, Card } from '@/components/ui'

export default async function Page() {
  await requireUsuario()
  return (
    <div>
      <PageHeader titulo="Fechamento de Caixa" descricao="Conferência de valores por forma de pagamento." />
      <Card>
        <p className="text-sm text-slate-600">
          Módulo em construção (<strong>Fase 2</strong>): comparação máquina × sistema, alerta de
          diferença e registro de lavagens por tipo.
        </p>
      </Card>
    </div>
  )
}
