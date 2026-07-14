import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: { _count: { select: { recipients: true } } },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (campaign._count.recipients === 0) {
      return NextResponse.json(
        { error: "Campaign has no recipients" },
        { status: 400 },
      );
    }

    if (campaign.status === "running") {
      return NextResponse.json({ campaign, message: "Already running" });
    }

    if (campaign.status === "completed") {
      return NextResponse.json(
        { error: "Completed campaigns cannot be restarted" },
        { status: 409 },
      );
    }

    const now = new Date();
    const updated = await prisma.campaign.update({
      where: { id },
      data: {
        status: "running",
        startedAt: campaign.startedAt ?? now,
        completedAt: null,
      },
    });

    return NextResponse.json({ campaign: updated });
  } catch (error) {
    console.error("POST /api/campaigns/[id]/start", error);
    return NextResponse.json(
      { error: "Failed to start campaign" },
      { status: 500 },
    );
  }
}
