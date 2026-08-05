export type Papel = 'admin' | 'gerente' | 'caixa'

export const PAPEL_LABEL: Record<Papel, string> = {
  admin: 'Administrador',
  gerente: 'Gerente de Unidade',
  caixa: 'Caixa/Colaborador',
}

export type Usuario = {
  id: string
  nome: string
  email: string
  papel: Papel
  unidade_id: string | null
  ativo: boolean
}

export type UsuarioComUnidade = Usuario & {
  unidade: { id: string; nome: string } | null
}

// Formas de pagamento comparáveis (têm contraparte na maquininha)
export const FORMAS_COMPARAVEIS = ['pix', 'credito', 'debito'] as const

// Origens de pagamento (contas a pagar)
export const ORIGENS_PAGAMENTO = [
  'Caixa',
  'Cartão Empresa',
  'Conta Bancária Sicoob',
  'Conta Bancária Itaú',
  'Cartão PF',
] as const

export const MAQUINAS_CARTAO = ['Rede Card', 'Sipag'] as const

export function podeGerenciarCadastros(papel: Papel) {
  return papel === 'admin'
}

export function podeLancarDespesasEstoque(papel: Papel) {
  return papel === 'admin' || papel === 'gerente'
}
