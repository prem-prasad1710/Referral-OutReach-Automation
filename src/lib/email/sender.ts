import fs from "fs/promises";
import path from "path";
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { MAX_SEND_RETRIES, RETRY_BASE_DELAY_MS, RESUME_ATTACHMENT_FILENAME } from "@/lib/constants";
import { getSmtpCredentials } from "@/lib/email/smtp-config";
import type { SendEmailOptions, SendEmailResult } from "@/types";

let transporterCache: Transporter | null = null;
let transporterKey: string | null = null;

async function getTransporter(): Promise<Transporter> {
  const creds = await getSmtpCredentials();
  const key = `${creds.host}:${creds.port}:${creds.user}`;
  if (transporterCache && transporterKey === key) {
    return transporterCache;
  }

  transporterCache = nodemailer.createTransport({
    host: creds.host,
    port: creds.port,
    secure: creds.secure,
    auth: {
      user: creds.user,
      pass: creds.password,
    },
  });
  transporterKey = key;
  return transporterCache;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function buildAttachments(pdfPath?: string) {
  if (!pdfPath) return undefined;
  const resolved = path.resolve(pdfPath);
  await fs.access(resolved);
  return [
    {
      filename: RESUME_ATTACHMENT_FILENAME,
      path: resolved,
      contentType: "application/pdf",
    },
  ];
}

export async function sendEmail(
  options: SendEmailOptions,
): Promise<SendEmailResult> {
  const transporter = await getTransporter();
  const creds = await getSmtpCredentials();
  const attachments = await buildAttachments(options.pdfPath);

  let lastError: string | undefined;

  for (let attempt = 1; attempt <= MAX_SEND_RETRIES; attempt++) {
    try {
      const info = await transporter.sendMail({
        from: creds.fromName
          ? `"${creds.fromName}" <${creds.fromEmail}>`
          : creds.fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments,
      });

      return {
        success: true,
        messageId: info.messageId,
        attempts: attempt,
      };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      if (attempt < MAX_SEND_RETRIES) {
        await sleep(RETRY_BASE_DELAY_MS * attempt);
      }
    }
  }

  return {
    success: false,
    error: lastError ?? "Unknown send error",
    attempts: MAX_SEND_RETRIES,
  };
}

export function resetTransporterCache(): void {
  transporterCache = null;
  transporterKey = null;
}
