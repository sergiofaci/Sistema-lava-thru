-- =====================================================================
-- Seed — dados de referência iniciais
-- Rode DEPOIS da migration 0001. Idempotente (usa "on conflict do nothing"
-- via nome único emulado). Ajuste preços dos tipos de lavagem conforme a tabela real.
-- =====================================================================

-- Tipos de lavagem (seção 4.3). Preço 0 = ajustar no cadastro depois.
insert into public.tipos_lavagem (nome, ordem, preco)
select v.nome, v.ordem, 0
from (values
  ('Essencial', 1),
  ('Premium', 2),
  ('Exclusiva sem Box', 3),
  ('Exclusiva com Box', 4),
  ('Box de Interna', 5),
  ('Limpeza Interna Avulsa', 6),
  ('Assinatura Mensal', 7)
) as v(nome, ordem)
where not exists (select 1 from public.tipos_lavagem t where t.nome = v.nome);

-- Locais de uso de estoque (seção 6.3) — configuráveis
insert into public.locais_uso (nome)
select v.nome from (values ('Túnel'), ('Limpeza Interna')) as v(nome)
where not exists (select 1 from public.locais_uso l where l.nome = v.nome);

-- Centros de custo iniciais (exemplos — livres)
insert into public.centros_custo (nome)
select v.nome from (values ('Operacional'), ('Administrativo'), ('Marketing')) as v(nome)
where not exists (select 1 from public.centros_custo c where c.nome = v.nome);

-- Tipos de despesa iniciais (exemplos hierárquicos)
insert into public.tipos_despesa (nome)
select v.nome from (values
  ('Manutenção'), ('Água'), ('Energia'), ('Salários'), ('Produtos de limpeza'), ('Marketing')
) as v(nome)
where not exists (select 1 from public.tipos_despesa d where d.nome = v.nome);
