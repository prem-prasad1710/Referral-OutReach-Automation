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

    if (campaign.status !== "running" && campaign.status !== "scheduled") {
      return NextResponse.json(
        { error: `Cannot pause campaign in status: ${campaign.status}` },
        { status: 409 },
      );
    }

    const updated = await prisma.campaign.update({
      where: { id },
      data: { status: "paused" },
    });

    return NextResponse.json({ campaign: updated });
  } catch (error) {
    console.error("POST /api/campaigns/[id]/pause", error);
    return NextResponse.json(
      { error: "Failed to pause campaign" },
      { status: 500 },
    );
  }
}
