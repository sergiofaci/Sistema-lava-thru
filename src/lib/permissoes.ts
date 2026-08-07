import { createClient } from '@/lib/supabase/server'
import { MODULOS, PADRAO, type ModuloKey } from '@/lib/modulos'
import type { UsuarioComUnidade } from '@/lib/types'

// Conjunto de módulos que o usuário pode acessar.
export async function modulosDoUsuario(usuario: UsuarioComUnidade): Promise<Set<string>> {
  if (usuario.papel === 'admin') return new Set(MODULOS.map((m) => m.key))

  const supabase = await createClient()
  const { data } = await supabase
    .from('permissoes_modulo')
    .select('modulo, permitido')
    .eq('papel', usuario.papel)

  if (!data || data.length === 0) {
    // ainda não configurado → usa o padrão
    return new Set(PADRAO[usuario.papel as 'gerente' | 'caixa'] ?? [])
  }
  return new Set(data.filter((r) => r.permitido).map((r) => r.modulo))
}

export function temModulo(mods: Set<string>, modulo: ModuloKey): boolean {
  return mods.has(modulo)
}
