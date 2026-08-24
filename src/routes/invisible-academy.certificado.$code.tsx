import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Award, CheckCircle2, Download, XCircle } from "lucide-react";
import { UniverseSwitcher } from "@/components/UniverseSwitcher";

export const Route = createFileRoute("/invisible-academy/certificado/$code")({
  head: () => ({ meta: [{ title: "Verificar certificado | Invisible Academy" }] }),
  component: CertificateVerificationPage,
});

type Verification = {
  valid: boolean;
  certificate?: {
    certificateNumber: string;
    studentName: string;
    courseTitle: string;
    workloadHours: number;
    completionPercentage: number;
    issuedAt: string;
    revokedAt?: string | null;
    revocationReason?: string | null;
  };
  message?: string;
};

function CertificateVerificationPage() {
  const { code } = Route.useParams();
  const [result, setResult] = useState<Verification | null>(null);
  useEffect(() => {
    fetch(`/api/academy?action=verify_certificate&code=${encodeURIComponent(code)}`)
      .then(async (response) => {
        const payload = await response.json();
        setResult(payload);
      })
      .catch(() =>
        setResult({ valid: false, message: "Não foi possível verificar o certificado." }),
      );
  }, [code]);

  return (
    <main className="min-h-screen bg-[#0F0D0C] text-[#FBF6F1]">
      <UniverseSwitcher />
      <div className="mx-auto flex min-h-[90vh] max-w-3xl items-center px-5 py-16">
        <section className="w-full rounded-[2rem] border border-[#C97945]/30 bg-[#171412] p-8 text-center shadow-2xl sm:p-12">
          <Award className="mx-auto text-[#C97945]" size={56} strokeWidth={1.3} />
          <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.3em] text-[#C97945]">
            Invisible Academy
          </p>
          {!result ? (
            <p className="mt-6 text-sm text-[#9C8174]">Verificando autenticidade...</p>
          ) : result.valid && result.certificate ? (
            <div className="mt-6 space-y-5">
              <CheckCircle2 className="mx-auto text-emerald-400" size={40} />
              <h1 className="font-serif text-3xl font-bold text-white">Certificado válido</h1>
              <p className="text-sm leading-relaxed text-[#9C8174]">
                Certificamos que{" "}
                <strong className="text-white">{result.certificate.studentName}</strong> concluiu o
                curso <strong className="text-white">{result.certificate.courseTitle}</strong>.
              </p>
              <dl className="mx-auto grid max-w-xl gap-3 rounded-2xl border border-[#C97945]/15 bg-[#0F0D0C]/60 p-5 text-left text-xs sm:grid-cols-2">
                <Info label="Número" value={result.certificate.certificateNumber} />
                <Info label="Carga horária" value={`${result.certificate.workloadHours} horas`} />
                <Info
                  label="Aproveitamento"
                  value={`${result.certificate.completionPercentage}%`}
                />
                <Info
                  label="Emissão"
                  value={new Date(result.certificate.issuedAt).toLocaleDateString("pt-BR")}
                />
              </dl>
              <a
                href={`/api/academy/certificate/${code}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-[#C97945] px-6 py-3 text-xs font-bold text-white"
              >
                <Download size={16} /> BAIXAR CERTIFICADO PDF
              </a>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <XCircle className="mx-auto text-red-400" size={40} />
              <h1 className="font-serif text-3xl font-bold text-white">Certificado inválido</h1>
              <p className="text-sm text-[#9C8174]">
                {result.certificate?.revocationReason ||
                  result.message ||
                  "O código informado não foi encontrado."}
              </p>
            </div>
          )}
          <div className="mt-8 border-t border-[#C97945]/15 pt-5">
            <p className="break-all font-mono text-[10px] text-[#6F5A50]">Código: {code}</p>
            <Link
              to="/invisible-academy"
              className="mt-4 inline-block text-xs font-semibold text-[#C97945]"
            >
              Voltar à Academy
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="uppercase tracking-wider text-[#6F5A50]">{label}</dt>
      <dd className="mt-1 font-semibold text-white">{value}</dd>
    </div>
  );
}
