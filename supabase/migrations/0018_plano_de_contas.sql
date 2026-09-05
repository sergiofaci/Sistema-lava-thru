-- =====================================================================
-- Migration 0018 — Plano de contas: comportamento, exibição na DRE e carga
--   * tipos_despesa ganha:
--       exibir_na_dre boolean  -> se a conta compõe (ou não) a DRE
--       comportamento text     -> fixo | variavel | deducao | nao_aplicavel
--       codigo text            -> código do plano de contas (ex.: 4.05)
--   * Carrega/atualiza todas as contas do plano (idempotente por nome):
--     atualiza as que já existem e insere as que faltam.
--   Rode no SQL Editor do Supabase DEPOIS da 0017.
-- =====================================================================

alter table public.tipos_despesa
  add column if not exists exibir_na_dre boolean not null default true;
alter table public.tipos_despesa
  add column if not exists comportamento text not null default 'fixo'
    check (comportamento in ('fixo', 'variavel', 'deducao', 'nao_aplicavel'));
alter table public.tipos_despesa
  add column if not exists codigo text;

comment on column public.tipos_despesa.exibir_na_dre is 'Se a conta compõe a DRE (false = passivo/repasse/PL/ativo)';
comment on column public.tipos_despesa.comportamento is 'fixo | variavel | deducao | nao_aplicavel';

-- Carga do plano de contas (idempotente por nome, case-insensitive) --------
create temporary table _seed (nome text, codigo text, grupo text, comp text, exibir boolean) on commit drop;
insert into _seed (nome, codigo, grupo, comp, exibir) values
  ('Impostos sobre Vendas e sobre Serviços','4.01.01','deducao','deducao',true),
  ('Demais impostos','4.01.02','operacional','fixo',true),
  ('Comissões de Vendedores','4.02','operacional','variavel',true),
  ('Estorno','4.02','deducao','deducao',true),
  ('Materiais Aplicados na Prestação de Serviços','4.02','cmv','variavel',true),
  ('Materiais para Revenda','4.02','cmv','variavel',true),
  ('Produtos para Lavagem','4.02','cmv','variavel',true),
  ('Transporte de Mercadorias Vendidas','4.02','operacional','variavel',true),
  ('13º Salário - 1ª Parcela','4.03','operacional','fixo',true),
  ('13º Salário - 2ª Parcela','4.03','operacional','fixo',true),
  ('Abono Pecuniário','4.03','operacional','fixo',true),
  ('Adiantamento Salarial','4.03','operacional','fixo',true),
  ('Contribuição Sindical','4.03','operacional','fixo',true),
  ('Exames Médicos','4.03','operacional','fixo',true),
  ('Férias','4.03','operacional','fixo',true),
  ('FGTS e Multa de FGTS','4.03','operacional','fixo',true),
  ('Freelancer','4.03','operacional','fixo',true),
  ('INSS sobre Salários - GPS','4.03','operacional','fixo',true),
  ('IRRF s/ Salários - DARF 0561','4.03','operacional','fixo',true),
  ('Plano de Saúde Colaboradores','4.03','operacional','fixo',true),
  ('PLR - Participação nos Lucros e Resultados','4.03','operacional','fixo',true),
  ('Remuneração de Autônomos','4.03','operacional','fixo',true),
  ('Remuneração de Estagiários','4.03','operacional','fixo',true),
  ('Rescisões','4.03','operacional','fixo',true),
  ('Salários','4.03','operacional','fixo',true),
  ('Vale-Alimentação','4.03','operacional','fixo',true),
  ('Vale-Transporte','4.03','operacional','fixo',true),
  ('Empréstimos Consignados','4.03','operacional','nao_aplicavel',false),
  ('Retenção - GPS 2631 - INSS','4.03','operacional','nao_aplicavel',false),
  ('Confraternizações','4.04','operacional','fixo',true),
  ('Cursos e Treinamentos','4.04','operacional','fixo',true),
  ('Farmácia','4.04','operacional','fixo',true),
  ('Gratificações','4.04','operacional','fixo',true),
  ('Plano Odontológico Colaboradores','4.04','operacional','fixo',true),
  ('Presentes para colaboradores','4.04','operacional','fixo',true),
  ('Seguro de Vida','4.04','operacional','fixo',true),
  ('Uniformes','4.04','operacional','fixo',true),
  ('Empréstimo a funcionários','4.04','operacional','nao_aplicavel',false),
  ('Água e Saneamento','4.05','operacional','fixo',true),
  ('Alvará de Funcionamento','4.05','operacional','fixo',true),
  ('Arquitetura','4.05','operacional','fixo',true),
  ('Automação','4.05','operacional','fixo',true),
  ('Bens de Pequeno Valor','4.05','operacional','fixo',true),
  ('BPO Financeiro','4.05','operacional','fixo',true),
  ('Cartório','4.05','operacional','fixo',true),
  ('Combustíveis','4.05','operacional','fixo',true),
  ('Copa e Cozinha','4.05','operacional','fixo',true),
  ('Corpo de bombeiro','4.05','operacional','fixo',true),
  ('Correios','4.05','operacional','fixo',true),
  ('Decoração','4.05','operacional','fixo',true),
  ('Descarte de Resíduos','4.05','operacional','fixo',true),
  ('Desenvolvimento de Marca','4.05','operacional','fixo',true),
  ('Desenvolvimento de Produtos','4.05','operacional','fixo',true),
  ('Deslocamento','4.05','operacional','fixo',true),
  ('Energia Elétrica','4.05','operacional','fixo',true),
  ('Fretes pagos','4.05','operacional','fixo',true),
  ('Honorários Advocatícios','4.05','operacional','fixo',true),
  ('Honorários Consultoria','4.05','operacional','fixo',true),
  ('Honorários Contábeis','4.05','operacional','fixo',true),
  ('Honorários (outros)','4.05','operacional','fixo',true),
  ('Hospedagem','4.05','operacional','fixo',true),
  ('Imposto Estadual','4.05','operacional','fixo',true),
  ('Imposto Municipal','4.05','operacional','fixo',true),
  ('Intérprete','4.05','operacional','fixo',true),
  ('IRRF','4.05','operacional','fixo',true),
  ('Lanches e Refeições','4.05','operacional','fixo',true),
  ('Laudos SST','4.05','operacional','fixo',true),
  ('Manutenção de Veículos','4.05','operacional','fixo',true),
  ('Marketing e Publicidade','4.05','operacional','fixo',true),
  ('Materiais de Escritório','4.05','operacional','fixo',true),
  ('Materiais de Limpeza e de Higiene','4.05','operacional','fixo',true),
  ('Material de uso e consumo','4.05','operacional','fixo',true),
  ('Passagens','4.05','operacional','fixo',true),
  ('Patrocínio','4.05','operacional','fixo',true),
  ('Recrutamento e Seleção','4.05','operacional','fixo',true),
  ('Registro de Marca','4.05','operacional','fixo',true),
  ('Seguro','4.05','operacional','fixo',true),
  ('Serviço de Limpeza','4.05','operacional','fixo',true),
  ('Serviços prestados por terceiros','4.05','operacional','fixo',true),
  ('Sistema Alarme','4.05','operacional','fixo',true),
  ('Software / Licença de Uso','4.05','operacional','fixo',true),
  ('Tarifas','4.05','operacional','fixo',true),
  ('Telefonia e Internet','4.05','operacional','fixo',true),
  ('Telefonia Móvel','4.05','operacional','fixo',true),
  ('Transporte Urbano (táxi, Uber)','4.05','operacional','fixo',true),
  ('Brindes para Clientes','4.06','operacional','fixo',true),
  ('Conveniência','4.06','operacional','fixo',true),
  ('Viagens e Representações','4.06','operacional','fixo',true),
  ('Aluguel','4.07','operacional','fixo',true),
  ('Condomínio','4.07','operacional','fixo',true),
  ('IPTU','4.07','operacional','fixo',true),
  ('Seguro de Imóveis','4.07','operacional','fixo',true),
  ('Taxa de Lixo','4.07','operacional','fixo',true),
  ('Vigilância e Segurança Patrimonial','4.07','operacional','fixo',true),
  ('Retenção - Darf 3208 - IRRF Aluguel','4.07','operacional','nao_aplicavel',false),
  ('Estacionamento','4.08','operacional','fixo',true),
  ('IPVA / DPVAT / Licenciamento','4.08','operacional','fixo',true),
  ('Manutenção Veiculo de Clientes','4.08','operacional','fixo',true),
  ('Multas de Trânsito','4.08','operacional','fixo',true),
  ('Pedágios','4.08','operacional','fixo',true),
  ('Seguros de Veículos','4.08','operacional','fixo',true),
  ('INSS sobre Pró-labore - GPS','4.09','operacional','fixo',true),
  ('IRRF sobre Pró-labore - Darf','4.09','operacional','fixo',true),
  ('Plano de Saúde Sócios','4.09','operacional','fixo',true),
  ('Plano Odontológico Sócios','4.09','operacional','fixo',true),
  ('Pró-labore','4.09','operacional','fixo',true),
  ('Adiantamento sócio','4.09','operacional','nao_aplicavel',false),
  ('Antecipação de Lucros','4.09','operacional','nao_aplicavel',false),
  ('Descontos financeiros concedidos','4.10','financeira','fixo',true),
  ('Impostos sobre Aplicações','4.10','financeira','fixo',true),
  ('IOF','4.10','financeira','fixo',true),
  ('Juros pagos','4.10','financeira','fixo',true),
  ('Multas pagas','4.10','financeira','fixo',true),
  ('Tarifa Cambial','4.10','financeira','fixo',true),
  ('Tarifas Bancárias','4.10','financeira','fixo',true),
  ('Tarifas de Boletos','4.10','financeira','fixo',true),
  ('Tarifas de Cartões de Crédito','4.10','financeira','fixo',true),
  ('Tarifas DOC / TED','4.10','financeira','fixo',true),
  ('Descontos incondicionais concedidos','4.10','deducao','deducao',true),
  ('Consórcio','4.10','operacional','nao_aplicavel',false),
  ('INTEGRALIZAÇÃO CAPITAL SICOOB','4.10','operacional','nao_aplicavel',false);

update public.tipos_despesa t set
  codigo        = s.codigo,
  grupo_dre     = s.grupo,
  comportamento = s.comp,
  exibir_na_dre = s.exibir
from _seed s
where lower(btrim(t.nome)) = lower(btrim(s.nome));

insert into public.tipos_despesa (nome, codigo, grupo_dre, comportamento, exibir_na_dre, ativo)
select s.nome, s.codigo, s.grupo, s.comp, s.exibir, true
from _seed s
where not exists (
  select 1 from public.tipos_despesa t where lower(btrim(t.nome)) = lower(btrim(s.nome))
);
