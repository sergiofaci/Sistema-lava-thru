-- =====================================================================
-- Migration 0013 — Preço por item + adicionais (base do módulo de Metas)
--   * preco em tipos_lavagem (referência para a meta de faturamento)
--   * cadastra os serviços/adicionais que faltam (categoria 'servico')
--   Rode no SQL Editor do Supabase DEPOIS da 0012.
-- =====================================================================

alter table public.tipos_lavagem
  add column if not exists preco numeric(12,2) not null default 0;

-- Adicionais/serviços para medir nas metas (idempotente, sem duplicar por nome).
insert into public.tipos_lavagem (nome, categoria, ordem)
select v.nome, 'servico', v.ordem
  from (values
    ('Box de Interna Avulsa', 101),
    ('Adic. Lim. Interna Pqe/SUV', 102),
    ('Adic. Lim. Interna Caminhonetes/Vans', 103),
    ('Adic. 20 Minutos Box Interna', 104),
    ('Adic. Revitalização de Plásticos Externos', 105),
    ('Adic. Cristalização de Para-Brisas', 106),
    ('Adic. Cristalização de Todos os Vidros', 107),
    ('Adic. Barro', 108),
    ('Adic. Coco de Pássaro', 109)
  ) as v(nome, ordem)
 where not exists (
   select 1 from public.tipos_lavagem t where lower(t.nome) = lower(v.nome)
 );
