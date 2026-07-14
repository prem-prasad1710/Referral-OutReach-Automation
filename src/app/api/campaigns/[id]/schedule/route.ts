import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as { scheduledAt?: string };

    if (!body.scheduledAt) {
      return NextResponse.json(
        { error: "scheduledAt is required" },
        { status: 400 },
      );
    }

    const scheduledAt = new Date(body.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    const updated = await prisma.campaign.update({
      where: { id },
      data: { status: "scheduled", scheduledAt },
    });

    return NextResponse.json({ campaign: updated });
  } catch (error) {
    console.error("POST /api/campaigns/[id]/schedule", error);
    return NextResponse.json(
      { error: "Failed to schedule campaign" },
      { status: 500 },
    );
  }
}
