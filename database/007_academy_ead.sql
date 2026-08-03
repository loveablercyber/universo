-- 007_academy_ead.sql
-- Estrutura para plataforma EAD Invisible Academy

-- 1. Cursos
CREATE TABLE IF NOT EXISTS universe.academy_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  subtitle text,
  description text NOT NULL,
  price numeric(12,2) NOT NULL CHECK (price >= 0),
  promotional_price numeric(12,2) CHECK (promotional_price >= 0),
  image_url text NOT NULL,
  badge text DEFAULT 'EXCLUSIVO',
  level text NOT NULL DEFAULT 'Iniciante',
  workload_hours int NOT NULL DEFAULT 10,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Módulos do Curso
CREATE TABLE IF NOT EXISTS universe.academy_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES universe.academy_courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Aulas
CREATE TABLE IF NOT EXISTS universe.academy_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES universe.academy_modules(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  video_url text NOT NULL,
  duration_minutes int NOT NULL DEFAULT 10,
  sort_order int NOT NULL DEFAULT 0,
  is_preview boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Matrículas dos Alunos
CREATE TABLE IF NOT EXISTS universe.academy_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES universe.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES universe.academy_courses(id) ON DELETE CASCADE,
  student_name text NOT NULL,
  student_email text NOT NULL,
  student_phone text,
  sumup_checkout_id text UNIQUE,
  amount_paid numeric(12,2) NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'cancelled', 'completed')),
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- 5. Progresso de Aulas do Aluno
CREATE TABLE IF NOT EXISTS universe.academy_student_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES universe.academy_enrollments(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES universe.academy_lessons(id) ON DELETE CASCADE,
  completed boolean NOT NULL DEFAULT true,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(enrollment_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS universe_academy_courses_status_idx ON universe.academy_courses(status);
CREATE INDEX IF NOT EXISTS universe_academy_modules_course_idx ON universe.academy_modules(course_id, sort_order ASC);
CREATE INDEX IF NOT EXISTS universe_academy_lessons_module_idx ON universe.academy_lessons(module_id, sort_order ASC);
CREATE INDEX IF NOT EXISTS universe_academy_enrollments_email_idx ON universe.academy_enrollments(student_email);

-- Seed de Cursos Iniciais
INSERT INTO universe.academy_courses (slug, title, subtitle, description, price, promotional_price, image_url, badge, level, workload_hours)
VALUES
  ('mega-hair-metodos-classicos', 'MEGA HAIR', 'MÉTODOS CLÁSSICOS', 'Aprenda as técnicas mais utilizadas no mercado com excelência, acabamento invisível e durabilidade.', 497.00, 297.00, '/images/curso-metodos-classicos.jpg', 'MAIS PROCURADO', 'Iniciante', 20),
  ('mega-hair-fita-invisible', 'MEGA HAIR', 'FITA INVISIBLE', 'Técnica exclusiva de fita imperceptível para resultados ultra-naturais e clientes exigentes.', 697.00, 397.00, '/images/curso-fita-invisible.jpg', 'EXCLUSIVO', 'Intermediário', 15),
  ('mega-hair-micro-link', 'MEGA HAIR', 'MICRO LINK', 'Domine a técnica de micro link, divisão perfeita e manutenção sem danos.', 597.00, 347.00, '/images/curso-micro-link.jpg', 'AVANÇADO', 'Avançado', 15),
  ('colorimetria-para-mega-hair', 'COLORIMETRIA', 'PARA MEGA HAIR', 'Aprenda a colorir, personalizar e igualar tons com harmonia e segurança profissional.', 397.00, 197.00, '/images/curso-colorimetria.jpg', 'TENDÊNCIA', 'Intermediário', 10),
  ('gestao-e-marketing-mega-hair', 'GESTÃO E MARKETING', 'PARA MEGA HAIR', 'Estratégias para posicionamento, atração de clientes e lotar sua agenda com tickets altos.', 297.00, 147.00, '/images/curso-gestao-marketing.jpg', 'BÔNUS', 'Todos os níveis', 8)
ON CONFLICT (slug) DO NOTHING;
