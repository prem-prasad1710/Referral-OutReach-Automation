import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const [
      contactCount,
      campaignCount,
      templateCount,
      activeResume,
      logsGrouped,
      recipientGrouped,
      recentCampaigns,
    ] = await Promise.all([
      prisma.contact.count(),
      prisma.campaign.count(),
      prisma.campaignTemplate.count(),
      prisma.resume.findFirst({ where: { isActive: true }, orderBy: { version: "desc" } }),
      prisma.emailLog.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.campaignRecipient.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.campaign.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { _count: { select: { recipients: true, logs: true } } },
      }),
    ]);

    const emailLogStats = Object.fromEntries(
      logsGrouped.map((row) => [row.status, row._count._all]),
    );
    const recipientStats = Object.fromEntries(
      recipientGrouped.map((row) => [row.status, row._count._all]),
    );

    const runningCampaigns = await prisma.campaign.count({ where: { status: "running" } });
    const completedCampaigns = await prisma.campaign.count({ where: { status: "completed" } });

    return NextResponse.json({
      totals: {
        contacts: contactCount,
        campaigns: campaignCount,
        templates: templateCount,
        runningCampaigns,
        completedCampaigns,
      },
      activeResume,
      emailLogStats,
      recipientStats,
      recentCampaigns,
    });
  } catch (error) {
    console.error("GET /api/analytics", error);
    return NextResponse.json(
      { error: "Failed to load analytics" },
      { status: 500 },
    );
  }
}
