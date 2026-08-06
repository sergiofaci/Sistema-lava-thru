-- =====================================================================
-- Lava Thru — Sistema de Gestão
-- Migration 0001: schema inicial (multiunidade), RLS e funções auxiliares
-- =====================================================================
-- Convenções:
--   * Autenticação é feita pelo Supabase Auth (tabela auth.users).
--   * A tabela public.usuarios é o "perfil" do usuário: papel + unidade.
--     (A senha NUNCA fica aqui — o hash vive em auth.users, gerido pelo Supabase.)
--   * Todo dado operacional é vinculado a uma unidade (multi-tenant por unidade).
--   * Isolamento entre unidades é garantido por Row Level Security (RLS).
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Cadastros base
-- ---------------------------------------------------------------------
create table if not exists public.unidades (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  endereco    text,
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now()
);

-- Perfil do usuário (1-1 com auth.users)
create table if not exists public.usuarios (
  id          uuid primary key references auth.users(id) on delete cascade,
  nome        text not null,
  email       text not null,
  papel       text not null check (papel in ('admin','gerente','caixa')),
  unidade_id  uuid references public.unidades(id),
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now()
);
-- admin não precisa de unidade (vê todas); gerente/caixa precisam de uma.
alter table public.usuarios
  add constraint usuarios_unidade_por_papel
  check (papel = 'admin' or unidade_id is not null);

create table if not exists public.centros_custo (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now()
);

create table if not exists public.tipos_despesa (
  id                uuid primary key default gen_random_uuid(),
  nome              text not null,
  categoria_pai_id  uuid references public.tipos_despesa(id),
  ativo             boolean not null default true,
  criado_em         timestamptz not null default now()
);

create table if not exists public.tipos_lavagem (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  ordem       int not null default 0,   -- só p/ ordenar na tela de fechamento
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now()
);

create table if not exists public.locais_uso (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now()
);

create table if not exists public.produtos (
  id              uuid primary key default gen_random_uuid(),
  nome            text not null,
  unidade_medida  text not null,               -- litro, unidade, kg, ...
  estoque_minimo  numeric(12,3) not null default 0,
  ativo           boolean not null default true,
  criado_em       timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Fechamento de Caixa
-- ---------------------------------------------------------------------
create table if not exists public.fechamentos_caixa (
  id            uuid primary key default gen_random_uuid(),
  unidade_id    uuid not null references public.unidades(id),
  usuario_id    uuid not null references public.usuarios(id),
  data          date not null default (now() at time zone 'America/Sao_Paulo')::date,
  data_hora     timestamptz not null default now(),
  maquina_cartao text not null check (maquina_cartao in ('Rede Card','Sipag')),

  -- Bloco A — relatório da maquininha
  maquina_pix       numeric(12,2) not null default 0,
  maquina_credito   numeric(12,2) not null default 0,
  maquina_debito    numeric(12,2) not null default 0,

  -- Bloco B — relatório do sistema interno (registro "oficial" da venda)
  sistema_dinheiro  numeric(12,2) not null default 0,
  sistema_pix       numeric(12,2) not null default 0,
  sistema_credito   numeric(12,2) not null default 0,
  sistema_debito    numeric(12,2) not null default 0,
  sistema_voucher   numeric(12,2) not null default 0,

  -- Quantidade de transações por forma de pagamento (Bloco B)
  sistema_qtd_dinheiro int not null default 0,
  sistema_qtd_pix      int not null default 0,
  sistema_qtd_credito  int not null default 0,
  sistema_qtd_debito   int not null default 0,
  sistema_qtd_voucher  int not null default 0,

  -- Diferenças (máquina - sistema), calculadas na aplicação
  diferenca_pix     numeric(12,2) not null default 0,
  diferenca_credito numeric(12,2) not null default 0,
  diferenca_debito  numeric(12,2) not null default 0,
  diferenca_total   numeric(12,2) not null default 0,
  fechado_com_diferenca boolean not null default false,

  criado_em     timestamptz not null default now()
);

create table if not exists public.fechamento_lavagens (
  id              uuid primary key default gen_random_uuid(),
  fechamento_id   uuid not null references public.fechamentos_caixa(id) on delete cascade,
  tipo_lavagem_id uuid not null references public.tipos_lavagem(id),
  quantidade      int not null default 0,
  unique (fechamento_id, tipo_lavagem_id)
);

-- ---------------------------------------------------------------------
-- Contas a Pagar
-- ---------------------------------------------------------------------
create table if not exists public.contas_pagas (
  id              uuid primary key default gen_random_uuid(),
  unidade_id      uuid not null references public.unidades(id),
  centro_custo_id uuid not null references public.centros_custo(id),
  tipo_despesa_id uuid not null references public.tipos_despesa(id),
  data            date not null,
  numero_nota     text,
  valor           numeric(12,2) not null check (valor >= 0),
  origem_pagamento text not null check (origem_pagamento in
    ('Caixa','Cartão Empresa','Conta Bancária Sicoob','Conta Bancária Itaú','Cartão PF')),
  usuario_id      uuid not null references public.usuarios(id),
  criado_em       timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Estoque e Consumo
-- ---------------------------------------------------------------------
create table if not exists public.estoque_saldo (
  id          uuid primary key default gen_random_uuid(),
  produto_id  uuid not null references public.produtos(id) on delete cascade,
  unidade_id  uuid not null references public.unidades(id),
  saldo_atual numeric(12,3) not null default 0,
  unique (produto_id, unidade_id)
);

create table if not exists public.estoque_entradas (
  id          uuid primary key default gen_random_uuid(),
  produto_id  uuid not null references public.produtos(id),
  unidade_id  uuid not null references public.unidades(id),
  quantidade  numeric(12,3) not null check (quantidade > 0),
  data        date not null default (now() at time zone 'America/Sao_Paulo')::date,
  observacao  text,
  usuario_id  uuid not null references public.usuarios(id),
  criado_em   timestamptz not null default now()
);

create table if not exists public.estoque_saidas (
  id          uuid primary key default gen_random_uuid(),
  produto_id  uuid not null references public.produtos(id),
  unidade_id  uuid not null references public.unidades(id),
  quantidade  numeric(12,3) not null check (quantidade > 0),
  data        date not null default (now() at time zone 'America/Sao_Paulo')::date,
  local_uso_id uuid references public.locais_uso(id),
  usuario_id  uuid not null references public.usuarios(id),
  criado_em   timestamptz not null default now()
);

-- Índices para consultas/relatórios
create index if not exists idx_fechamentos_unidade_data on public.fechamentos_caixa (unidade_id, data);
create index if not exists idx_contas_unidade_data       on public.contas_pagas (unidade_id, data);
create index if not exists idx_saidas_unidade_data        on public.estoque_saidas (unidade_id, data);
create index if not exists idx_entradas_unidade_data      on public.estoque_entradas (unidade_id, data);

-- =====================================================================
-- Funções auxiliares (SECURITY DEFINER p/ evitar recursão nas policies)
-- =====================================================================
create or replace function public.meu_papel()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select papel from public.usuarios where id = auth.uid();
$$;

create or replace function public.minha_unidade()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select unidade_id from public.usuarios where id = auth.uid();
$$;

create or replace function public.sou_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.meu_papel() = 'admin', false);
$$;

-- Admin OU (não-admin cujo dado pertence à sua unidade)
create or replace function public.acesso_unidade(alvo uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.sou_admin() or alvo = public.minha_unidade();
$$;

-- =====================================================================
-- Trigger: cria/atualiza saldo de estoque em entradas e saídas
-- =====================================================================
create or replace function public.aplica_movimento_estoque()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  delta numeric(12,3);
begin
  if (tg_table_name = 'estoque_entradas') then
    delta := new.quantidade;
  else
    delta := -new.quantidade;
  end if;

  insert into public.estoque_saldo (produto_id, unidade_id, saldo_atual)
  values (new.produto_id, new.unidade_id, delta)
  on conflict (produto_id, unidade_id)
  do update set saldo_atual = public.estoque_saldo.saldo_atual + excluded.saldo_atual;

  return new;
end;
$$;

drop trigger if exists trg_estoque_entrada on public.estoque_entradas;
create trigger trg_estoque_entrada
  after insert on public.estoque_entradas
  for each row execute function public.aplica_movimento_estoque();

drop trigger if exists trg_estoque_saida on public.estoque_saidas;
create trigger trg_estoque_saida
  after insert on public.estoque_saidas
  for each row execute function public.aplica_movimento_estoque();

-- =====================================================================
-- RLS
-- =====================================================================
alter table public.unidades           enable row level security;
alter table public.usuarios           enable row level security;
alter table public.centros_custo      enable row level security;
alter table public.tipos_despesa      enable row level security;
alter table public.tipos_lavagem      enable row level security;
alter table public.locais_uso         enable row level security;
alter table public.produtos           enable row level security;
alter table public.fechamentos_caixa  enable row level security;
alter table public.fechamento_lavagens enable row level security;
alter table public.contas_pagas       enable row level security;
alter table public.estoque_saldo      enable row level security;
alter table public.estoque_entradas   enable row level security;
alter table public.estoque_saidas     enable row level security;

-- ---- Cadastros base: leitura p/ autenticados; escrita p/ admin --------
do $$
declare t text;
begin
  foreach t in array array['centros_custo','tipos_despesa','tipos_lavagem','locais_uso','produtos'] loop
    execute format('create policy %I_sel on public.%I for select to authenticated using (true);', t, t);
    execute format('create policy %I_ins on public.%I for insert to authenticated with check (public.sou_admin());', t, t);
    execute format('create policy %I_upd on public.%I for update to authenticated using (public.sou_admin()) with check (public.sou_admin());', t, t);
    execute format('create policy %I_del on public.%I for delete to authenticated using (public.sou_admin());', t, t);
  end loop;
end $$;

-- ---- Unidades ---------------------------------------------------------
create policy unidades_sel on public.unidades for select to authenticated
  using (public.sou_admin() or id = public.minha_unidade());
create policy unidades_ins on public.unidades for insert to authenticated
  with check (public.sou_admin());
create policy unidades_upd on public.unidades for update to authenticated
  using (public.sou_admin()) with check (public.sou_admin());
create policy unidades_del on public.unidades for delete to authenticated
  using (public.sou_admin());

-- ---- Usuários ---------------------------------------------------------
create policy usuarios_sel on public.usuarios for select to authenticated
  using (id = auth.uid() or public.sou_admin()
         or (public.meu_papel() = 'gerente' and unidade_id = public.minha_unidade()));
create policy usuarios_ins on public.usuarios for insert to authenticated
  with check (public.sou_admin());
create policy usuarios_upd on public.usuarios for update to authenticated
  using (public.sou_admin()) with check (public.sou_admin());
create policy usuarios_del on public.usuarios for delete to authenticated
  using (public.sou_admin());

-- ---- Fechamento de caixa (escopo por unidade) -------------------------
create policy fech_sel on public.fechamentos_caixa for select to authenticated
  using (public.acesso_unidade(unidade_id));
create policy fech_ins on public.fechamentos_caixa for insert to authenticated
  with check (public.acesso_unidade(unidade_id) and usuario_id = auth.uid());
create policy fech_upd on public.fechamentos_caixa for update to authenticated
  using (public.acesso_unidade(unidade_id)) with check (public.acesso_unidade(unidade_id));
create policy fech_del on public.fechamentos_caixa for delete to authenticated
  using (public.sou_admin());

create policy fechlav_all on public.fechamento_lavagens for all to authenticated
  using (exists (select 1 from public.fechamentos_caixa f
                 where f.id = fechamento_id and public.acesso_unidade(f.unidade_id)))
  with check (exists (select 1 from public.fechamentos_caixa f
                 where f.id = fechamento_id and public.acesso_unidade(f.unidade_id)));

-- ---- Contas a pagar (admin + gerente da unidade) ----------------------
create policy contas_sel on public.contas_pagas for select to authenticated
  using (public.acesso_unidade(unidade_id));
create policy contas_ins on public.contas_pagas for insert to authenticated
  with check (public.meu_papel() in ('admin','gerente') and public.acesso_unidade(unidade_id));
create policy contas_upd on public.contas_pagas for update to authenticated
  using (public.meu_papel() in ('admin','gerente') and public.acesso_unidade(unidade_id))
  with check (public.acesso_unidade(unidade_id));
create policy contas_del on public.contas_pagas for delete to authenticated
  using (public.sou_admin());

-- ---- Estoque ----------------------------------------------------------
create policy saldo_sel on public.estoque_saldo for select to authenticated
  using (public.acesso_unidade(unidade_id));

create policy entrada_sel on public.estoque_entradas for select to authenticated
  using (public.acesso_unidade(unidade_id));
create policy entrada_ins on public.estoque_entradas for insert to authenticated
  with check (public.meu_papel() in ('admin','gerente') and public.acesso_unidade(unidade_id));

create policy saida_sel on public.estoque_saidas for select to authenticated
  using (public.acesso_unidade(unidade_id));
create policy saida_ins on public.estoque_saidas for insert to authenticated
  with check (public.meu_papel() in ('admin','gerente') and public.acesso_unidade(unidade_id));

-- =====================================================================
-- Trigger: ao criar um usuário no Auth, garantir linha em public.usuarios
-- (o perfil é criado pela aplicação/admin; este trigger é um fallback)
-- =====================================================================
-- Observação: a criação de usuários é feita pela aplicação usando a
-- service role, que já insere em public.usuarios. Não criamos trigger
-- automático em auth.users para manter papel/unidade sob controle do admin.
