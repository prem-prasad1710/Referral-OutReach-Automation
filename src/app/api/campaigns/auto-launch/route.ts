import { NextResponse } from "next/server";
import { autoLaunchCampaign } from "@/lib/campaign/auto-launch";

export const maxDuration = 300;

type AutoLaunchBody = {
  company?: string;
  companyDomain?: string;
  discoverFirst?: boolean;
  delaySeconds?: number;
  batchSize?: number;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AutoLaunchBody;

    if (!body.company?.trim()) {
      return NextResponse.json(
        { error: "company is required" },
        { status: 400 },
      );
    }

    const result = await autoLaunchCampaign({
      company: body.company.trim(),
      companyDomain: body.companyDomain?.trim(),
      discoverFirst: body.discoverFirst ?? false,
      delaySeconds: body.delaySeconds,
      batchSize: body.batchSize,
    });

    return NextResponse.json({
      success: true,
      ...result,
      message: `Campaign started for ${result.recipientCount} contacts at ${body.company}`,
    });
  } catch (error) {
    console.error("POST /api/campaigns/auto-launch", error);
    const message =
      error instanceof Error ? error.message : "Auto-launch failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
