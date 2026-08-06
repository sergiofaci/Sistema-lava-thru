# Mapa Técnico — Proposta da empresa + Protótipo × Nosso projeto

**Objetivo:** avaliar tecnicamente a proposta de desenvolvimento (white label multi-tenant com franquias, royalties, PDV, assinaturas, pagamentos, fiscal e automações) somada ao protótipo já auditado, e mapear **tudo o que precisamos incluir** no nosso projeto para atender à proposta.

**Data:** 2026-08-06
**Base:** proposta detalhada enviada pelo cliente + `docs/auditoria-benchmark.md` (protótipo Sparkle Drive) + código atual do nosso Lava Thru.

---

## 0. Veredito técnico (resumo honesto)

O que construímos até aqui é uma **base sólida de retaguarda** (fechamento de caixa, contas a pagar, estoque, DRE gerencial, cadastros, dashboard, multiunidade com RLS e papéis). Isso cobre, com adaptações, **parte da Fase 1 e da Fase 2** da proposta.

Porém, a proposta descreve uma **plataforma SaaS White Label muito maior**, cujo núcleo é uma **arquitetura de 3 níveis com franquias e royalties automáticos**, além de **PDV, assinaturas recorrentes, pagamentos digitais com split, emissão fiscal (NF-e) e automações com hardware (OCR/câmeras/catraca/timers)**.

Três conclusões:
1. **A maior obra não é uma tela nova — é reestruturar a arquitetura multi-tenant** (inserir a camada "Rede" acima de "Unidade"). Isso toca **todas** as tabelas e o RLS.
2. **Boa parte do valor depende de integrações de terceiros e hardware** (gateways de pagamento com split, Tecnospeed para NF, câmeras OCR, maquininhas TEF/Smart POS, "automatizei"). São itens que exigem **contratos, credenciais e, às vezes, equipamento** — não são só software.
3. **Reaproveitamos bastante** do que já fizemos (DRE, contas a pagar, estoque, cadastros, RLS) — mas quase tudo precisa ganhar a dimensão **Rede** e, em vários casos, evoluir.

**Estimativa grosseira de cobertura atual da proposta: ~20–25%** (a fundação de retaguarda), com o núcleo arquitetural e as integrações ainda por fazer.

---

## 1. A mudança estrutural central — Hierarquia White Label (Master → Rede → Unidade)

Hoje temos: `unidades` + `usuarios(papel ∈ {admin,gerente,caixa}, unidade_id)`, com isolamento por **unidade** via RLS.

A proposta exige **3 níveis** e isolamento por **Rede** (tenant), com tipos de unidade:

```
Master Admin
 └── Rede (Franqueador/Matriz)  ← tenant, com identidade visual própria
      ├── Unidade Própria     (sem royalties)
      └── Unidade Franqueada  (com royalties → repasse à Rede)
```

### Impacto no modelo de dados (proposto)
- **Nova entidade `redes`** (tenant): nome, slug/domínio, branding (logo, cores, tema), integrações, ativo.
- **`unidades`** ganha: `rede_id`, `tipo ∈ {propria, franqueada}`, `royalty_pct`, `cidade`.
- **`usuarios`** ganha: `nivel ∈ {master, rede, unidade, operador}`, `rede_id` (nulo p/ master), `unidade_id` (p/ unidade/operador), e função do operador (pátio, financeiro…).
- **Todos os cadastros passam a ser por Rede** (ganham `rede_id`): serviços, planos, produtos, centros de custo, tipos de despesa, cupons, clientes, fornecedores, locais de uso, tipos de lavagem.
- **RLS reescrito** para: isolar por `rede_id` (tenant) **e** por `unidade_id` (franqueado/operador); Master vê tudo; Rede vê sua Rede inteira; Unidade vê só a sua.
- **White label por Rede:** tema/logo/cores aplicados a partir do `rede_id` do usuário (hoje o tema é fixo Lava Thru).

> ⚠️ Este item é **pré-requisito** de quase todo o resto (royalties, dashboards por nível, onboarding). Deve vir primeiro. Complexidade: **Alta** (refatoração transversal + migração de dados).

---

## 2. Mapa completo de funcionalidades

Legenda — **Temos:** ✅ pronto · ⚠️ parcial (adaptar) · ❌ não existe.
**Complexidade:** B(aixa) · M(édia) · A(lta) · MA (muito alta — integração/hardware).

### Fase 1 — Núcleo operacional

| # | Item da proposta / protótipo | Temos | O que falta incluir | Cplx. | Dependências |
|---|---|---|---|---|---|
| 1.1 | **Login multi-tenant 4 níveis (Master/Rede/Unidade/Operador)** | ⚠️ | Camada Rede, nível Master, papel Operador por função; RLS por rede+unidade | A | Item 1 (arquitetura) |
| 1.2 | **Cadastro de Redes + White label (logo, cores, domínio)** | ❌ | Entidade `redes`, tema dinâmico por Rede | A | — |
| 1.3 | **Unidades: própria × franqueada + royalty_pct + cidade** | ⚠️ | Campos e distinção de tipo | B | 1.1 |
| 1.4 | **Painel de Operação do Pátio (identificar veículo pela placa)** | ❌ | Tela de pátio: consulta placa, assinante×avulso | A | Clientes/Placas; automatizei |
| 1.5 | · Placa de **assinante ativo**: lavagens contratadas × consumidas, **baixa rápida**, adicionais | ❌ | Assinaturas + controle de uso + baixa | A | 1.9, 1.10 |
| 1.6 | · Placa **não-assinante**: venda avulsa ou venda de plano + cadastro rápido | ❌ | Fluxo de venda no pátio | A | 1.8, 1.11 |
| 1.7 | · **Bloqueio de lavagem excedente** (cota mensal atingida) | ❌ | Regra de cota no plano | M | 1.10 |
| 1.8 | **Catálogo de Serviços** (Essencial/Completa/Premium/Detalhada) com **preço de tabela da Rede + preço por unidade** | ⚠️ | Entidade serviços + override de preço por unidade (hoje só temos "tipos de lavagem" sem preço) | M | 1.2 |
| 1.9 | **Planos de Assinatura** (cota lavagens/mês, preço, **% royalties**, exibir no site) | ❌ | Entidade planos | M | 1.2 |
| 1.10 | **Assinaturas de clientes** + controle de uso mensal | ❌ | Entidade assinaturas + contador de uso/ciclo | A | 1.9, 1.13 |
| 1.11 | **Cupons promocionais** (%/fixo, validade, escopo global/franquia) | ❌ | Entidade cupons | M | 1.2 |
| 1.12 | **Cadastro de Franquias/Rede** (cidade, taxa de royalties) | ⚠️ | Parte de 1.2/1.3 | B | 1.2 |
| 1.13 | **Clientes da Rede** (nome, e-mail, telefone, documento, **placas**, histórico entre unidades) | ❌ | Entidades clientes + veículos/placas; cliente é da **Rede** | A | 1.2 |
| 1.14 | **Contas a Receber / venda-a-venda** (todo serviço gera registro financeiro) | ⚠️ | Ledger de vendas (hoje só temos total por fechamento) | A | 1.6 |
| 1.15 | **Cálculo automático de Royalties** (franqueada, em tempo real por venda) | ❌ | Motor de royalties sobre cada venda | A | 1.14, 1.3 |
| 1.16 | **Dashboards por nível** (Rede consolidado / Unidade franqueada c/ royalties / Unidade própria s/ royalties) | ⚠️ | Visões por nível + royalties + contas a receber + saldo previsto | A | 1.14, 1.15 |
| 1.17 | **Pagamento PIX** (QR dinâmico + confirmação por **webhook**) | ❌ | Integração gateway/banco PIX | MA | Gateway |
| 1.18 | **Pagamento Cartão** (Smart POS/TEF via Zoop/Stone/PagSeguro, conciliação automática) | ❌ | Integração maquininha/TEF | MA | Gateway + hardware |
| — | **Fechamento de caixa (conferência máquina × sistema, turnos, diferença)** | ✅ | Nosso; vira camada de **conciliação/split de dinheiro** | — | — |

### Fase 2 — Expansão (conveniência, finanças avançadas)

| # | Item | Temos | O que falta | Cplx. | Dependências |
|---|---|---|---|---|---|
| 2.1 | **Loja de Conveniência** (produtos, preço local, estoque mínimo) | ⚠️ | Temos estoque/mínimo; falta **preço de venda por unidade** e catálogo por Rede | M | 1.2 |
| 2.2 | **PDV de Conveniência** (código de barras, busca rápida, atalhos, PIX/cartão) | ❌ | Interface de PDV | A | 1.17/1.18 |
| 2.3 | **Contas a Pagar + Fornecedores + agendamento de contas futuras** | ⚠️ | Temos contas a pagar e centros hierárquicos; falta **fornecedores (CNPJ)**, **vencimento/agendamento** e status aberto/futuro | M | — |
| 2.4 | **DRE completa** (Receita − Deduções(royalties) − Custos variáveis = Margem de contribuição − Despesas fixas = Lucro; comparativo entre unidades) | ⚠️ | Temos DRE gerencial simples; falta royalties, custos variáveis/fixos, margem de contribuição, comparativo Rede | M | 1.15, 2.3 |

### Fases adicionais

| # | Item | Temos | O que falta | Cplx. | Dependências |
|---|---|---|---|---|---|
| 3.1 | **NF-e de produto e serviço via Tecnospeed** (2 CNPJs por unidade: Lava Rápido / Conveniência), emissão automática ao fechar venda | ❌ | Integração Tecnospeed (x2 CNPJ), `unidade_cnpjs`, `notas_fiscais`, distinção produto×serviço | MA | Tecnospeed + CNPJs |
| 3.2 | **Automação: cancela por OCR de placa** (câmera libera cadastrados; registro rápido para novos) | ❌ | Câmera/OCR + integração cancela + `acessos_patio` | MA | Hardware/OCR |
| 3.3 | **Automação: integração maquininha (valor enviado, baixa automática)** | ❌ | Comunicação PDV↔maquininha | MA | Hardware |
| 3.4 | **Automação: timer de vaga por OCR** (entrada/saída, alerta de excedente) | ❌ | Câmeras + lógica de tempo | MA | Hardware |
| 3.5 | **Automação: timer de aspirador** (tempo de uso por ponto) | ❌ | Temporizador/IoT | MA | Hardware |
| 3.6 | **Split de Pagamento** (divide venda entre CNPJs; royalties no ato p/ cartão/PIX; divisão contábil no dinheiro via fechamento) | ❌ | Split no gateway + regras + divisão no fechamento | MA | Gateway com split |
| 3.7 | **Onboarding de nova Rede (White Label)** (provisionar identidade, automações, pagamentos, NF, site, regras, admin, capacitação) | ❌ | Assistente de provisionamento por Rede | A | 1.2 e integrações |
| 3.8 | **Site público por Rede + Área do Cliente** (planos, localização das unidades, cadastro/compra) | ❌ | Site white-label + portal do cliente | A | 1.2, 1.9, 1.13 |
| 3.9 | **Integração "automatizei"** (base de assinantes/placas no pátio) | ❌ | Integração externa citada no painel de pátio | MA | Terceiro |
| 3.10 | **Assistente de IA** (do protótipo: perguntas do negócio) | ❌ | Chat sobre os dados + LLM | M | dados consolidados |
| 3.11 | **Notificações in-app** (do protótipo) | ❌ | Central de notificações | B | — |

---

## 3. Integrações de terceiros e hardware (mapa de dependências e risco)

Estes itens **não são só programação** — exigem contrato/credencial e, às vezes, equipamento. São os de maior risco/prazo/custo.

| Integração | Para quê | Tipo | Risco/observação |
|---|---|---|---|
| **Gateway de pagamento com split** (Zoop/Stone/PagSeguro) | PIX QR, cartão TEF/Smart POS, split, royalties no ato | Contrato + API + (hardware POS) | Alto — escolher parceiro que suporte **split**; homologação |
| **Tecnospeed** (x2 por CNPJ) | Emissão de NF-e (produto/serviço) | Contrato + API | Alto — regras fiscais por município; certificado digital |
| **Câmeras OCR + cancela** | Leitura de placa na entrada, timer de vaga | Hardware + software | Alto — instalação física, precisão do OCR |
| **Timer de aspirador** | Tempo de uso por ponto | IoT/hardware | Médio-alto |
| **"automatizei"** | Base de assinantes/placas no pátio | API externa | Depende de documentação do parceiro |
| **Webhook bancário/PIX** | Confirmação instantânea de pagamento | Infra (endpoint público seguro) | Médio |

> **Decisão de negócio necessária:** definir os parceiros (gateway, NF, câmeras/POS) antes de estimar prazo real dessas fases.

---

## 4. O que já temos e reaproveitamos

| Já construído | Como entra na proposta |
|---|---|
| Auth + RLS **multiunidade** + papéis | Base do login multi-tenant (evolui para 4 níveis + Rede) |
| **Fechamento de caixa** (turnos, máquina×sistema, diferença) | Vira a camada de **conciliação** e **divisão contábil do dinheiro** (split físico) |
| **Contas a Pagar** + centros de custo hierárquicos | Base da "Gestão de Saídas" (falta fornecedores + agendamento) |
| **Estoque/Consumo** + alerta de mínimo | Base da Loja de Conveniência (falta preço de venda por unidade) |
| **DRE gerencial** | Base da DRE completa (falta royalties, custos variáveis/fixos, comparativo) |
| **Dashboard** (faturamento/despesas/lavagens) | Base dos dashboards por nível |
| **Cadastros** (unidades, usuários, produtos, tipos, locais) | Reaproveitados, ganhando `rede_id` |
| **Identidade visual Lava Thru** | Vira o **tema padrão**; white label torna o tema dinâmico por Rede |

---

## 5. Roadmap recomendado para o NOSSO projeto

Ordem que reaproveita o que temos e respeita as dependências:

- **M0 — Rearquitetura multi-tenant (pré-requisito):** entidade `redes`, `rede_id` em tudo, 4 níveis de usuário, RLS por rede+unidade, tema dinâmico (white label). *(Itens 1, 1.1, 1.2, 1.3)*
- **M1 — Clientes, Veículos/Placas, Serviços, Planos, Cupons** (cadastros do core comercial). *(1.8, 1.9, 1.11, 1.13)*
- **M2 — PDV do Pátio + Vendas (Contas a Receber) + Assinaturas com controle de uso + bloqueio de excedente.** *(1.4–1.7, 1.10, 1.14)*
- **M3 — Royalties automáticos + Dashboards por nível + DRE completa.** *(1.15, 1.16, 2.4)*
- **M4 — Pagamentos digitais (PIX QR + cartão) e conciliação.** *(1.17, 1.18)* — depende de gateway
- **M5 — Conveniência (PDV produtos) + Fornecedores/Contas a pagar avançadas.** *(2.1, 2.2, 2.3)*
- **M6 — Split de pagamento + Royalties no ato.** *(3.6)* — depende de gateway com split
- **M7 — Emissão fiscal (Tecnospeed, 2 CNPJs).** *(3.1)*
- **M8 — Onboarding White Label + Site público + Área do cliente.** *(3.7, 3.8)*
- **M9 — Automações (OCR cancela, timer vaga, timer aspirador) + "automatizei".** *(3.2–3.5, 3.9)* — hardware
- **Transversal — Assistente de IA + Notificações.** *(3.10, 3.11)*

> M0–M3 são **software puro** (100% no nosso alcance aqui). M4+ dependem de **parceiros/hardware** e de decisões de negócio/contrato.

---

## 6. Decisões e riscos a resolver com você

1. **Parceiros de integração:** qual gateway (com split?), Tecnospeed sim/não, câmeras/POS/aspirador (marcas). Sem isso, as fases M4+ ficam sem estimativa firme.
2. **Modelo White Label real:** vamos operar como plataforma multi-Rede (vender para outras redes) ou só a Lava Thru? Isso define o quanto investir no Master Admin/onboarding.
3. **Recorrência de assinatura:** cobrança recorrente automática (cartão recorrente) faz parte? Isso adiciona um motor de billing (ciclos, inadimplência).
4. **Fiscal/CNPJs:** confirmar a estrutura de 2 CNPJs por unidade (lava rápido × conveniência) — impacta split e NF.
5. **Migração:** ao inserir a camada Rede, os dados atuais viram "Rede Lava Thru / unidades próprias" — migração planejada.

---

### Próximo passo sugerido
Começar por **M0 (rearquitetura multi-tenant)** — é o alicerce de todo o resto e é software puro. Em paralelo, você resolve as **decisões da seção 6** (parceiros), que destravam as fases de integração.
