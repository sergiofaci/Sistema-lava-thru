-- =====================================================================
-- Migration 0008 — Contagem de dinheiro no fechamento
--   * contagem_dinheiro: valor contado na gaveta (confere com o sistema)
--   * diferenca_dinheiro: contagem − sistema (negativo = faltou)
--   A partir daqui, diferenca_total passa a ser a soma ALGÉBRICA (líquida)
--   das diferenças (dinheiro + pix + crédito + débito) — a "diferença real".
--   Rode no SQL Editor do Supabase DEPOIS da 0007.
-- =====================================================================

alter table public.fechamentos_caixa
  add column if not exists contagem_dinheiro  numeric(12,2) not null default 0,
  add column if not exists diferenca_dinheiro numeric(12,2) not null default 0;
