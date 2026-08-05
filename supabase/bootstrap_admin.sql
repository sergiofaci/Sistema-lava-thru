-- =====================================================================
-- Cria o PRIMEIRO administrador (dono).
--
-- Passo a passo:
--   1. No painel do Supabase: Authentication > Users > "Add user".
--      Crie o usuário com o e-mail e a senha do dono e marque
--      "Auto Confirm User".
--   2. Rode este SQL no SQL Editor, trocando o e-mail abaixo pelo
--      e-mail que você acabou de cadastrar.
--
-- Depois disso, o dono já consegue entrar no sistema e criar os demais
-- usuários (gerentes e caixas) pela tela de Cadastros > Usuários.
-- =====================================================================

insert into public.usuarios (id, nome, email, papel, unidade_id, ativo)
select u.id, 'Nome do Dono', u.email, 'admin', null, true
from auth.users u
where u.email = 'dono@lavathru.com.br'   -- <<< TROQUE por este e-mail
on conflict (id) do update
  set papel = 'admin', unidade_id = null, ativo = true;
