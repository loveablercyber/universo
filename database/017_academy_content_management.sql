ALTER TABLE universe.academy_modules
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE universe.academy_lessons
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE universe.academy_enrollments
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'online',
  ADD COLUMN IF NOT EXISTS admin_notes text,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES universe.users(id) ON DELETE SET NULL;

DO $$ BEGIN
  ALTER TABLE universe.academy_modules
    ADD CONSTRAINT academy_modules_status_check CHECK (status IN ('draft', 'published', 'archived'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE universe.academy_lessons
    ADD CONSTRAINT academy_lessons_status_check CHECK (status IN ('draft', 'published', 'archived'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE universe.academy_enrollments
    ADD CONSTRAINT academy_enrollments_source_check CHECK (source IN ('online', 'manual', 'import', 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS academy_modules_course_status_order_idx
  ON universe.academy_modules(course_id, status, sort_order);
CREATE INDEX IF NOT EXISTS academy_lessons_module_status_order_idx
  ON universe.academy_lessons(module_id, status, sort_order);
