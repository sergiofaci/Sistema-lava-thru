// Módulos configuráveis (o admin escolhe quais cada cargo acessa).
export const MODULOS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'dre', label: 'DRE / Resultado' },
  { key: 'fechamentos', label: 'Fechamento de Caixa' },
  { key: 'fechamentos_historico', label: 'Histórico de Fechamentos' },
  { key: 'contas', label: 'Contas a Pagar' },
  { key: 'estoque', label: 'Estoque e Consumo' },
  { key: 'bonificacoes', label: 'Bonificações' },
] as const

export type ModuloKey = (typeof MODULOS)[number]['key']

// Padrão de acesso quando ainda não configurado (admin sempre vê tudo).
export const PADRAO: Record<'gerente' | 'caixa', ModuloKey[]> = {
  gerente: ['dashboard', 'dre', 'fechamentos', 'fechamentos_historico', 'contas', 'estoque', 'bonificacoes'],
  caixa: ['fechamentos'],
}
