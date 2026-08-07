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

// Fechamento é feito 2x ao dia (fim do turno da manhã e da tarde)
export type Turno = 'manha' | 'tarde'
export const TURNO_LABEL: Record<Turno, string> = {
  manha: 'Manhã',
  tarde: 'Tarde',
}

// Cargos dos colaboradores (base das bonificações)
export type Cargo = 'caixa' | 'aux_limpeza' | 'aux_maquina' | 'gerente'
export const CARGO_LABEL: Record<Cargo, string> = {
  caixa: 'Caixa',
  aux_limpeza: 'Aux. de Limpeza Interna',
  aux_maquina: 'Aux. de Lavagem (Máquina)',
  gerente: 'Gerente / Supervisor',
}

export function podeGerenciarCadastros(papel: Papel) {
  return papel === 'admin'
}

export function podeLancarDespesasEstoque(papel: Papel) {
  return papel === 'admin' || papel === 'gerente'
}
