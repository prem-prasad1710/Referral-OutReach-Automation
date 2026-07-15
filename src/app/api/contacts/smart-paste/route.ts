import { NextResponse } from "next/server";
import { parseLinkedInPasteWithGroq, inferCompanyDomain } from "@/lib/discovery/extract-contacts";
import { dedupeProfiles, enrichContactsWithEmails } from "@/lib/discovery/email-finder";
import { upsertDiscoveredContacts } from "@/lib/discovery/upsert";

export const maxDuration = 120;

type SmartPasteBody = {
  text?: string;
  company?: string;
  companyDomain?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SmartPasteBody;

    if (!body.text?.trim()) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }
    if (!body.company?.trim()) {
      return NextResponse.json(
        { error: "company is required" },
        { status: 400 },
      );
    }

    const company = body.company.trim();
    let profiles = await parseLinkedInPasteWithGroq(body.text, company);
    profiles = dedupeProfiles(profiles);

    const domain = await inferCompanyDomain(company, body.companyDomain);
    profiles = await enrichContactsWithEmails(profiles, domain);

    const withEmail = profiles.filter((p) => p.email);
    const skippedNoEmail = profiles.length - withEmail.length;

    const { created, updated, duplicates } = await upsertDiscoveredContacts(
      withEmail.map((p) => ({
        name: p.name,
        email: p.email!,
        company: p.company,
        designation: p.designation,
        linkedinUrl: p.linkedinUrl || undefined,
      })),
    );

    return NextResponse.json({
      success: true,
      found: profiles,
      imported: created,
      updated,
      skippedNoEmail,
      duplicates,
    });
  } catch (error) {
    console.error("POST /api/contacts/smart-paste", error);
    const message = error instanceof Error ? error.message : "Paste import failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
