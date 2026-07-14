import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseContactsFromFile } from "@/lib/parsers/contact-parser";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const parsed = parseContactsFromFile(file.name, buffer);

    const existingEmails = new Set(
      (
        await prisma.contact.findMany({
          select: { email: true },
        })
      ).map((c) => c.email.toLowerCase()),
    );

    let created = 0;
    let updated = 0;
    let skippedDuplicates = parsed.duplicates.length;

    for (const row of parsed.contacts) {
      const email = row.email.toLowerCase();
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
        skippedDuplicates += 1;
      } else {
        await prisma.contact.create({ data: { email, ...data } });
        created += 1;
        existingEmails.add(email);
      }
    }

    return NextResponse.json({
      created,
      updated,
      duplicates: skippedDuplicates,
      invalidRows: parsed.invalidRows,
      totalRows: parsed.totalRows,
    });
  } catch (error) {
    console.error("POST /api/contacts/import", error);
    const message = error instanceof Error ? error.message : "Import failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
