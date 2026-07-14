import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function csvEscape(value: string | null | undefined): string {
  const text = value ?? "";
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get("campaignId");

    const logs = await prisma.emailLog.findMany({
      where: campaignId ? { campaignId } : undefined,
      orderBy: { sentAt: "desc" },
      include: { campaign: { select: { name: true } } },
    });

    const header = [
      "sentAt",
      "campaignId",
      "campaignName",
      "recipientEmail",
      "recipientName",
      "status",
      "errorMessage",
    ].join(",");

    const rows = logs.map((log) =>
      [
        log.sentAt.toISOString(),
        log.campaignId,
        log.campaign.name,
        log.recipientEmail,
        log.recipientName,
        log.status,
        log.errorMessage,
      ]
        .map((cell) => csvEscape(cell == null ? "" : String(cell)))
        .join(","),
    );

    const csv = [header, ...rows].join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="email-logs${campaignId ? `-${campaignId}` : ""}.csv"`,
      },
    });
  } catch (error) {
    console.error("GET /api/logs/export", error);
    return NextResponse.json(
      { error: "Failed to export logs" },
      { status: 500 },
    );
  }
}
