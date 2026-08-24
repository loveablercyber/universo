import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { CertificateRecord } from "./academy-certificates.server";

function printable(value: string) {
  return value.replace(/[–—]/g, "-").replace(/[“”]/g, '"').replace(/[’]/g, "'");
}

function centeredX(
  text: string,
  size: number,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  width: number,
) {
  return (width - font.widthOfTextAtSize(text, size)) / 2;
}

function fitSize(
  text: string,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  preferred: number,
  minimum: number,
  maxWidth: number,
) {
  let size = preferred;
  while (size > minimum && font.widthOfTextAtSize(text, size) > maxWidth) size -= 1;
  return size;
}

function wrapLines(
  text: string,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  size: number,
  maxWidth: number,
) {
  const lines: string[] = [];
  let current = "";
  for (const word of text.split(/\s+/)) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && font.widthOfTextAtSize(candidate, size) > maxWidth) {
      lines.push(current);
      current = word;
    } else current = candidate;
  }
  if (current) lines.push(current);
  return lines;
}

export async function createCertificatePdf(
  certificate: CertificateRecord,
  verificationBaseUrl: string,
) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${certificate.certificateNumber} - ${certificate.studentName}`);
  pdf.setAuthor("Invisible Academy - Universo Carol Sol");
  pdf.setSubject("Certificado de conclusão de curso");
  const page = pdf.addPage([841.89, 595.28]);
  const { width, height } = page.getSize();
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const sansBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.18, 0.13, 0.11);
  const copper = rgb(0.79, 0.42, 0.23);
  const cream = rgb(0.98, 0.96, 0.92);
  const muted = rgb(0.43, 0.34, 0.3);

  page.drawRectangle({ x: 0, y: 0, width, height, color: cream });
  page.drawRectangle({
    x: 22,
    y: 22,
    width: width - 44,
    height: height - 44,
    borderColor: copper,
    borderWidth: 3,
  });
  page.drawRectangle({
    x: 31,
    y: 31,
    width: width - 62,
    height: height - 62,
    borderColor: ink,
    borderWidth: 0.7,
  });
  page.drawLine({
    start: { x: 105, y: 493 },
    end: { x: width - 105, y: 493 },
    color: copper,
    thickness: 1,
  });

  const brand = "INVISIBLE ACADEMY";
  page.drawText(brand, {
    x: centeredX(brand, 14, sansBold, width),
    y: 515,
    size: 14,
    font: sansBold,
    color: copper,
    characterSpacing: 2.2,
  });
  const title = "CERTIFICADO DE CONCLUSÃO";
  page.drawText(title, {
    x: centeredX(title, 30, serifBold, width),
    y: 445,
    size: 30,
    font: serifBold,
    color: ink,
  });
  const intro = "Certificamos que";
  page.drawText(intro, {
    x: centeredX(intro, 14, sans, width),
    y: 401,
    size: 14,
    font: sans,
    color: muted,
  });

  const student = printable(certificate.studentName.toUpperCase());
  const studentSize = fitSize(student, serifBold, 31, 20, width - 120);
  page.drawText(student, {
    x: centeredX(student, studentSize, serifBold, width),
    y: 350,
    size: studentSize,
    font: serifBold,
    color: copper,
  });
  page.drawLine({
    start: { x: 150, y: 340 },
    end: { x: width - 150, y: 340 },
    color: copper,
    thickness: 0.8,
  });

  const statement = "concluiu com aproveitamento o curso";
  page.drawText(statement, {
    x: centeredX(statement, 14, sans, width),
    y: 307,
    size: 14,
    font: sans,
    color: muted,
  });
  const course = printable(certificate.courseTitle.toUpperCase());
  let courseSize = 22;
  let courseLines = wrapLines(course, serifBold, courseSize, width - 150);
  while (courseLines.length > 2 && courseSize > 14) {
    courseSize -= 1;
    courseLines = wrapLines(course, serifBold, courseSize, width - 150);
  }
  courseLines.slice(0, 2).forEach((line, index) => {
    page.drawText(line, {
      x: centeredX(line, courseSize, serifBold, width),
      y: 278 - index * 27,
      size: courseSize,
      font: serifBold,
      color: ink,
    });
  });

  const issuedDate = new Date(certificate.issuedAt).toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });
  const details = `Carga horária: ${certificate.workloadHours} horas  |  Aproveitamento: ${certificate.completionPercentage}%  |  Emissão: ${issuedDate}`;
  page.drawText(details, {
    x: centeredX(details, 11, sans, width),
    y: 224,
    size: 11,
    font: sans,
    color: muted,
  });

  page.drawLine({
    start: { x: 285, y: 150 },
    end: { x: width - 285, y: 150 },
    color: ink,
    thickness: 0.7,
  });
  const signer = printable(certificate.signatoryName);
  page.drawText(signer, {
    x: centeredX(signer, 14, serifBold, width),
    y: 130,
    size: 14,
    font: serifBold,
    color: ink,
  });
  const role = printable(certificate.signatoryRole);
  page.drawText(role, {
    x: centeredX(role, 9, sans, width),
    y: 114,
    size: 9,
    font: sans,
    color: muted,
  });

  const verificationUrl = `${verificationBaseUrl.replace(/\/$/, "")}/invisible-academy/certificado/${certificate.verificationCode}`;
  const footer = `Certificado ${certificate.certificateNumber}  |  Autenticidade: ${verificationUrl}`;
  page.drawText(footer, {
    x: centeredX(footer, 8, sans, width),
    y: 59,
    size: 8,
    font: sans,
    color: muted,
  });
  page.drawText("UNIVERSO CAROL SOL", {
    x: centeredX("UNIVERSO CAROL SOL", 8, sansBold, width),
    y: 42,
    size: 8,
    font: sansBold,
    color: copper,
    characterSpacing: 1.5,
  });
  return pdf.save();
}
