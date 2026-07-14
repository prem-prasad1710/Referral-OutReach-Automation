export type ContactStatus = "pending" | "sent" | "failed" | "skipped";

export type CampaignStatusType =
  | "draft"
  | "preview"
  | "scheduled"
  | "running"
  | "paused"
  | "completed"
  | "failed";

export type SmtpPresetId = "gmail" | "outlook";

export interface SmtpPreset {
  id: SmtpPresetId;
  label: string;
  host: string;
  port: number;
  secure: boolean;
}

export interface SmtpCredentials {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  fromEmail: string;
  fromName?: string;
}

export interface ParsedContactRow {
  name: string;
  email: string;
  company: string;
  designation: string;
  linkedinUrl?: string;
}

export interface ParseContactsResult {
  contacts: ParsedContactRow[];
  duplicates: ParsedContactRow[];
  invalidRows: { row: number; reason: string }[];
  totalRows: number;
}

export interface TemplateContext {
  name: string;
  company: string;
  designation: string;
  ai_intro: string;
  email: string;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  pdfPath?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  attempts: number;
}

export interface CampaignStatus {
  total: number;
  sent: number;
  failed: number;
  pending: number;
  successRate: number;
  status: string;
}

export interface AnalyticsData {
  totalContacts: number;
  totalSent: number;
  totalFailed: number;
  successRate: number;
  recentCampaigns: {
    id: string;
    name: string;
    status: string;
    createdAt: string;
    sent: number;
    failed: number;
    total: number;
  }[];
}
