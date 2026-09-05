import { requirePapel } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { PageHeader, inputClass, btnPrimary, EmptyState } from '@/components/ui'
import { MetasItemGrid } from './MetasItemGrid'

type SP = { unidade?: string; mes?: string }

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  await requirePapel('admin')
  const sp = await searchParams
  const s = await createClient()

  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
  const mes = sp.mes && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : hoje.slice(0, 7)

  const { data: unidades } = await s.from('unidades').select('id, nome').eq('ativo', true).order('nome')
  const unidadeId = sp.unidade || unidades?.[0]?.id || ''

  const [{ data: tipos }, { data: metas }] = await Promise.all([
    s.from('tipos_lavagem').select('id, nome, categoria, preco').eq('ativo', true).order('ordem'),
    unidadeId
      ? s.from('metas_item').select('tipo_lavagem_id, quantidade').eq('unidade_id', unidadeId).eq('mes', `${mes}-01`)
      : Promise.resolve({ data: [] }),
  ])

  const atual: Record<string, number> = {}
  for (const m of metas ?? []) atual[m.tipo_lavagem_id] = Number(m.quantidade)

  const mesLabel = new Date(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)) - 1, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="max-w-3xl">
      <PageHeader
        titulo="Metas por item"
        descricao={`${mesLabel} — defina a meta mensal de quantidade de cada item; o faturamento é calculado pelo preço.`}
        acao={
          <form method="get" className="flex flex-wrap items-center gap-2">
            <select name="unidade" defaultValue={unidadeId} className={inputClass}>
              {(unidades ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </select>
            <input type="month" name="mes" defaultValue={mes} className={inputClass} />
            <button type="submit" className={btnPrimary}>
              Aplicar
            </button>
          </form>
        }
      />

      {!unidadeId ? (
        <EmptyState>Cadastre uma unidade primeiro.</EmptyState>
      ) : (tipos ?? []).length === 0 ? (
        <EmptyState>Nenhum tipo de lavagem/serviço ativo.</EmptyState>
      ) : (
        <MetasItemGrid
          tipos={(tipos ?? []).map((t) => ({ id: t.id, nome: t.nome, categoria: t.categoria, preco: Number(t.preco ?? 0) }))}
          atual={atual}
          unidadeId={unidadeId}
          mes={mes}
        />
      )}
    </div>
  )
}
