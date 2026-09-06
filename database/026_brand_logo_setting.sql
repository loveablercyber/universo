INSERT INTO universe.settings(key, value, description, is_public)
VALUES ('brand_logo_url', '""'::jsonb, 'URL pública da logo oficial usada no cabeçalho da loja', true)
ON CONFLICT (key) DO NOTHING;
