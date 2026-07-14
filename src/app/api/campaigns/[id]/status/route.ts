import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        status: true,
        startedAt: true,
        completedAt: true,
        delaySeconds: true,
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const grouped = await prisma.campaignRecipient.groupBy({
      by: ["status"],
      where: { campaignId: id },
      _count: { _all: true },
    });

    let pending = 0;
    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const row of grouped) {
      if (row.status === "pending") pending = row._count._all;
      else if (row.status === "sent") sent = row._count._all;
      else if (row.status === "failed") failed = row._count._all;
      else if (row.status === "skipped") skipped = row._count._all;
    }

    const total = pending + sent + failed + skipped;
    const successRate =
      sent + failed > 0 ? Math.round((sent / (sent + failed)) * 100) : 0;

    const recentLogs = await prisma.emailLog.findMany({
      where: { campaignId: id },
      orderBy: { sentAt: "desc" },
      take: 10,
    });

    return NextResponse.json({
      campaign,
      status: campaign.status,
      pending,
      sent,
      failed,
      skipped,
      total,
      successRate,
      counts: { pending, sent, failed, skipped, total },
      recentLogs,
    });
  } catch (error) {
    console.error("GET /api/campaigns/[id]/status", error);
    return NextResponse.json(
      { error: "Failed to fetch campaign status" },
      { status: 500 },
    );
  }
}
