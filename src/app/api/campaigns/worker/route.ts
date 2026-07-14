import { NextResponse } from "next/server";
import { processCampaignWorker } from "@/lib/campaign/worker";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      campaignId?: string;
    };
    const result = await processCampaignWorker(body.campaignId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/campaigns/worker", error);
    const message = error instanceof Error ? error.message : "Worker failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
