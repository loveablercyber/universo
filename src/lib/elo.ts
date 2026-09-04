import { z } from "zod";

export const eloParticipationTypes = [
  "hair_donation",
  "beneficiary_request",
  "volunteer",
  "partner",
] as const;

export type EloParticipationType = (typeof eloParticipationTypes)[number];

export const eloParticipationLabels: Record<EloParticipationType, string> = {
  hair_donation: "Doar cabelo ou materiais",
  beneficiary_request: "Solicitar atendimento",
  volunteer: "Ser voluntário",
  partner: "Apoiar como parceiro",
};

const optionalText = (maxLength: number) =>
  z.preprocess((value) => value ?? "", z.string().trim().max(maxLength));

export const eloPublicSubmissionSchema = z
  .object({
    participationType: z.enum(eloParticipationTypes),
    fullName: z.string().trim().min(2, "Informe seu nome completo.").max(160),
    email: z.preprocess(
      (value) => value ?? "",
      z.string().trim().email("Informe um e-mail válido.").max(254).or(z.literal("")),
    ),
    phone: optionalText(40),
    city: optionalText(100),
    state: optionalText(2),
    message: z.string().trim().min(5, "Conte brevemente como podemos ajudar.").max(2000),
    availability: optionalText(500),
    lgpdAccepted: z.literal(true),
    website: optionalText(0),
  })
  .superRefine((value, context) => {
    if (!value.email && value.phone.replace(/\D/g, "").length < 10) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phone"],
        message: "Informe um telefone válido ou um e-mail.",
      });
    }
  });

export function participantKindFor(type: EloParticipationType) {
  if (type === "beneficiary_request") return "beneficiary";
  if (type === "volunteer") return "volunteer";
  if (type === "partner") return "partner";
  return "donor";
}

export function requestTitleFor(type: EloParticipationType) {
  return {
    hair_donation: "Doação de cabelo ou materiais",
    beneficiary_request: "Solicitação de atendimento",
    volunteer: "Inscrição de voluntariado",
    partner: "Proposta de parceria",
  }[type];
}

export function csvCell(value: unknown) {
  const raw = String(value ?? "");
  const protectedValue = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${protectedValue.replace(/"/g, '""')}"`;
}
