-- =====================================================================
-- Migration 0007 — Regras de bonificação por tipo de lavagem/serviço
--   * Cada tipo pode ter 0, 1 ou várias regras (um tipo pode bonificar
--     mais de um cargo — ex.: Premium dá bônus ao caixa E ao aux. máquina).
--   * Cada regra: cargo + valor (R$ por unidade) + forma de rateio.
--       - individual : vai para quem registrou (caixa)
--       - pool_cargo : soma × valor ÷ nº de colaboradores do cargo (máquina)
--       - pool_turno : idem, dividido por turno (limpeza)
--   * Seed reproduz EXATAMENTE as regras atuais do sistema.
--   Rode no SQL Editor do Supabase DEPOIS da 0006.
-- =====================================================================

create table if not exists public.bonificacao_regras (
  id              uuid primary key default gen_random_uuid(),
  tipo_lavagem_id uuid not null references public.tipos_lavagem(id) on delete cascade,
  cargo           text not null check (cargo in ('caixa', 'aux_maquina', 'aux_limpeza')),
  valor           numeric(12,4) not null default 0,
  rateio          text not null default 'pool_cargo'
                    check (rateio in ('individual', 'pool_cargo', 'pool_turno')),
  ativo           boolean not null default true,
  criado_em       timestamptz not null default now()
);

create index if not exists idx_bonif_tipo on public.bonificacao_regras (tipo_lavagem_id);

alter table public.bonificacao_regras enable row level security;

drop policy if exists bonif_sel on public.bonificacao_regras;
create policy bonif_sel on public.bonificacao_regras
  for select to authenticated using (true);

drop policy if exists bonif_admin on public.bonificacao_regras;
create policy bonif_admin on public.bonificacao_regras
  for all to authenticated
  using (public.meu_papel() = 'admin')
  with check (public.meu_papel() = 'admin');

-- ---- Seed: regras atuais (idempotente) ------------------------------
-- Caixa (individual): Premium 0,10 / Exclusiva sem Box 0,20 / com Box 0,30
insert into public.bonificacao_regras (tipo_lavagem_id, cargo, valor, rateio)
select t.id, 'caixa', v.valor, 'individual'
  from public.tipos_lavagem t
  join (values ('Premium', 0.10), ('Exclusiva sem Box', 0.20), ('Exclusiva com Box', 0.30)) as v(nome, valor)
    on v.nome = t.nome
 where not exists (
   select 1 from public.bonificacao_regras r
    where r.tipo_lavagem_id = t.id and r.cargo = 'caixa' and r.rateio = 'individual'
 );

-- Aux. máquina (pool por cargo): túnel × 0,35
insert into public.bonificacao_regras (tipo_lavagem_id, cargo, valor, rateio)
select t.id, 'aux_maquina', 0.35, 'pool_cargo'
  from public.tipos_lavagem t
 where t.nome in ('Essencial', 'Premium', 'Exclusiva sem Box', 'Exclusiva com Box', 'Assinatura Mensal')
   and not exists (
     select 1 from public.bonificacao_regras r
      where r.tipo_lavagem_id = t.id and r.cargo = 'aux_maquina'
   );

-- Aux. limpeza (pool por turno): Limpeza Interna Avulsa × 5,00
insert into public.bonificacao_regras (tipo_lavagem_id, cargo, valor, rateio)
select t.id, 'aux_limpeza', 5.00, 'pool_turno'
  from public.tipos_lavagem t
 where t.nome = 'Limpeza Interna Avulsa'
   and not exists (
     select 1 from public.bonificacao_regras r
      where r.tipo_lavagem_id = t.id and r.cargo = 'aux_limpeza'
   );
