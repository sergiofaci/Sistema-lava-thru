-- =====================================================================
-- Migration 0009 — Processos que compõem cada lavagem
--   * Catálogo de processos (itens/adicionais grátis)
--   * Composição N–N: quais processos cada tipo de lavagem inclui
--   Rode no SQL Editor do Supabase DEPOIS da 0008.
-- =====================================================================

create table if not exists public.processos (
  id        uuid primary key default gen_random_uuid(),
  nome      text not null,
  ordem     int not null default 0,
  ativo     boolean not null default true,
  criado_em timestamptz not null default now()
);

create table if not exists public.tipo_lavagem_processos (
  tipo_lavagem_id uuid not null references public.tipos_lavagem(id) on delete cascade,
  processo_id     uuid not null references public.processos(id) on delete cascade,
  primary key (tipo_lavagem_id, processo_id)
);

alter table public.processos enable row level security;
alter table public.tipo_lavagem_processos enable row level security;

drop policy if exists proc_sel on public.processos;
create policy proc_sel on public.processos for select to authenticated using (true);
drop policy if exists proc_admin on public.processos;
create policy proc_admin on public.processos for all to authenticated
  using (public.meu_papel() = 'admin') with check (public.meu_papel() = 'admin');

drop policy if exists tlp_sel on public.tipo_lavagem_processos;
create policy tlp_sel on public.tipo_lavagem_processos for select to authenticated using (true);
drop policy if exists tlp_admin on public.tipo_lavagem_processos;
create policy tlp_admin on public.tipo_lavagem_processos for all to authenticated
  using (public.meu_papel() = 'admin') with check (public.meu_papel() = 'admin');

-- ---- Seed do catálogo (idempotente por nome) ------------------------
insert into public.processos (nome, ordem)
select v.nome, v.ordem
  from (values
    ('Pré-Lavagem manual + rodas', 1),
    ('Shampoo', 2),
    ('Shampoo com cera brilho e proteção', 3),
    ('Cera secante', 4),
    ('Coating cerâmico', 5),
    ('Esfregação, enxague, secagem no túnel', 6),
    ('Incluso 20 minutos aspirador e vaga de limpeza', 7),
    ('Limpeza interna realizada pela equipe', 8)
  ) as v(nome, ordem)
 where not exists (select 1 from public.processos p where p.nome = v.nome);

-- ---- Seed das composições das 4 lavagens (idempotente) --------------
insert into public.tipo_lavagem_processos (tipo_lavagem_id, processo_id)
select t.id, p.id
  from public.tipos_lavagem t
  join (values
    ('Essencial', 'Shampoo'),
    ('Essencial', 'Cera secante'),
    ('Essencial', 'Esfregação, enxague, secagem no túnel'),
    ('Premium', 'Pré-Lavagem manual + rodas'),
    ('Premium', 'Shampoo'),
    ('Premium', 'Shampoo com cera brilho e proteção'),
    ('Premium', 'Cera secante'),
    ('Premium', 'Esfregação, enxague, secagem no túnel'),
    ('Exclusiva sem Box', 'Pré-Lavagem manual + rodas'),
    ('Exclusiva sem Box', 'Shampoo'),
    ('Exclusiva sem Box', 'Shampoo com cera brilho e proteção'),
    ('Exclusiva sem Box', 'Cera secante'),
    ('Exclusiva sem Box', 'Coating cerâmico'),
    ('Exclusiva sem Box', 'Esfregação, enxague, secagem no túnel'),
    ('Exclusiva com Box', 'Pré-Lavagem manual + rodas'),
    ('Exclusiva com Box', 'Shampoo'),
    ('Exclusiva com Box', 'Shampoo com cera brilho e proteção'),
    ('Exclusiva com Box', 'Cera secante'),
    ('Exclusiva com Box', 'Coating cerâmico'),
    ('Exclusiva com Box', 'Esfregação, enxague, secagem no túnel'),
    ('Exclusiva com Box', 'Incluso 20 minutos aspirador e vaga de limpeza')
  ) as v(tipo_nome, proc_nome) on v.tipo_nome = t.nome
  join public.processos p on p.nome = v.proc_nome
 where not exists (
   select 1 from public.tipo_lavagem_processos x
    where x.tipo_lavagem_id = t.id and x.processo_id = p.id
 );
