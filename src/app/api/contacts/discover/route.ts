import { NextResponse } from "next/server";
import { autoDiscoverContacts } from "@/lib/discovery/auto-discover";
import type { DiscoveryRoleId } from "@/lib/discovery/constants";

export const maxDuration = 120;

type DiscoverBody = {
  company?: string;
  companyDomain?: string;
  roles?: DiscoveryRoleId[];
  maxPerRole?: number;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DiscoverBody;

    if (!body.company?.trim()) {
      return NextResponse.json(
        { error: "company is required" },
        { status: 400 },
      );
    }

    const result = await autoDiscoverContacts({
      company: body.company.trim(),
      companyDomain: body.companyDomain?.trim(),
      roles: body.roles,
      maxPerRole: body.maxPerRole,
    });

    return NextResponse.json({
      success: true,
      ...result,
      summary: {
        totalFound: result.found.length,
        imported: result.imported,
        updated: result.updated,
        skippedNoEmail: result.skippedNoEmail,
        duplicates: result.duplicates,
      },
    });
  } catch (error) {
    console.error("POST /api/contacts/discover", error);
    const message =
      error instanceof Error ? error.message : "Discovery failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
