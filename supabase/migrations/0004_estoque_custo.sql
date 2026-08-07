-- =====================================================================
-- Migration 0004 — Custo de estoque (valorização)
--   * Preço na entrada de produtos
--   * Custo médio ponderado no saldo
--   * Custo/valor registrado em cada baixa (para a contabilidade)
-- Rode no SQL Editor do Supabase DEPOIS da 0003.
-- =====================================================================

alter table public.estoque_entradas
  add column if not exists preco_unitario numeric(12,4) not null default 0;

alter table public.estoque_saidas
  add column if not exists custo_unitario numeric(12,4) not null default 0,
  add column if not exists valor_total    numeric(12,2) not null default 0;

alter table public.estoque_saldo
  add column if not exists custo_medio numeric(12,4) not null default 0;

-- ---- Entrada: soma saldo e recalcula o custo médio ponderado ----------
create or replace function public.aplica_entrada_estoque()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.estoque_saldo (produto_id, unidade_id, saldo_atual, custo_medio)
  values (new.produto_id, new.unidade_id, new.quantidade, new.preco_unitario)
  on conflict (produto_id, unidade_id) do update
    set custo_medio = case
          when (public.estoque_saldo.saldo_atual + excluded.saldo_atual) > 0
          then round(
            ((public.estoque_saldo.saldo_atual * public.estoque_saldo.custo_medio)
             + (excluded.saldo_atual * excluded.custo_medio))
            / (public.estoque_saldo.saldo_atual + excluded.saldo_atual), 4)
          else excluded.custo_medio
        end,
        saldo_atual = public.estoque_saldo.saldo_atual + excluded.saldo_atual;
  return new;
end;
$$;

-- ---- Baixa (BEFORE): grava o custo médio do momento na própria linha ---
create or replace function public.registra_custo_saida()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare cm numeric(12,4);
begin
  select custo_medio into cm
    from public.estoque_saldo
   where produto_id = new.produto_id and unidade_id = new.unidade_id;
  new.custo_unitario := coalesce(cm, 0);
  new.valor_total := round(new.quantidade * coalesce(cm, 0), 2);
  return new;
end;
$$;

-- ---- Baixa (AFTER): subtrai do saldo (custo médio não muda) ------------
create or replace function public.aplica_saida_estoque()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.estoque_saldo
     set saldo_atual = saldo_atual - new.quantidade
   where produto_id = new.produto_id and unidade_id = new.unidade_id;
  return new;
end;
$$;

-- Substitui os gatilhos antigos
drop trigger if exists trg_estoque_entrada on public.estoque_entradas;
create trigger trg_estoque_entrada
  after insert on public.estoque_entradas
  for each row execute function public.aplica_entrada_estoque();

drop trigger if exists trg_estoque_saida on public.estoque_saidas;
create trigger trg_estoque_saida_custo
  before insert on public.estoque_saidas
  for each row execute function public.registra_custo_saida();
create trigger trg_estoque_saida
  after insert on public.estoque_saidas
  for each row execute function public.aplica_saida_estoque();
