-- =====================================================================
-- Migration 0017 — Classificação de despesas para a DRE
--   * Cada Tipo de Despesa passa a ter um "grupo na DRE", que define em
--     qual linha da demonstração ele entra:
--       deducao     -> ISS, PIS/COFINS (impostos sobre a venda)
--       cmv         -> custos variáveis (CMV/CSV)
--       operacional -> despesas operacionais / fixas (padrão)
--       financeira  -> juros e despesas financeiras
--       imposto     -> impostos sobre o resultado (IRPJ/CSLL)
--   * Não altera lançamentos: cada conta já referencia um tipo, então
--     classificar o tipo reorganiza a DRE inteira (inclusive o histórico).
--   Rode no SQL Editor do Supabase DEPOIS da 0016.
-- =====================================================================

alter table public.tipos_despesa
  add column if not exists grupo_dre text not null default 'operacional'
    check (grupo_dre in ('deducao', 'cmv', 'operacional', 'financeira', 'imposto'));

comment on column public.tipos_despesa.grupo_dre is
  'Linha da DRE: deducao | cmv | operacional | financeira | imposto';
