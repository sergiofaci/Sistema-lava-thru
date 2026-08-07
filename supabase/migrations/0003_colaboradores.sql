-- =====================================================================
-- Migration 0003 — Colaboradores (para o cálculo de bonificações)
-- Inclui a equipe de pátio/máquina que não tem login no sistema.
-- Rode no SQL Editor do Supabase DEPOIS da 0002.
-- =====================================================================

create table if not exists public.colaboradores (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  cargo         text not null check (cargo in ('caixa','aux_limpeza','aux_maquina','gerente')),
  turno         text not null default 'ambos' check (turno in ('manha','tarde','ambos')),
  unidade_id    uuid not null references public.unidades(id),
  data_admissao date,
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now()
);

create index if not exists idx_colaboradores_unidade on public.colaboradores (unidade_id, cargo);

alter table public.colaboradores enable row level security;

create policy colaboradores_sel on public.colaboradores for select to authenticated
  using (public.sou_admin() or public.acesso_unidade(unidade_id));
create policy colaboradores_ins on public.colaboradores for insert to authenticated
  with check (public.sou_admin());
create policy colaboradores_upd on public.colaboradores for update to authenticated
  using (public.sou_admin()) with check (public.sou_admin());
create policy colaboradores_del on public.colaboradores for delete to authenticated
  using (public.sou_admin());
