import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Invalid email address")
  .transform((value) => value.toLowerCase());

export function isValidEmail(value: unknown): value is string {
  const result = emailSchema.safeParse(value);
  return result.success;
}

export function parseEmail(value: unknown): string {
  return emailSchema.parse(value);
}

export function safeParseEmail(
  value: unknown,
): { success: true; email: string } | { success: false; error: string } {
  const result = emailSchema.safeParse(value);
  if (result.success) {
    return { success: true, email: result.data };
  }
  const message = result.error.errors.map((e) => e.message).join("; ");
  return { success: false, error: message };
}
