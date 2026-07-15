import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateCampaignPreviews } from "@/lib/campaign/generate-previews";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      recipientIds?: string[];
      persist?: boolean;
    };

    const result = await generateCampaignPreviews(id, {
      recipientIds: body.recipientIds,
      persist: body.persist,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/campaigns/[id]/preview", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate previews";
    const status = message === "Campaign not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
