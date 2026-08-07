-- =====================================================================
-- Migration 0002 — extras do fechamento de caixa
--   * Forma de pagamento "Empresarial a Prazo" (valor + quantidade)
--   * Quantidade de kits vendidos (para bonificação do caixa)
-- Rode no SQL Editor do Supabase DEPOIS da 0001.
-- =====================================================================

alter table public.fechamentos_caixa
  add column if not exists sistema_empresarial     numeric(12,2) not null default 0,
  add column if not exists sistema_qtd_empresarial int          not null default 0,
  add column if not exists kits_vendidos           int          not null default 0;
