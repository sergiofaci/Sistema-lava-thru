-- =====================================================================
-- Migration 0010 — Histórico de faturamento (importado de sistema antigo)
--   * Faturamento mensal por unidade e por item (lavagem/assinatura),
--     separado dos fechamentos operacionais.
--   * Alimenta comparações no dashboard (evolução, ano a ano).
--   Rode no SQL Editor do Supabase DEPOIS da 0009.
-- =====================================================================

create table if not exists public.faturamento_historico (
  id          uuid primary key default gen_random_uuid(),
  unidade_id  uuid not null references public.unidades(id),
  mes         date not null,               -- primeiro dia do mês (YYYY-MM-01)
  categoria   text not null default 'lavagem'
                check (categoria in ('lavagem', 'assinatura', 'outro')),
  item        text not null,               -- nome do tipo de lavagem ou plano
  quantidade  numeric(12,3) not null default 0,
  valor       numeric(12,2) not null default 0,
  criado_em   timestamptz not null default now(),
  unique (unidade_id, mes, categoria, item)
);

create index if not exists idx_fat_hist_unidade_mes on public.faturamento_historico (unidade_id, mes);

alter table public.faturamento_historico enable row level security;

drop policy if exists fathist_sel on public.faturamento_historico;
create policy fathist_sel on public.faturamento_historico
  for select to authenticated using (public.acesso_unidade(unidade_id));

drop policy if exists fathist_admin on public.faturamento_historico;
create policy fathist_admin on public.faturamento_historico
  for all to authenticated
  using (public.meu_papel() = 'admin')
  with check (public.meu_papel() = 'admin');
