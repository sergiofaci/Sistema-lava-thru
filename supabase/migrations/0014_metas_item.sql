-- =====================================================================
-- Migration 0014 — Metas de quantidade por item (lavagem/serviço)
--   Meta de faturamento = Σ (quantidade × preço do item).
--   Rode no SQL Editor do Supabase DEPOIS da 0013.
-- =====================================================================

create table if not exists public.metas_item (
  id              uuid primary key default gen_random_uuid(),
  unidade_id      uuid not null references public.unidades(id),
  mes             date not null,               -- primeiro dia do mês (YYYY-MM-01)
  tipo_lavagem_id uuid not null references public.tipos_lavagem(id) on delete cascade,
  quantidade      numeric(12,3) not null default 0,
  criado_em       timestamptz not null default now(),
  unique (unidade_id, mes, tipo_lavagem_id)
);

create index if not exists idx_metas_item on public.metas_item (unidade_id, mes);

alter table public.metas_item enable row level security;

drop policy if exists metas_item_sel on public.metas_item;
create policy metas_item_sel on public.metas_item
  for select to authenticated using (public.acesso_unidade(unidade_id));

drop policy if exists metas_item_rw on public.metas_item;
create policy metas_item_rw on public.metas_item
  for all to authenticated
  using (public.meu_papel() in ('admin', 'gerente') and public.acesso_unidade(unidade_id))
  with check (public.meu_papel() in ('admin', 'gerente') and public.acesso_unidade(unidade_id));
