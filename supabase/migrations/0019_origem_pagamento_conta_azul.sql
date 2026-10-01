-- =====================================================================
-- Migration 0019 — Nova origem de pagamento: Conta Bancária Conta Azul
--   * Amplia o check de contas_pagas.origem_pagamento para incluir a
--     conta bancária "Conta Azul", mantendo as origens já existentes.
--   Rode no SQL Editor do Supabase DEPOIS da 0018.
-- =====================================================================

alter table public.contas_pagas
  drop constraint if exists contas_pagas_origem_pagamento_check;

alter table public.contas_pagas
  add constraint contas_pagas_origem_pagamento_check
  check (origem_pagamento in (
    'Caixa',
    'Cartão Empresa',
    'Conta Bancária Sicoob',
    'Conta Bancária Itaú',
    'Conta Bancária Conta Azul',
    'Cartão PF'
  ));
