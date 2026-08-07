-- =====================================================================
-- Migration 0005
--   * Permissões de módulo por cargo (admin define o que gerente/caixa veem)
--   * Fechamento: as duas maquininhas (Rede Card e Sipag) no mesmo turno
-- Rode no SQL Editor do Supabase DEPOIS da 0004.
-- =====================================================================

-- ---- Permissões por módulo (gerente/caixa; admin sempre vê tudo) -------
create table if not exists public.permissoes_modulo (
  papel     text    not null check (papel in ('gerente','caixa')),
  modulo    text    not null,
  permitido boolean not null default false,
  primary key (papel, modulo)
);

alter table public.permissoes_modulo enable row level security;
create policy perm_sel on public.permissoes_modulo for select to authenticated using (true);
create policy perm_ins on public.permissoes_modulo for insert to authenticated with check (public.sou_admin());
create policy perm_upd on public.permissoes_modulo for update to authenticated using (public.sou_admin()) with check (public.sou_admin());
create policy perm_del on public.permissoes_modulo for delete to authenticated using (public.sou_admin());

insert into public.permissoes_modulo (papel, modulo, permitido) values
  ('gerente','dashboard',true),
  ('gerente','dre',true),
  ('gerente','fechamentos',true),
  ('gerente','fechamentos_historico',true),
  ('gerente','contas',true),
  ('gerente','estoque',true),
  ('gerente','bonificacoes',true),
  ('caixa','dashboard',false),
  ('caixa','dre',false),
  ('caixa','fechamentos',true),
  ('caixa','fechamentos_historico',false),
  ('caixa','contas',false),
  ('caixa','estoque',false),
  ('caixa','bonificacoes',false)
on conflict (papel, modulo) do nothing;

-- ---- Fechamento: duas maquininhas no mesmo turno ----------------------
alter table public.fechamentos_caixa
  alter column maquina_cartao drop not null,
  add column if not exists maquina_rede_pix      numeric(12,2) not null default 0,
  add column if not exists maquina_rede_credito  numeric(12,2) not null default 0,
  add column if not exists maquina_rede_debito   numeric(12,2) not null default 0,
  add column if not exists maquina_sipag_pix     numeric(12,2) not null default 0,
  add column if not exists maquina_sipag_credito numeric(12,2) not null default 0,
  add column if not exists maquina_sipag_debito  numeric(12,2) not null default 0;
