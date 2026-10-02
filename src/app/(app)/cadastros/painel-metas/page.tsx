import { requirePapel } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui'
import { CargoVisib } from './CargoVisib'

const CARGOS: { cargo: string; label: string }[] = [
  { cargo: 'caixa', label: 'Caixa' },
  { cargo: 'aux_maquina', label: 'Aux. de Máquina' },
  { cargo: 'aux_limpeza', label: 'Aux. de Limpeza' },
  { cargo: 'gerente', label: 'Gerente' },
]

export default async function Page() {
  await requirePapel('admin')
  const s = await createClient()

  const [{ data: tipos }, { data: itens }, { data: flags }] = await Promise.all([
    s.from('tipos_lavagem').select('id, nome, categoria').eq('ativo', true).order('ordem'),
    s.from('painel_cargo_item').select('cargo, tipo_lavagem_id'),
    s.from('painel_cargo_flags').select('cargo, ver_faturamento, ver_despesas'),
  ])

  const porCargo = new Map<string, string[]>()
  for (const r of itens ?? []) {
    const a = porCargo.get(r.cargo) ?? []
    a.push(r.tipo_lavagem_id)
    porCargo.set(r.cargo, a)
  }
  const flagMap = new Map((flags ?? []).map((f) => [f.cargo, f]))

  return (
    <div className="max-w-4xl">
      <PageHeader
        titulo="Painel de Metas — visibilidade"
        descricao="Escolha o que cada cargo vê no Painel de Metas. Cargo sem itens marcados vê todos por padrão."
      />
      <div className="space-y-4">
        {CARGOS.map((c) => {
          const f = flagMap.get(c.cargo)
          return (
            <CargoVisib
              key={c.cargo}
              cargo={c.cargo}
              label={c.label}
              tipos={(tipos ?? []).map((t) => ({ id: t.id, nome: t.nome, categoria: t.categoria }))}
              selecionados={porCargo.get(c.cargo) ?? []}
              verFaturamento={f ? f.ver_faturamento : true}
              verDespesas={f ? f.ver_despesas : true}
            />
          )
        })}
      </div>
    </div>
  )
}
