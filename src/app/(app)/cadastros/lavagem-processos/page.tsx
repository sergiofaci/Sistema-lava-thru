import Link from 'next/link'
import { requirePapel } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { PageHeader, EmptyState } from '@/components/ui'
import { ComposicaoTipo } from './ComposicaoTipo'

export default async function Page() {
  await requirePapel('admin')
  const s = await createClient()

  const [{ data: tipos }, { data: processos }, { data: junc }] = await Promise.all([
    s.from('tipos_lavagem').select('id, nome, categoria, ordem').eq('ativo', true).order('ordem'),
    s.from('processos').select('id, nome, ordem').eq('ativo', true).order('ordem'),
    s.from('tipo_lavagem_processos').select('tipo_lavagem_id, processo_id'),
  ])

  const porTipo = new Map<string, string[]>()
  for (const r of junc ?? []) {
    const arr = porTipo.get(r.tipo_lavagem_id) ?? []
    arr.push(r.processo_id)
    porTipo.set(r.tipo_lavagem_id, arr)
  }

  const listaTipos = tipos ?? []
  const listaProc = processos ?? []

  return (
    <div className="max-w-4xl">
      <PageHeader
        titulo="Composição das Lavagens"
        descricao="Marque os processos/adicionais que compõem cada lavagem ou serviço."
        acao={
          <Link href="/cadastros/processos" className="text-sm text-brand hover:underline">
            Gerenciar processos →
          </Link>
        }
      />

      {listaProc.length === 0 ? (
        <EmptyState>
          Cadastre os processos primeiro em{' '}
          <Link href="/cadastros/processos" className="text-brand hover:underline">
            Processos das Lavagens
          </Link>
          .
        </EmptyState>
      ) : listaTipos.length === 0 ? (
        <EmptyState>Nenhum tipo de lavagem ativo.</EmptyState>
      ) : (
        <div className="space-y-4">
          {listaTipos.map((t) => (
            <ComposicaoTipo
              key={t.id}
              tipo={t}
              processos={listaProc}
              selecionados={porTipo.get(t.id) ?? []}
            />
          ))}
        </div>
      )}
    </div>
  )
}
