ALTER TABLE universe.academy_courses
  ADD COLUMN IF NOT EXISTS certificate_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS completion_percentage int NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS certificate_signatory text NOT NULL DEFAULT 'Carol Sol',
  ADD COLUMN IF NOT EXISTS certificate_signatory_role text NOT NULL DEFAULT 'Diretora da Invisible Academy';

DO $$ BEGIN
  ALTER TABLE universe.academy_courses
    ADD CONSTRAINT academy_courses_completion_percentage_check CHECK (completion_percentage BETWEEN 1 AND 100);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS universe.academy_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL UNIQUE REFERENCES universe.academy_enrollments(id) ON DELETE RESTRICT,
  verification_code text NOT NULL UNIQUE,
  certificate_number text NOT NULL UNIQUE,
  student_name text NOT NULL,
  course_title text NOT NULL,
  workload_hours int NOT NULL,
  completion_percentage int NOT NULL,
  signatory_name text NOT NULL,
  signatory_role text NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  issued_by uuid REFERENCES universe.users(id) ON DELETE SET NULL,
  revoked_at timestamptz,
  revoked_by uuid REFERENCES universe.users(id) ON DELETE SET NULL,
  revocation_reason text,
  revocation_kind text CHECK (revocation_kind IN ('progress', 'manual')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS academy_certificates_issued_at_idx
  ON universe.academy_certificates(issued_at DESC);
CREATE INDEX IF NOT EXISTS academy_certificates_active_idx
  ON universe.academy_certificates(enrollment_id) WHERE revoked_at IS NULL;
