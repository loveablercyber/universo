-- 010_academy_students_security.sql
-- Consolida alunas em usuários autenticáveis e reforça vínculos de matrícula.

create index if not exists universe_academy_enrollments_user_idx
  on universe.academy_enrollments(user_id, enrolled_at desc);

create unique index if not exists universe_academy_enrollment_user_course_uidx
  on universe.academy_enrollments(user_id, course_id)
  where user_id is not null and status <> 'cancelled';

alter table universe.academy_enrollments
  add column if not exists payment_confirmed_at timestamptz;

update universe.academy_enrollments
   set payment_confirmed_at = coalesce(payment_confirmed_at, enrolled_at)
 where status in ('active', 'completed') and payment_confirmed_at is null;
