import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  DEFAULT_BODY_TEMPLATE,
  DEFAULT_SUBJECT_TEMPLATE,
} from "@/lib/constants";

type CreateCampaignBody = {
  name?: string;
  subjectTemplate?: string;
  bodyTemplate?: string;
  resumeId?: string;
  contactIds?: string[];
  delaySeconds?: number;
  batchSize?: number;
  maxRetries?: number;
  scheduledAt?: string | null;
};

export async function GET() {
  try {
    const campaigns = await prisma.campaign.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        resume: true,
        _count: { select: { recipients: true, logs: true } },
      },
    });
    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error("GET /api/campaigns", error);
    return NextResponse.json(
      { error: "Failed to list campaigns" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateCampaignBody;
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    let resumeId = body.resumeId;
    if (!resumeId) {
      const active = await prisma.resume.findFirst({
        where: { isActive: true },
        orderBy: { version: "desc" },
      });
      if (!active) {
        return NextResponse.json(
          { error: "No active resume; upload a resume first" },
          { status: 400 },
        );
      }
      resumeId = active.id;
    }

    const contactIds = body.contactIds ?? [];
    if (contactIds.length === 0) {
      return NextResponse.json(
        { error: "contactIds must include at least one contact" },
        { status: 400 },
      );
    }

    const contacts = await prisma.contact.findMany({
      where: { id: { in: contactIds } },
    });
    if (contacts.length !== contactIds.length) {
      return NextResponse.json(
        { error: "One or more contactIds were not found" },
        { status: 400 },
      );
    }

    const campaign = await prisma.campaign.create({
      data: {
        name: body.name.trim(),
        subjectTemplate: body.subjectTemplate?.trim() || DEFAULT_SUBJECT_TEMPLATE,
        bodyTemplate: body.bodyTemplate?.trim() || DEFAULT_BODY_TEMPLATE,
        resumeId,
        delaySeconds: body.delaySeconds ?? 60,
        batchSize: body.batchSize ?? 1,
        maxRetries: body.maxRetries ?? 3,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
        status: body.scheduledAt ? "scheduled" : "draft",
        recipients: {
          create: contactIds.map((contactId) => ({ contactId })),
        },
      },
      include: {
        recipients: { include: { contact: true } },
        resume: true,
      },
    });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    console.error("POST /api/campaigns", error);
    return NextResponse.json(
      { error: "Failed to create campaign" },
      { status: 500 },
    );
  }
}
