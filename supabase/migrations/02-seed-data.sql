-- ============================================================
-- SEED DATA: publishers, categories, members, books
-- ============================================================

-- Editoras
INSERT INTO public.publishers (code, name) VALUES
  ('ED-MOD', 'Moderna'),
  ('ED-ATT', 'Ática'),
  ('ED-SAR', 'Saraiva'),
  ('ED-FTD', 'FTD Educação'),
  ('ED-COMP', 'Companhia das Letras')
ON CONFLICT (code) DO NOTHING;

-- Categorias
INSERT INTO public.categories (name) VALUES
  ('Literatura Brasileira'),
  ('Literatura Estrangeira'),
  ('Didático'),
  ('Infantojuvenil'),
  ('Ciências')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- MEMBROS (10 alunos + 2 funcionários)
-- ============================================================
INSERT INTO public.members (code, registration, full_name, email, phone, member_role, course, grade) VALUES
  ('A-00001', '2024001', 'Ana Beatriz Silva', 'ana.silva@escola.com', '(11) 99901-0001', 'Aluno', 'Ensino Médio', '1º Ano A'),
  ('A-00002', '2024002', 'Bruno Oliveira Costa', 'bruno.costa@escola.com', '(11) 99901-0002', 'Aluno', 'Ensino Médio', '1º Ano A'),
  ('A-00003', '2024003', 'Carla Souza Santos', 'carla.santos@escola.com', '(11) 99901-0003', 'Aluno', 'Ensino Médio', '1º Ano B'),
  ('A-00004', '2024004', 'Daniel Pereira Lima', 'daniel.lima@escola.com', '(11) 99901-0004', 'Aluno', 'Ensino Médio', '1º Ano B'),
  ('A-00005', '2024005', 'Eduarda Almeida Rocha', 'eduarda.rocha@escola.com', '(11) 99901-0005', 'Aluno', 'Ensino Médio', '2º Ano A'),
  ('A-00006', '2024006', 'Felipe Martins Teixeira', 'felipe.teixeira@escola.com', '(11) 99901-0006', 'Aluno', 'Ensino Médio', '2º Ano A'),
  ('A-00007', '2024007', 'Gabriela Nunes Dias', 'gabriela.dias@escola.com', '(11) 99901-0007', 'Aluno', 'Ensino Fundamental', '9º Ano'),
  ('A-00008', '2024008', 'Henrique Barbosa Lopes', 'henrique.lopes@escola.com', '(11) 99901-0008', 'Aluno', 'Ensino Fundamental', '8º Ano'),
  ('A-00009', '2024009', 'Isabela Campos Ribeiro', 'isabela.ribeiro@escola.com', '(11) 99901-0009', 'Aluno', 'Ensino Fundamental', '8º Ano'),
  ('A-00010', '2024010', 'João Vitor Moreira', 'joao.moreira@escola.com', '(11) 99901-0010', 'Aluno', 'Ensino Fundamental', '9º Ano')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.members (code, registration, full_name, email, phone, member_role) VALUES
  ('F-00001', 'FUN001', 'Maria Aparecida Oliveira', 'maria.oliveira@escola.com', '(11) 99902-0001', 'Bibliotecário'),
  ('F-00002', 'FUN002', 'Carlos Eduardo Souza', 'carlos.souza@escola.com', '(11) 99902-0002', 'Professor')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- LIVROS (15)
-- ============================================================
DO $$
DECLARE
  pub_moderna    uuid; pub_atica uuid; pub_saraiva uuid; pub_ftd uuid; pub_cia uuid;
  cat_lit_br     uuid; cat_lit_es uuid; cat_did uuid; cat_infantil uuid; cat_ciencias uuid;
BEGIN
  SELECT id INTO pub_moderna FROM public.publishers WHERE code = 'ED-MOD';
  SELECT id INTO pub_atica   FROM public.publishers WHERE code = 'ED-ATT';
  SELECT id INTO pub_saraiva FROM public.publishers WHERE code = 'ED-SAR';
  SELECT id INTO pub_ftd     FROM public.publishers WHERE code = 'ED-FTD';
  SELECT id INTO pub_cia     FROM public.publishers WHERE code = 'ED-COMP';

  SELECT id INTO cat_lit_br  FROM public.categories WHERE name = 'Literatura Brasileira';
  SELECT id INTO cat_lit_es  FROM public.categories WHERE name = 'Literatura Estrangeira';
  SELECT id INTO cat_did     FROM public.categories WHERE name = 'Didático';
  SELECT id INTO cat_infantil FROM public.categories WHERE name = 'Infantojuvenil';
  SELECT id INTO cat_ciencias FROM public.categories WHERE name = 'Ciências';

  INSERT INTO public.books (code, title, author, publisher_id, category_id, publication_year, isbn, total_quantity, cover_url) VALUES
    ('LIV-001', 'Dom Casmurro',              'Machado de Assis',           pub_cia, cat_lit_br,  1899, '9788535902778', 5, 'https://covers.openlibrary.org/b/isbn/9788535902778-L.jpg'),
    ('LIV-002', 'O Pequeno Príncipe',         'Antoine de Saint-Exupéry',  pub_ftd, cat_lit_es,  1943, '9788595081512', 4, 'https://covers.openlibrary.org/b/isbn/9788595081512-L.jpg'),
    ('LIV-003', '1984',                       'George Orwell',              pub_cia, cat_lit_es,  1949, '9788535914849', 3, 'https://covers.openlibrary.org/b/isbn/9788535914849-L.jpg'),
    ('LIV-004', 'Matemática — Ens. Médio V.1','Gelson Iezzi',               pub_atica, cat_did,  2020, '9788508117637', 10, NULL),
    ('LIV-005', 'Grande Sertão: Veredas',     'Guimarães Rosa',             pub_cia, cat_lit_br,  1956, '9788535905717', 2, 'https://covers.openlibrary.org/b/isbn/9788535905717-L.jpg'),
    ('LIV-006', 'O Hobbit',                   'J.R.R. Tolkien',             pub_saraiva, cat_infantil, 1937, '9788595084742', 4, 'https://covers.openlibrary.org/b/isbn/9788595084742-L.jpg'),
    ('LIV-007', 'Física — Ens. Médio V.1',    'Alberto Gaspar',             pub_atica, cat_ciencias, 2021, '9788508117644', 8, NULL),
    ('LIV-008', 'A Moreninha',                'Joaquim Manuel de Macedo',   pub_atica, cat_lit_br,  1844, '9788535901115', 3, 'https://covers.openlibrary.org/b/isbn/9788535901115-L.jpg'),
    ('LIV-009', 'Harry Potter e a Pedra Filosofal', 'J.K. Rowling',         pub_moderna, cat_infantil, 1997, '9788532511010', 6, 'https://covers.openlibrary.org/b/isbn/9788532511010-L.jpg'),
    ('LIV-010', 'Biologia Vol. Único',        'César da Silva Junior',      pub_saraiva, cat_ciencias, 2022, '9788508117651', 7, NULL),
    ('LIV-011', 'Vidas Secas',                'Graciliano Ramos',           pub_saraiva, cat_lit_br,  1938, '9788535924282', 3, 'https://covers.openlibrary.org/b/isbn/9788535924282-L.jpg'),
    ('LIV-012', 'Química — Ens. Médio V.U.',  'Ricardo Feltre',             pub_moderna, cat_ciencias, 2021, '9788508117668', 6, NULL),
    ('LIV-013', 'O Alienista',                'Machado de Assis',           pub_cia, cat_lit_br,  1882, '9788535904833', 2, 'https://covers.openlibrary.org/b/isbn/9788535904833-L.jpg'),
    ('LIV-014', 'História — Ens. Médio V.1',  'Cláudio Vicentino',          pub_atica, cat_did,  2020, '9788508117675', 9, NULL),
    ('LIV-015', 'A Revolução dos Bichos',     'George Orwell',              pub_cia, cat_lit_es,  1945, '9788535909555', 4, 'https://covers.openlibrary.org/b/isbn/9788535909555-L.jpg')
  ON CONFLICT (code) DO NOTHING;
END $$;
