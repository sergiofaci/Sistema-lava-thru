import { revalidatePath } from 'next/cache'
import { requirePapel } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import {
  PageHeader,
  Card,
  Field,
  inputClass,
  btnPrimary,
  EmptyState,
  Badge,
} from '@/components/ui'

const ROTA = '/cadastros/produtos'
const UNIDADES_MEDIDA = ['litro', 'unidade', 'kg', 'ml', 'g', 'galão', 'caixa']

export default async function Page() {
  await requirePapel('admin')
  const supabase = await createClient()
  const { data } = await supabase
    .from('produtos')
    .select('id, nome, unidade_medida, estoque_minimo, ativo')
    .order('nome')

  async function criar(formData: FormData) {
    'use server'
    await requirePapel('admin')
    const nome = String(formData.get('nome') ?? '').trim()
    const unidade_medida = String(formData.get('unidade_medida') ?? '').trim()
    const estoque_minimo = Number(String(formData.get('estoque_minimo') ?? '0').replace(',', '.')) || 0
    if (!nome || !unidade_medida) return
    const s = await createClient()
    await s.from('produtos').insert({ nome, unidade_medida, estoque_minimo })
    revalidatePath(ROTA)
  }

  async function alternarAtivo(formData: FormData) {
    'use server'
    await requirePapel('admin')
    const id = String(formData.get('id'))
    const ativo = formData.get('ativo') === '1'
    const s = await createClient()
    await s.from('produtos').update({ ativo }).eq('id', id)
    revalidatePath(ROTA)
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        titulo="Produtos"
        descricao="Insumos controlados no estoque. O estoque mínimo gera alerta de reposição."
      />

      <Card className="mb-6">
        <form action={criar} className="flex flex-wrap items-end gap-3">
          <div className="min-w-48 flex-1">
            <Field label="Nome" htmlFor="nome">
              <input id="nome" name="nome" required placeholder="Ex.: Shampoo automotivo" className={inputClass} />
            </Field>
          </div>
          <div className="w-36">
            <Field label="Unidade" htmlFor="unidade_medida">
              <select id="unidade_medida" name="unidade_medida" className={inputClass} defaultValue="litro">
                {UNIDADES_MEDIDA.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="w-32">
            <Field label="Estoque mín." htmlFor="estoque_minimo">
              <input id="estoque_minimo" name="estoque_minimo" inputMode="decimal" placeholder="0" className={inputClass} />
            </Field>
          </div>
          <button type="submit" className={btnPrimary}>
            Adicionar
          </button>
        </form>
      </Card>

      {!data || data.length === 0 ? (
        <EmptyState>Nenhum produto cadastrado.</EmptyState>
      ) : (
        <Card className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="px-5 py-3 font-medium">Produto</th>
                <th className="px-5 py-3 font-medium">Unidade</th>
                <th className="px-5 py-3 font-medium">Estoque mín.</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {data.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-5 py-3 font-medium text-slate-700">{p.nome}</td>
                  <td className="px-5 py-3 text-slate-500">{p.unidade_medida}</td>
                  <td className="px-5 py-3 text-slate-500">{p.estoque_minimo}</td>
                  <td className="px-5 py-3">
                    {p.ativo ? <Badge tone="success">Ativo</Badge> : <Badge>Inativo</Badge>}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <form action={alternarAtivo}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="ativo" value={p.ativo ? '0' : '1'} />
                      <button type="submit" className="text-sm text-brand hover:underline">
                        {p.ativo ? 'Desativar' : 'Ativar'}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
