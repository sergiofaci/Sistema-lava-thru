# Auditoria / Benchmark — Sparkle Drive Suite vs. nosso Lava Thru

**Sistema auditado:** https://sparkle-drive-suite.lovable.app (protótipo feito no Lovable; internamente também se chama "Lava Thru").
**Data:** 2026-08-06
**Método:** análise do aplicativo em produção a partir do seu próprio código (rotas, telas, campos e textos extraídos dos bundles JavaScript servidos pelo app). Não foi possível capturar screenshots ao vivo porque o navegador automatizado deste ambiente não confia no certificado do proxy de rede — o inventário abaixo vem direto do código do protótipo, que é a fonte autoritativa das funcionalidades.

> ⚠️ Observação: vários fluxos do protótipo são **simulados/mock** (ex.: "Simular pagamento", "Simular aprovação", "lava-thru-pix-mock"). Ou seja, pagamentos e integrações ainda não são reais — são demonstrações de interface.

---

## 1. O que o protótipo é

Um sistema de **frente de caixa / balcão** de lava-rápido, com forte foco em **venda por assinatura** e **relacionamento com o cliente**. Módulos identificados (menu lateral):

| Módulo | O que faz (evidências no código) |
|---|---|
| **Dashboard** | Tela inicial de indicadores |
| **Operação** (PDV) | Venda no balcão: "Lançar venda", "Venda rápida de assinatura", **consulta por placa** (formato Mercosul, ex. ABC1D23), identifica se o cliente é assinante e mostra o **uso do plano**; formas de pagamento **Dinheiro, PIX (QR), Cartão — Maquininha, Boleto**; cliente **CPF (PF)** ou **CNPJ (Empresa)** com razão social |
| **Clientes** (CRM) | Cadastro de clientes, **Assinante × Avulso**, **Ranking de clientes**, **Total gasto**, **Visitas**, **Última visita**, placa, detalhes |
| **Assinantes** (Planos) | **Criar assinatura**, "Gerar nova assinatura", **controle de uso do plano** ("8 lavagens inclusas / mês", barra de progresso usado/incluído), busca de assinantes |
| **Financeiro** | **Recebimento por forma de pagamento**, **Últimas vendas** (Data, Cliente, Serviço, Placa, Valor, Pagamento) |
| **Assistente IA** | **Chat que responde perguntas do negócio**: "Qual meu faturamento nos últimos 30 dias?", "Quantos assinantes ativos temos?", "Quem são meus melhores clientes?", "serviços mais vendidos" |
| **Franquia** | Conceito de **Matriz × Franqueado** ("Franquia (Matriz)", "Franqueado") — rede de franquias |
| **Notificações** | Central de notificações in-app |

---

## 2. O que ELE tem e NÓS ainda não temos  ⭐ (a lista principal)

| # | Funcionalidade do protótipo | Temos? | Observação |
|---|---|---|---|
| G1 | **PDV / Ponto de Venda (Operação)** — registrar cada venda no balcão (serviço + cliente/placa + pagamento) | ❌ | Nosso sistema só faz o **fechamento** do caixa no fim do turno; não registra venda a venda |
| G2 | **Cadastro de Clientes (CRM)** — histórico, ranking, visitas, total gasto, última visita | ❌ | Não temos nenhum cadastro de cliente |
| G3 | **Veículos / Placas** — identificar carro/cliente pela placa | ❌ | Não temos veículos nem placas |
| G4 | **Assinaturas / Planos** — criar assinatura e **controlar o uso** (lavagens incluídas × usadas no mês) | ❌ | Hoje "Assinatura Mensal" é só uma **quantidade** no fechamento; não há entidade de plano nem controle de uso |
| G5 | **Consulta por placa** no atendimento | ❌ | Depende de G2/G3 |
| G6 | **Assistente de IA** (perguntas do negócio em linguagem natural) | ❌ | — |
| G7 | **Financeiro por venda** (ledger de recebimentos, "Últimas vendas") | ⚠️ parcial | Temos totais por fechamento e o dashboard; não temos venda a venda |
| G8 | **Pessoa Física × Jurídica** (CPF/CNPJ, razão social, frota) | ❌ | — |
| G9 | **Captura de pagamento** (PIX QR, maquininha) — mesmo que hoje seja mock | ❌ | Nós só registramos valores, não capturamos pagamento |
| G10 | **Modelo de franquia** (Matriz × Franqueado) | ⚠️ parcial | Temos **multiunidade** (mesmo dono); franquia envolve franqueados separados, repasses/royalties |
| G11 | **Notificações in-app** | ❌ | — |

---

## 3. O que NÓS temos e ele (aparentemente) não tem

Nosso sistema é mais forte na **retaguarda financeira/operacional**:

| # | Nossa funcionalidade | Observação |
|---|---|---|
| N1 | **Fechamento de caixa com conferência máquina × sistema, diferença e turnos (manhã/tarde)** | Conciliação de caixa robusta — não vista no protótipo |
| N2 | **Contas a Pagar** (centro de custo, tipo de despesa, origem do pagamento, consulta filtrável) | Gestão de despesas — não vista |
| N3 | **Estoque e Consumo** (entrada, baixa por local, saldo com alerta de mínimo) | Controle de insumos — não visto |
| N4 | **DRE gerencial** (receita − despesas, margem, comparativo mensal) | — |
| N5 | **Multiunidade com RLS + papéis (admin/gerente/caixa)** aplicados no banco | Segurança por unidade no nível de dados |
| N6 | **Controle de despesas por origem/conta** (Caixa, Sicoob, Itaú, Cartão Empresa, Cartão PF) | — |

**Conclusão:** os dois se complementam. O protótipo é **frente de caixa + cliente + assinatura + IA**; o nosso é **conciliação de caixa + despesas + estoque + DRE**. O produto ideal une as duas frentes.

---

## 4. Backlog priorizado para desenvolver

### 🔴 Essencial (núcleo de frente de caixa que falta)
- [ ] **E1. Cadastro de Clientes** (PF/PJ, contato, placa) + histórico básico
- [ ] **E2. Veículos/Placas** vinculados ao cliente + **consulta por placa**
- [ ] **E3. PDV / Operação** — registrar venda avulsa (serviço + cliente/placa + forma de pagamento). Cada venda alimenta o faturamento por venda (hoje só temos o total do fechamento)
- [ ] **E4. Assinaturas/Planos** — entidade de plano (nome, valor, lavagens incluídas/mês), criar assinatura para um cliente, **controle de uso** (contador de lavagens no mês) e identificação do assinante na venda

### 🟡 Importante
- [ ] **I1. Financeiro de vendas** — ledger de recebimentos por venda, "últimas vendas", integrando com o fechamento de caixa existente
- [ ] **I2. Ranking/segmentação de clientes** — visitas, total gasto, última visita, assinante × avulso
- [ ] **I3. Notificações in-app** (estoque baixo, diferença de caixa, assinatura vencendo)

### 🟢 Desejável
- [ ] **D1. Assistente de IA** — perguntas do negócio em linguagem natural sobre os dados (faturamento, assinantes, melhores clientes, serviços mais vendidos)
- [ ] **D2. Captura de pagamento real** (PIX/maquininha) para produção — hoje o protótipo é mock
- [ ] **D3. Modelo de franquia** (Matriz × Franqueado, repasses) — caso o negócio vá franquear

---

## 5. Notas e ressalvas
- O protótipo tem pagamentos e integrações **simulados** (mock); ao replicar, decidir o que é demonstração e o que precisa ser real.
- Auditoria feita por análise de código do app (rotas, componentes e textos). Uma verificação visual tela a tela pode ser feita quando o navegador automatizado tiver acesso liberado (ou com prints enviados manualmente).
- Nada aqui copia código do protótipo — é um **benchmark de funcionalidades** para orientar o nosso desenvolvimento.
