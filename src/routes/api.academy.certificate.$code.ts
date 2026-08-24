import { createFileRoute } from "@tanstack/react-router";
import { query } from "@/lib/db.server";
import { createCertificatePdf } from "@/lib/certificate-pdf.server";
import type { CertificateRecord } from "@/lib/academy-certificates.server";

export const Route = createFileRoute("/api/academy/certificate/$code")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const result = await query<CertificateRecord>(
          `SELECT id,enrollment_id as "enrollmentId",verification_code as "verificationCode",
                certificate_number as "certificateNumber",student_name as "studentName",course_title as "courseTitle",
                workload_hours as "workloadHours",completion_percentage as "completionPercentage",
                signatory_name as "signatoryName",signatory_role as "signatoryRole",
                signature_image as "signatureImage",signature_image_mime as "signatureImageMime",issued_at as "issuedAt",
                revoked_at as "revokedAt",revocation_reason as "revocationReason"
           FROM universe.academy_certificates WHERE verification_code=$1`,
          [params.code.toUpperCase()],
        );
        const certificate = result.rows[0];
        if (!certificate) return new Response("Certificado não encontrado.", { status: 404 });
        if (certificate.revokedAt)
          return new Response("Este certificado foi revogado.", { status: 410 });
        const origin = new URL(request.url).origin;
        const bytes = await createCertificatePdf(certificate, origin);
        return new Response(bytes, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename="certificado-${certificate.certificateNumber}.pdf"`,
            "Cache-Control": "private, max-age=300",
          },
        });
      },
    },
  },
});
