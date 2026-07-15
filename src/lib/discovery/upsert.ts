import type { ParsedContactRow } from "@/types";

export async function upsertDiscoveredContacts(
  contacts: ParsedContactRow[],
): Promise<{ created: number; updated: number; duplicates: number; skipped: number }> {
  const { prisma } = await import("@/lib/db");

  const existingEmails = new Set(
    (await prisma.contact.findMany({ select: { email: true } })).map((c) =>
      c.email.toLowerCase(),
    ),
  );

  let created = 0;
  let updated = 0;
  let duplicates = 0;
  let skipped = 0;

  for (const row of contacts) {
    if (!row.email?.trim()) {
      skipped += 1;
      continue;
    }

    const email = row.email.trim().toLowerCase();
    const data = {
      name: row.name.trim(),
      company: row.company.trim(),
      designation: row.designation.trim(),
      linkedinUrl: row.linkedinUrl?.trim() || null,
      isValid: true,
    };

    const existing = await prisma.contact.findUnique({ where: { email } });
    if (existing) {
      await prisma.contact.update({ where: { email }, data });
      updated += 1;
    } else if (existingEmails.has(email)) {
      duplicates += 1;
    } else {
      await prisma.contact.create({ data: { email, ...data } });
      created += 1;
      existingEmails.add(email);
    }
  }

  return { created, updated, duplicates, skipped };
}
