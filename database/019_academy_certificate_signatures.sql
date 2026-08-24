ALTER TABLE universe.academy_courses
  ADD COLUMN IF NOT EXISTS certificate_signature_image bytea,
  ADD COLUMN IF NOT EXISTS certificate_signature_mime text,
  ADD COLUMN IF NOT EXISTS certificate_signature_file_name text;

ALTER TABLE universe.academy_certificates
  ADD COLUMN IF NOT EXISTS signature_image bytea,
  ADD COLUMN IF NOT EXISTS signature_image_mime text;

DO $$ BEGIN
  ALTER TABLE universe.academy_courses
    ADD CONSTRAINT academy_courses_certificate_signature_mime_check
    CHECK (
      (certificate_signature_image IS NULL AND certificate_signature_mime IS NULL)
      OR
      (certificate_signature_image IS NOT NULL AND certificate_signature_mime IN ('image/png', 'image/jpeg'))
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE universe.academy_certificates
    ADD CONSTRAINT academy_certificates_signature_image_mime_check
    CHECK (
      (signature_image IS NULL AND signature_image_mime IS NULL)
      OR
      (signature_image IS NOT NULL AND signature_image_mime IN ('image/png', 'image/jpeg'))
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
