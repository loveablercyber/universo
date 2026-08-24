CREATE INDEX IF NOT EXISTS academy_enrollments_status_enrolled_idx
  ON universe.academy_enrollments(status, enrolled_at DESC);

CREATE INDEX IF NOT EXISTS academy_progress_enrollment_completed_idx
  ON universe.academy_student_progress(enrollment_id, completed_at DESC)
  WHERE completed = true;

CREATE INDEX IF NOT EXISTS audit_logs_entity_created_idx
  ON universe.audit_logs(entity_type, created_at DESC);
