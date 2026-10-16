import nodemailer from "nodemailer";

import AppError from "../utils/AppError.js";

// ==========================================================
// Generic SMTP mailer.
//
// Works with Gmail, Outlook/Office365, Zoho, or the SMTP relay
// of any transactional provider (SendGrid, Mailgun, Resend,
// Amazon SES, etc). Configure via environment variables — see
// backend/.env.example.
// ==========================================================

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
  } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new AppError(
      "Email is not configured on the server. Set SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASS in the backend environment.",
      500
    );
  }

  const port = Number(SMTP_PORT) || 587;

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    // 465 requires implicit TLS; 587/25 use STARTTLS.
    secure: process.env.SMTP_SECURE
      ? process.env.SMTP_SECURE === "true"
      : port === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  return transporter;
}

function toRecipientList(value) {
  if (!value) return [];
  return (Array.isArray(value) ? value : [value])
    .map((v) => (v || "").trim())
    .filter(Boolean);
}

export async function sendMail({ to, cc, subject, html, text, attachments }) {
  const toList = toRecipientList(to);
  const ccList = toRecipientList(cc);

  if (toList.length === 0) {
    throw new AppError("At least one recipient email is required.", 400);
  }

  const t = getTransporter();

  const fromName = process.env.MAIL_FROM_NAME || "Pratibimba Audit System";
  const fromEmail = process.env.MAIL_FROM_EMAIL || process.env.SMTP_USER;

  return t.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: toList.join(", "),
    cc: ccList.length ? ccList.join(", ") : undefined,
    subject,
    text,
    html,
    attachments,
  });
}

// Lets a health-check route or a startup log confirm SMTP creds
// actually work, without sending a real email.
export async function verifyEmailConfig() {
  const t = getTransporter();
  await t.verify();
  return true;
}
