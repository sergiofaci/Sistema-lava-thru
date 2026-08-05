# Lava Thru — Sistema de Gestão

Sistema web (na nuvem) para gestão operacional e financeira das unidades da **Lava Thru Car Wash**.
Multiunidade desde o início, com login individual e controle de acesso por papel.

- **Frontend/Backend:** Next.js 16 (App Router) + React + TailwindCSS
- **Banco / Auth / Hospedagem de dados:** Supabase (PostgreSQL)
- **Hospedagem do app:** Vercel
- **Gráficos:** Recharts

## Módulos (por fase)

| Fase | Módulo | Status |
|---|---|---|
| 1 | Autenticação + cadastros base (unidades, usuários, tipos de lavagem, centros de custo, tipos de despesa, produtos, locais de uso) | ✅ **Pronto** |
| 2 | Fechamento de caixa (comparação máquina × sistema, alerta de diferença, lavagens por tipo) | ⏳ |
| 3 | Contas a pagar | ⏳ |
| 4 | Estoque e consumo | ⏳ |
| 5 | Dashboard e relatórios | ⏳ |
| 6 | Identidade visual final | ⏳ |

---

## Como colocar no ar (passo a passo)

### 1. Criar o projeto no Supabase
1. Acesse [supabase.com](https://supabase.com) e crie um projeto.
2. **Região:** escolha **South America (São Paulo) — `sa-east-1`** (baixa latência e dados no Brasil).
3. Plano sugerido: **Pro** (backup diário automático). Dá para começar no Free e migrar depois.

### 2. Criar as tabelas
No painel do Supabase, abra **SQL Editor** e rode, nesta ordem:
1. `supabase/migrations/0001_init.sql` — cria tabelas, segurança (RLS) e gatilhos.
2. `supabase/seed.sql` — insere os dados de referência (7 tipos de lavagem, locais de uso, etc.).

### 3. Configurar as variáveis de ambiente
1. Copie `.env.example` para `.env.local`.
2. Preencha com os valores em **Supabase > Project Settings > API**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (chave pública / anon)
   - `SUPABASE_SERVICE_ROLE_KEY` (chave `service_role` — **secreta**, só no servidor)

### 4. Criar o primeiro administrador (dono)
1. Supabase > **Authentication > Users > Add user**: cadastre e-mail e senha do dono (marque *Auto Confirm User*).
2. SQL Editor: rode `supabase/bootstrap_admin.sql` trocando o e-mail pelo que você acabou de criar.

A partir daí, o dono entra no sistema e cria os demais usuários pela tela **Cadastros > Usuários**.

### 5. Rodar localmente (para testar)
```bash
npm install
npm run dev
```
Abra <http://localhost:3000> e faça login.

### 6. Publicar na Vercel
1. Suba este repositório no GitHub (já está).
2. Em [vercel.com](https://vercel.com), importe o repositório.
3. Em **Settings > Environment Variables**, adicione as 3 variáveis do passo 3.
4. Deploy. A Vercel gera um link que todos acessam (PC e celular).

---

## Perfis de acesso

| Perfil | O que enxerga |
|---|---|
| **Administrador** (dono) | Tudo, todas as unidades, todos os cadastros e relatórios consolidados |
| **Gerente de Unidade** | Sua unidade: fechamento, contas a pagar, estoque e relatórios |
| **Caixa/Colaborador** | Apenas o fechamento de caixa da sua unidade |

O isolamento entre unidades é garantido no banco por **Row Level Security (RLS)** — um usuário
de uma unidade não consegue ler dados de outra, mesmo que tente acessar diretamente.

## Backup

- Backup automático diário no plano Pro do Supabase.
- Recomendado também exportar periodicamente os dados financeiros (CSV/dump) para uma cópia
  independente (será automatizado em fase futura).

## Estrutura do projeto

```
supabase/
  migrations/0001_init.sql   Schema + RLS + gatilhos
  seed.sql                   Dados de referência
  bootstrap_admin.sql        Cria o primeiro admin
src/
  proxy.ts                   Renova sessão e bloqueia acesso sem login
  lib/                       Clients Supabase, auth e tipos
  components/                UI compartilhada (sidebar, cards, formulários)
  app/
    login/                   Tela de login
    (app)/                   Área autenticada (dashboard, módulos, cadastros)
```
