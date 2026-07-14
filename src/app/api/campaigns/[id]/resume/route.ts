import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const campaign = await prisma.campaign.findUnique({ where: { id } });
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (campaign.status !== "paused") {
      return NextResponse.json(
        { error: `Cannot resume campaign in status: ${campaign.status}` },
        { status: 409 },
      );
    }

    const updated = await prisma.campaign.update({
      where: { id },
      data: { status: "running", startedAt: campaign.startedAt ?? new Date() },
    });

    return NextResponse.json({ campaign: updated });
  } catch (error) {
    console.error("POST /api/campaigns/[id]/resume", error);
    return NextResponse.json(
      { error: "Failed to resume campaign" },
      { status: 500 },
    );
  }
}
