import { query } from "@/lib/db.server";

export type NotificationChannel = "email" | "whatsapp";

export type DispatchParams = {
  channel: NotificationChannel;
  recipient: string;
  subject?: string;
  templateName: string;
  payload: Record<string, unknown>;
};

/**
 * Dispatch notification via configured driver (Resend/WhatsApp/Log) and persist in database log.
 */
export async function dispatchNotification({
  channel,
  recipient,
  subject,
  templateName,
  payload,
}: DispatchParams): Promise<{ ok: boolean; id?: string; error?: string }> {
  let status: "sent" | "failed" = "sent";
  let errorMessage: string | null = null;

  try {
    if (channel === "email") {
      const emailDriver = process.env.EMAIL_DRIVER || "log";
      const resendApiKey = process.env.RESEND_API_KEY;

      if (emailDriver === "resend" && resendApiKey) {
        const from = process.env.EMAIL_FROM || "notificacoes@carolsol.com.br";
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from,
            to: recipient,
            subject: subject || "Notificação – Universo Carol Sol",
            html: generateEmailHtml(templateName, payload),
          }),
        });

        if (!response.ok) {
          const text = await response.text();
          status = "failed";
          errorMessage = `Resend HTTP ${response.status}: ${text}`;
        }
      } else {
        /* Log Driver (Development / Test) */
        console.log(
          `[Notification Engine] EMAIL -> ${recipient} | Subject: ${subject} | Template: ${templateName}`,
        );
      }
    } else if (channel === "whatsapp") {
      const waDriver = process.env.WHATSAPP_DRIVER || "log";
      const waApiUrl = process.env.WHATSAPP_API_URL;
      const waApiKey = process.env.WHATSAPP_API_KEY;

      if (waDriver !== "log" && waApiUrl) {
        const response = await fetch(`${waApiUrl}/message/sendText`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(waApiKey ? { apikey: waApiKey } : {}),
          },
          body: JSON.stringify({
            number: recipient.replace(/\D/g, ""),
            text: generateWhatsAppText(templateName, payload),
          }),
        });

        if (!response.ok) {
          const text = await response.text();
          status = "failed";
          errorMessage = `WhatsApp HTTP ${response.status}: ${text}`;
        }
      } else {
        /* Log Driver (Development / Test) */
        console.log(`[Notification Engine] WHATSAPP -> ${recipient} | Template: ${templateName}`);
      }
    }
  } catch (err) {
    status = "failed";
    errorMessage = err instanceof Error ? err.message : "Erro desconhecido ao enviar notificação.";
  }

  /* Log to database */
  try {
    const { rows } = await query<{ id: string }>(
      `INSERT INTO universe.notifications_log
         (channel, recipient, subject, template_name, status, payload, error_message)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
       RETURNING id`,
      [
        channel,
        recipient,
        subject ?? null,
        templateName,
        status,
        JSON.stringify(payload),
        errorMessage,
      ],
    );
    return { ok: status === "sent", id: rows[0]?.id, error: errorMessage ?? undefined };
  } catch (dbErr) {
    console.error("[Notification DB Log Error]", dbErr);
    return { ok: status === "sent", error: errorMessage ?? undefined };
  }
}

/* Helper templates generators */
function generateEmailHtml(template: string, payload: Record<string, unknown>): string {
  const brandHeader = `<div style="font-family: serif; font-size: 24px; color: #C97945; text-align: center; padding: 20px;">UNIVERSO CAROL SOL</div>`;

  if (template === "elo_donation_receipt") {
    return `${brandHeader}
      <h2>Obrigado por apoiar o Projeto Elo!</h2>
      <p>Olá, <strong>${payload.donorName || "Doador(a)"}</strong>!</p>
      <p>Sua doação no valor de <strong>R$ ${Number(payload.amount).toFixed(2)}</strong> foi recebida com sucesso.</p>
      <p>Sua contribuição ajuda a devolver a auto-estima e o acolhimento a quem mais precisa.</p>`;
  }

  if (template === "store_order_confirmed") {
    return `${brandHeader}
      <h2>Seu pedido foi confirmado!</h2>
      <p>Olá, <strong>${payload.customerName}</strong>!</p>
      <p>Seu pedido <strong>#${payload.orderNumber}</strong> no valor de <strong>R$ ${Number(payload.totalAmount).toFixed(2)}</strong> já está em preparação.</p>
      <p>Você pode acompanhar o status do seu pedido a qualquer momento em nosso site.</p>`;
  }

  if (template === "store_history_access") {
    return `${brandHeader}
      <h2>Acesse seus pedidos</h2>
      <p>Recebemos uma solicitação para consultar seu histórico na Sol Hair Closet.</p>
      <p><a href="${payload.historyUrl}" style="display: inline-block; background: #C97945; color: white; padding: 12px 24px; text-decoration: none; border-radius: 20px;">VER MEUS PEDIDOS</a></p>
      <p>Este link é de uso único e expira em 15 minutos. Se você não fez a solicitação, ignore este e-mail.</p>`;
  }

  if (template === "store_order_shipped") {
    return `${brandHeader}
      <h2>Seu pedido foi enviado!</h2>
      <p>Seu pedido <strong>#${payload.orderNumber}</strong> está a caminho.</p>
      <p>Código de rastreamento: <strong style="font-family: monospace; background: #eee; padding: 4px 8px;">${payload.trackingCode}</strong></p>`;
  }

  if (template === "academy_enrollment_welcome") {
    return `${brandHeader}
      <h2>Bem-vinda ao curso ${payload.courseTitle}!</h2>
      <p>Olá, <strong>${payload.studentName}</strong>!</p>
      <p>Sua matrícula na <strong>Invisible Academy</strong> foi realizada com sucesso.</p>
      <p><a href="https://carolsol.com.br/invisible-academy/aluno" style="display: inline-block; background: #C97945; color: white; padding: 12px 24px; text-decoration: none; border-radius: 20px;">ACESSAR SALA DE AULA</a></p>`;
  }

  if (template === "password_reset") {
    return `${brandHeader}<h2>Redefinição de senha</h2><p>Olá, <strong>${payload.fullName || ""}</strong>.</p><p>Recebemos uma solicitação para redefinir sua senha. O link é válido por 30 minutos.</p><p><a href="${payload.resetUrl}" style="display:inline-block;background:#C97945;color:white;padding:12px 24px;text-decoration:none;border-radius:20px;">CRIAR NOVA SENHA</a></p><p>Se você não fez esta solicitação, ignore este e-mail.</p>`;
  }

  return `${brandHeader}<p>${JSON.stringify(payload)}</p>`;
}

function generateWhatsAppText(template: string, payload: Record<string, unknown>): string {
  if (template === "elo_donation_receipt") {
    return `✦ *UNIVERSO CAROL SOL – PROJETO ELO*\n\nOlá ${payload.donorName || "Doador(a)"}! Muito obrigado por sua doação de R$ ${Number(payload.amount).toFixed(2)}. Seu gesto transforma vidas! ❤️`;
  }

  if (template === "store_order_confirmed") {
    return `✦ *SOL HAIR CLOSET*\n\nOlá ${payload.customerName}! Seu pedido *#${payload.orderNumber}* no valor de R$ ${Number(payload.totalAmount).toFixed(2)} foi confirmado e já está em separação! 🛍️`;
  }

  if (template === "store_order_shipped") {
    return `✦ *SOL HAIR CLOSET*\n\nSeu pedido *#${payload.orderNumber}* foi enviado! 🚚\nCódigo de Rastreio: *${payload.trackingCode}*`;
  }

  if (template === "academy_enrollment_welcome") {
    return `✦ *INVISIBLE ACADEMY*\n\nOlá ${payload.studentName}! Sua matrícula no curso *${payload.courseTitle}* está ativa! 🎓\nAcesse suas aulas em: https://carolsol.com.br/invisible-academy/aluno`;
  }

  return `UNIVERSO CAROL SOL: Notificação transacional.`;
}

/* Shortcuts */
export async function sendEloDonationNotification(
  donorName?: string,
  donorEmail?: string,
  amount?: number,
) {
  if (donorEmail) {
    await dispatchNotification({
      channel: "email",
      recipient: donorEmail,
      subject: "Recibo de Doação | Projeto Elo – Universo Carol Sol",
      templateName: "elo_donation_receipt",
      payload: { donorName, amount },
    });
  }
}

export async function sendStoreOrderNotification(
  orderNumber: string,
  customerName: string,
  customerEmail: string,
  customerPhone: string,
  totalAmount: number,
) {
  await dispatchNotification({
    channel: "email",
    recipient: customerEmail,
    subject: `Pedido #${orderNumber} Confirmado | Sol Hair Closet`,
    templateName: "store_order_confirmed",
    payload: { orderNumber, customerName, totalAmount },
  });

  if (customerPhone) {
    await dispatchNotification({
      channel: "whatsapp",
      recipient: customerPhone,
      templateName: "store_order_confirmed",
      payload: { orderNumber, customerName, totalAmount },
    });
  }
}

export async function sendStoreShippingNotification(
  orderNumber: string,
  customerEmail: string,
  trackingCode: string,
) {
  await dispatchNotification({
    channel: "email",
    recipient: customerEmail,
    subject: `Pedido #${orderNumber} Enviado | Sol Hair Closet`,
    templateName: "store_order_shipped",
    payload: { orderNumber, trackingCode },
  });
}

export async function sendAcademyEnrollmentNotification(
  studentName: string,
  studentEmail: string,
  studentPhone?: string,
  courseTitle?: string,
) {
  await dispatchNotification({
    channel: "email",
    recipient: studentEmail,
    subject: `Matrícula Confirmada | ${courseTitle || "Invisible Academy"}`,
    templateName: "academy_enrollment_welcome",
    payload: { studentName, studentEmail, courseTitle },
  });

  if (studentPhone) {
    await dispatchNotification({
      channel: "whatsapp",
      recipient: studentPhone,
      templateName: "academy_enrollment_welcome",
      payload: { studentName, studentEmail, courseTitle },
    });
  }
}
