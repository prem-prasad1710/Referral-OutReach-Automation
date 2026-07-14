import type { SmtpPreset, SmtpPresetId } from "@/types";

export const DEFAULT_SUBJECT_TEMPLATE =
  "Referral Request for Software Engineer Role at {{company}}";

export const DEFAULT_BODY_TEMPLATE = `Hi {{name}},

I hope you're doing well.

{{ai_intro}}

I recently applied for the Software Engineer role at {{company}} and wanted to reach out personally.

I am currently working as a Software Engineer at Paytm, where I build scalable web applications using React.js, Next.js, TypeScript, Node.js, SQL, and modern frontend technologies.

I came across your profile and noticed your experience at {{company}} as {{designation}}. I would greatly appreciate any referral, guidance, or insights regarding the role.

I've attached my resume for your reference.

Thank you for your time and consideration.

Best regards,
Prem Prasad`;

export const SMTP_PRESETS: Record<SmtpPresetId, SmtpPreset> = {
  gmail: {
    id: "gmail",
    label: "Gmail",
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
  },
  outlook: {
    id: "outlook",
    label: "Microsoft Outlook",
    host: "smtp-mail.outlook.com",
    port: 587,
    secure: false,
  },
};

export const MAX_SEND_RETRIES = 3;
export const RETRY_BASE_DELAY_MS = 2000;
export const MAX_RESUME_SIZE = 5 * 1024 * 1024;
export const MAX_CONTACT_FILE_SIZE = 10 * 1024 * 1024;
export const MIN_DELAY_SECONDS = 30;
export const MAX_DELAY_SECONDS = 120;

/** Fixed filename recipients see on every outgoing email attachment */
export const RESUME_ATTACHMENT_FILENAME = "Prem Resume SWE.pdf";
