-- =====================================================================
-- Migration 0006 — Categoria dos tipos de lavagem
--   * Distingue "lavagem" de "serviço adicional" (ex.: limpeza interna,
--     box de limpeza), que NÃO devem contar como lavagem nas estatísticas
--     gerais nem no ticket médio das bonificações.
--   * Serviços continuam sendo registrados no fechamento normalmente.
--   Rode no SQL Editor do Supabase DEPOIS da 0005.
-- =====================================================================

alter table public.tipos_lavagem
  add column if not exists categoria text not null default 'lavagem';

alter table public.tipos_lavagem
  drop constraint if exists tipos_lavagem_categoria_check;
alter table public.tipos_lavagem
  add constraint tipos_lavagem_categoria_check check (categoria in ('lavagem', 'servico'));

-- Pré-marca como serviço os tipos que claramente não são lavagem.
-- Cuidado: NÃO usar '%box%' aqui — pegaria "Exclusiva sem/com Box", que
-- são lavagens. "Box de Limpeza Interna" já é pego por '%limpeza interna%'.
-- (Ajuste os demais na tela Cadastros → Tipos de Lavagem, se necessário.)
update public.tipos_lavagem
   set categoria = 'servico'
 where categoria = 'lavagem'
   and nome ilike '%limpeza interna%';
