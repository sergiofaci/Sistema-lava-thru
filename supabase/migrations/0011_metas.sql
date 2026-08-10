-- =====================================================================
-- Migration 0011 — Metas mensais de faturamento por unidade
--   Alimenta o "% atingido" e a projeção do mês no dashboard.
--   Rode no SQL Editor do Supabase DEPOIS da 0010.
-- =====================================================================

create table if not exists public.metas (
  id          uuid primary key default gen_random_uuid(),
  unidade_id  uuid not null references public.unidades(id),
  mes         date not null,               -- primeiro dia do mês (YYYY-MM-01)
  valor_meta  numeric(12,2) not null default 0,
  criado_em   timestamptz not null default now(),
  unique (unidade_id, mes)
);

alter table public.metas enable row level security;

drop policy if exists metas_sel on public.metas;
create policy metas_sel on public.metas
  for select to authenticated using (public.acesso_unidade(unidade_id));

drop policy if exists metas_admin on public.metas;
create policy metas_admin on public.metas
  for all to authenticated
  using (public.meu_papel() = 'admin')
  with check (public.meu_papel() = 'admin');
