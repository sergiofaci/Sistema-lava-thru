-- =====================================================================
-- Migration 0016 — Orçamento mensal de despesas por tipo de despesa
--   Realizado vem do contas a pagar; compara orçado × realizado.
--   Rode no SQL Editor do Supabase DEPOIS da 0015.
-- =====================================================================

create table if not exists public.orcamento_despesa (
  id              uuid primary key default gen_random_uuid(),
  unidade_id      uuid not null references public.unidades(id),
  mes             date not null,               -- primeiro dia do mês (YYYY-MM-01)
  tipo_despesa_id uuid not null references public.tipos_despesa(id) on delete cascade,
  valor           numeric(12,2) not null default 0,
  criado_em       timestamptz not null default now(),
  unique (unidade_id, mes, tipo_despesa_id)
);

create index if not exists idx_orcamento on public.orcamento_despesa (unidade_id, mes);

alter table public.orcamento_despesa enable row level security;

drop policy if exists orc_sel on public.orcamento_despesa;
create policy orc_sel on public.orcamento_despesa
  for select to authenticated using (public.acesso_unidade(unidade_id));

drop policy if exists orc_rw on public.orcamento_despesa;
create policy orc_rw on public.orcamento_despesa
  for all to authenticated
  using (public.meu_papel() in ('admin', 'gerente') and public.acesso_unidade(unidade_id))
  with check (public.meu_papel() in ('admin', 'gerente') and public.acesso_unidade(unidade_id));
