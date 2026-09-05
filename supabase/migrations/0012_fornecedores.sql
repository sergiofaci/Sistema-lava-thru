-- =====================================================================
-- Migration 0012 — Fornecedores
--   * Cadastro de fornecedores (reutilizável nos lançamentos de contas)
--   * Vínculo opcional no contas a pagar (fornecedor_id)
--   Rode no SQL Editor do Supabase DEPOIS da 0011.
-- =====================================================================

create table if not exists public.fornecedores (
  id            uuid primary key default gen_random_uuid(),
  razao_social  text not null,
  categoria     text,
  cnpj          text,
  contato       text,
  telefone      text,
  email         text,
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now()
);

-- Anti-duplicidade por CNPJ (quando informado).
create unique index if not exists fornecedores_cnpj_uniq
  on public.fornecedores (cnpj)
  where cnpj is not null and cnpj <> '';

alter table public.contas_pagas
  add column if not exists fornecedor_id uuid references public.fornecedores(id);

alter table public.fornecedores enable row level security;

drop policy if exists forn_sel on public.fornecedores;
create policy forn_sel on public.fornecedores for select to authenticated using (true);

-- Quem lança contas (admin/gerente) pode cadastrar/editar fornecedores.
drop policy if exists forn_rw on public.fornecedores;
create policy forn_rw on public.fornecedores
  for all to authenticated
  using (public.meu_papel() in ('admin', 'gerente'))
  with check (public.meu_papel() in ('admin', 'gerente'));
