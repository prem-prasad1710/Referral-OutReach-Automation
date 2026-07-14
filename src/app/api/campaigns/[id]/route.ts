import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

type PatchCampaignBody = {
  name?: string;
  subjectTemplate?: string;
  bodyTemplate?: string;
  resumeId?: string;
  delaySeconds?: number;
  batchSize?: number;
  maxRetries?: number;
  scheduledAt?: string | null;
  contactIds?: string[];
  recipients?: Array<{
    id: string;
    editedSubject?: string;
    editedBody?: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        resume: true,
        recipients: { include: { contact: true }, orderBy: { contact: { name: "asc" } } },
        _count: { select: { logs: true } },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error("GET /api/campaigns/[id]", error);
    return NextResponse.json(
      { error: "Failed to fetch campaign" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as PatchCampaignBody;

    const existing = await prisma.campaign.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (existing.status === "running") {
      return NextResponse.json(
        { error: "Cannot edit a running campaign; pause it first" },
        { status: 409 },
      );
    }

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name.trim();
    if (body.subjectTemplate !== undefined) data.subjectTemplate = body.subjectTemplate;
    if (body.bodyTemplate !== undefined) data.bodyTemplate = body.bodyTemplate;
    if (body.resumeId !== undefined) data.resumeId = body.resumeId;
    if (body.delaySeconds !== undefined) data.delaySeconds = body.delaySeconds;
    if (body.batchSize !== undefined) data.batchSize = body.batchSize;
    if (body.maxRetries !== undefined) data.maxRetries = body.maxRetries;
    if (body.scheduledAt !== undefined) {
      data.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
      if (body.scheduledAt) data.status = "scheduled";
    }

    const campaign = await prisma.$transaction(async (tx) => {
      if (body.recipients?.length) {
        for (const r of body.recipients) {
          await tx.campaignRecipient.update({
            where: { id: r.id },
            data: {
              ...(r.editedSubject !== undefined
                ? { editedSubject: r.editedSubject }
                : {}),
              ...(r.editedBody !== undefined ? { editedBody: r.editedBody } : {}),
            },
          });
        }
      }

      if (body.contactIds) {
        await tx.campaignRecipient.deleteMany({ where: { campaignId: id } });
        if (body.contactIds.length > 0) {
          await tx.campaignRecipient.createMany({
            data: body.contactIds.map((contactId) => ({ campaignId: id, contactId })),
          });
        }
      }

      return tx.campaign.update({
        where: { id },
        data,
        include: {
          resume: true,
          recipients: { include: { contact: true } },
        },
      });
    });

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error("PATCH /api/campaigns/[id]", error);
    return NextResponse.json(
      { error: "Failed to update campaign" },
      { status: 500 },
    );
  }
}
