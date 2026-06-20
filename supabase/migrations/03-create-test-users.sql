-- CRIA USUÁRIOS + MEMBROS + PROMOVE ADMIN (executar só uma vez)
-- Limpe antes no SQL Editor: DELETE FROM auth.identities WHERE email IN ('adm.teste@biblioteca.com','aluno.teste@biblioteca.com');
-- DELETE FROM auth.users WHERE email IN ('adm.teste@biblioteca.com','aluno.teste@biblioteca.com');
-- DELETE FROM public.members WHERE email IN ('adm.teste@biblioteca.com','aluno.teste@biblioteca.com');

DO $$
DECLARE
  v_admin_id uuid;
  v_aluno_id uuid;
  v_max_code text;
BEGIN
  v_admin_id := gen_random_uuid();
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token)
  VALUES ('00000000-0000-0000-0000-000000000000', v_admin_id, 'authenticated', 'authenticated', 'adm.teste@biblioteca.com', crypt('A9#kZ2!mX8@p', gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"email_verified":true}', '{}', now(), now(), '');
  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), v_admin_id, jsonb_build_object('sub', v_admin_id::text, 'email', 'adm.teste@biblioteca.com'), 'email', 'adm.teste@biblioteca.com', now(), now(), now());

  SELECT COALESCE(max(code), 'F-00000') INTO v_max_code FROM public.members WHERE code LIKE 'F-%';
  INSERT INTO public.members (code, registration, full_name, email, phone, member_role)
  VALUES ('F-' || lpad((substring(v_max_code, 3)::int + 1)::text, 5, '0'), 'ADM001', 'Admin Teste', 'adm.teste@biblioteca.com', '(11) 99999-9999', 'Bibliotecário');

  v_aluno_id := gen_random_uuid();
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token)
  VALUES ('00000000-0000-0000-0000-000000000000', v_aluno_id, 'authenticated', 'authenticated', 'aluno.teste@biblioteca.com', crypt('Aluno@2024!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"email_verified":true}', '{}', now(), now(), '');
  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), v_aluno_id, jsonb_build_object('sub', v_aluno_id::text, 'email', 'aluno.teste@biblioteca.com'), 'email', 'aluno.teste@biblioteca.com', now(), now(), now());

  SELECT COALESCE(max(code), 'A-00000') INTO v_max_code FROM public.members WHERE code LIKE 'A-%';
  INSERT INTO public.members (code, registration, full_name, email, phone, member_role, course, grade)
  VALUES ('A-' || lpad((substring(v_max_code, 3)::int + 1)::text, 5, '0'), 'TEST001', 'Aluno Teste', 'aluno.teste@biblioteca.com', '(11) 98888-8888', 'Aluno', 'Ensino Médio', '1º Ano A');

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_admin_id, 'admin'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;
