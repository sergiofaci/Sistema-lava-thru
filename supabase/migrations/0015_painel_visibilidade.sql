-- =====================================================================
-- Migration 0015 — Visibilidade do Painel de Metas por cargo
--   * painel_cargo_item: quais itens cada cargo vê no painel
--   * painel_cargo_flags: se o cargo vê faturamento / despesas
--   Regra de fallback (na aplicação): cargo sem configuração vê tudo.
--   Rode no SQL Editor do Supabase DEPOIS da 0014.
-- =====================================================================

create table if not exists public.painel_cargo_item (
  cargo           text not null check (cargo in ('caixa', 'aux_maquina', 'aux_limpeza', 'gerente')),
  tipo_lavagem_id uuid not null references public.tipos_lavagem(id) on delete cascade,
  primary key (cargo, tipo_lavagem_id)
);

create table if not exists public.painel_cargo_flags (
  cargo           text primary key check (cargo in ('caixa', 'aux_maquina', 'aux_limpeza', 'gerente')),
  ver_faturamento boolean not null default true,
  ver_despesas    boolean not null default true
);

alter table public.painel_cargo_item enable row level security;
alter table public.painel_cargo_flags enable row level security;

drop policy if exists pci_sel on public.painel_cargo_item;
create policy pci_sel on public.painel_cargo_item for select to authenticated using (true);
drop policy if exists pci_admin on public.painel_cargo_item;
create policy pci_admin on public.painel_cargo_item for all to authenticated
  using (public.meu_papel() = 'admin') with check (public.meu_papel() = 'admin');

drop policy if exists pcf_sel on public.painel_cargo_flags;
create policy pcf_sel on public.painel_cargo_flags for select to authenticated using (true);
drop policy if exists pcf_admin on public.painel_cargo_flags;
create policy pcf_admin on public.painel_cargo_flags for all to authenticated
  using (public.meu_papel() = 'admin') with check (public.meu_papel() = 'admin');
