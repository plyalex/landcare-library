import nodemailer, { type Transporter } from "nodemailer";
import { APP_NAME, GROUP_NAME, siteUrl } from "./config";

let transport: Transporter | null = null;

function getTransport(): Transporter | null {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  if (!transport) {
    const port = Number(process.env.SMTP_PORT ?? 465);
    transport = nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return transport;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

function toHtml(text: string): string {
  const body = text
    .split(/\n{2,}/)
    .map((para) => {
      const html = escapeHtml(para)
        .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#244536">$1</a>')
        .replace(/\n/g, "<br>");
      return `<p style="margin:0 0 14px">${html}</p>`;
    })
    .join("");
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#1e2b24;max-width:560px">
${body}
<p style="margin:24px 0 0;font-size:13px;color:#5f665f">${escapeHtml(APP_NAME)} for ${escapeHtml(GROUP_NAME)} members. ${escapeHtml(siteUrl())}</p>
</div>`;
}

export async function sendEmail(opts: { to: string; subject: string; text: string }): Promise<boolean> {
  const t = getTransport();
  if (!t) {
    console.warn(`[email not configured] ${opts.subject} -> ${opts.to}`);
    return false;
  }
  const from = process.env.EMAIL_FROM || `${APP_NAME} <${process.env.SMTP_USER}>`;
  await t.sendMail({
    from,
    to: opts.to,
    subject: opts.subject,
    text: `${opts.text}\n\n--\n${APP_NAME} for ${GROUP_NAME} members. ${siteUrl()}`,
    html: toHtml(opts.text),
  });
  return true;
}
