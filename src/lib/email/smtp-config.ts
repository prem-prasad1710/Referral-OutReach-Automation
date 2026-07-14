import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { SMTP_PRESETS } from "@/lib/constants";
import type { SmtpCredentials, SmtpPresetId } from "@/types";

function credentialsFromEnv(): SmtpCredentials | null {
  const email = process.env.SMTP_EMAIL;
  const password = process.env.SMTP_APP_PASSWORD;
  if (!email || !password) return null;

  const provider = (process.env.SMTP_PROVIDER ?? "gmail") as SmtpPresetId;
  const preset = SMTP_PRESETS[provider] ?? SMTP_PRESETS.gmail;

  return {
    host: preset.host,
    port: preset.port,
    secure: preset.secure,
    user: email,
    password,
    fromEmail: email,
    fromName: process.env.SMTP_FROM_NAME ?? "Prem Prasad",
  };
}

export async function getSmtpCredentials(): Promise<SmtpCredentials> {
  const stored = await prisma.smtpSettings.findFirst({
    where: { isActive: true },
    orderBy: { updatedAt: "desc" },
  });

  if (stored) {
    const provider = stored.provider as SmtpPresetId;
    const preset = SMTP_PRESETS[provider] ?? SMTP_PRESETS.gmail;
    return {
      host: preset.host,
      port: preset.port,
      secure: preset.secure,
      user: stored.email,
      password: decrypt(stored.encryptedPass),
      fromEmail: stored.email,
      fromName: stored.fromName,
    };
  }

  const fromEnv = credentialsFromEnv();
  if (fromEnv) return fromEnv;

  throw new Error(
    "SMTP is not configured. Save Gmail or Outlook credentials in Settings, or set SMTP_EMAIL and SMTP_APP_PASSWORD in .env",
  );
}
