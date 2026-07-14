import Papa from "papaparse";
import * as XLSX from "xlsx";
import { safeParseEmail } from "@/lib/validators/email";
import type { ParseContactsResult, ParsedContactRow } from "@/types";

const NAME_KEYS = ["name", "full name", "fullname", "contact name"];
const EMAIL_KEYS = ["email", "e-mail", "email address", "emailaddress"];
const COMPANY_KEYS = ["company", "organization", "org"];
const DESIGNATION_KEYS = [
  "designation",
  "title",
  "job title",
  "jobtitle",
  "role",
  "position",
];
const LINKEDIN_KEYS = [
  "linkedin url",
  "linkedin",
  "linkedin url (optional)",
  "linkedinurl",
];

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, " ");
}

function pickField(
  row: Record<string, string>,
  keys: string[],
): string | undefined {
  for (const [rawKey, value] of Object.entries(row)) {
    const key = normalizeHeader(rawKey);
    if (keys.includes(key) && value?.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function rowToContact(
  row: Record<string, string>,
  rowIndex: number,
): { contact?: ParsedContactRow; error?: string } {
  const emailRaw =
    pickField(row, EMAIL_KEYS) ??
    Object.values(row).find((v) => v?.includes("@"))?.trim();

  if (!emailRaw) {
    return { error: `Row ${rowIndex + 1}: missing email` };
  }

  const parsed = safeParseEmail(emailRaw);
  if (!parsed.success) {
    return { error: `Row ${rowIndex + 1}: ${parsed.error}` };
  }

  const name = pickField(row, NAME_KEYS);
  const company = pickField(row, COMPANY_KEYS);
  const designation = pickField(row, DESIGNATION_KEYS);

  if (!name) {
    return { error: `Row ${rowIndex + 1}: missing name` };
  }
  if (!company) {
    return { error: `Row ${rowIndex + 1}: missing company` };
  }
  if (!designation) {
    return { error: `Row ${rowIndex + 1}: missing designation` };
  }

  const contact: ParsedContactRow = {
    name,
    email: parsed.email,
    company,
    designation,
    linkedinUrl: pickField(row, LINKEDIN_KEYS),
  };

  return { contact };
}

function dedupeContacts(
  contacts: ParsedContactRow[],
): { unique: ParsedContactRow[]; duplicates: ParsedContactRow[] } {
  const seen = new Map<string, ParsedContactRow>();
  const duplicates: ParsedContactRow[] = [];
  const unique: ParsedContactRow[] = [];

  for (const contact of contacts) {
    const key = contact.email.toLowerCase();
    if (seen.has(key)) {
      duplicates.push(contact);
    } else {
      seen.set(key, contact);
      unique.push(contact);
    }
  }

  return { unique, duplicates };
}

function parseObjectRows(rows: Record<string, string>[]): ParseContactsResult {
  const contacts: ParsedContactRow[] = [];
  const invalidRows: { row: number; reason: string }[] = [];

  rows.forEach((row, index) => {
    const empty = Object.values(row).every((v) => !String(v ?? "").trim());
    if (empty) return;

    const { contact, error } = rowToContact(row, index);
    if (error) {
      invalidRows.push({ row: index + 1, reason: error });
      return;
    }
    if (contact) contacts.push(contact);
  });

  const { unique, duplicates } = dedupeContacts(contacts);

  return {
    contacts: unique,
    duplicates,
    invalidRows,
    totalRows: rows.length,
  };
}

export function parseContactsFromCsv(csvContent: string): ParseContactsResult {
  const parsed = Papa.parse<Record<string, string>>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  if (parsed.errors.length > 0) {
    const invalidRows = parsed.errors.map((e) => ({
      row: (e.row ?? 0) + 1,
      reason: e.message,
    }));
    const base = parseObjectRows(parsed.data);
    return {
      ...base,
      invalidRows: [...base.invalidRows, ...invalidRows],
    };
  }

  return parseObjectRows(parsed.data);
}

export function parseContactsFromExcel(buffer: ArrayBuffer): ParseContactsResult {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return {
      contacts: [],
      duplicates: [],
      invalidRows: [{ row: 0, reason: "Workbook has no sheets" }],
      totalRows: 0,
    };
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
    defval: "",
    raw: false,
  });

  return parseObjectRows(rows);
}

export function parseContactsFromFile(
  fileName: string,
  content: string | ArrayBuffer,
): ParseContactsResult {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".csv")) {
    const text =
      typeof content === "string"
        ? content
        : new TextDecoder().decode(content);
    return parseContactsFromCsv(text);
  }
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    const buffer =
      content instanceof ArrayBuffer
        ? content
        : new TextEncoder().encode(content).buffer;
    return parseContactsFromExcel(buffer);
  }
  throw new Error(`Unsupported file type: ${fileName}`);
}
