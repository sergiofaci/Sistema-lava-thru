import { redirect } from 'next/navigation'
import { requireUsuario } from '@/lib/auth'
import { PageHeader, Card } from '@/components/ui'

export default async function DashboardPage() {
  const usuario = await requireUsuario()

  // Caixa não tem dashboard — vai direto para o fechamento.
  if (usuario.papel === 'caixa') redirect('/fechamentos')

  return (
    <div>
      <PageHeader
        titulo={`Olá, ${usuario.nome.split(' ')[0]}`}
        descricao="Painel gerencial — indicadores de faturamento, despesas e estoque."
      />
      <Card>
        <p className="text-sm text-slate-600">
          O dashboard com faturamento do dia/mês, lavagens por tipo, despesas por categoria e
          consumo de produtos será construído na <strong>Fase 5</strong>. A fundação (login,
          controle de acesso e cadastros) já está no ar.
        </p>
      </Card>
    </div>
  )
}
