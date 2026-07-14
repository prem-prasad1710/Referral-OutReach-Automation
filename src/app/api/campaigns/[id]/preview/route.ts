import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { RESUME_ATTACHMENT_FILENAME } from "@/lib/constants";
import { generatePersonalizedIntro } from "@/lib/ai/openai";
import { buildTemplateContext, renderTemplate } from "@/lib/email/templates";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      recipientIds?: string[];
      persist?: boolean;
    };

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        resume: true,
        recipients: {
          include: { contact: true },
          ...(body.recipientIds?.length
            ? { where: { id: { in: body.recipientIds } } }
            : {}),
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const previews = [];

    for (let i = 0; i < campaign.recipients.length; i++) {
      const recipient = campaign.recipients[i];
      const contact = recipient.contact;

      const personalizedIntro =
        recipient.personalizedIntro ??
        (await generatePersonalizedIntro({
          name: contact.name,
          email: contact.email,
          company: contact.company,
          designation: contact.designation,
          index: i,
        }));

      if (body.persist !== false) {
        await prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: { personalizedIntro },
        });
      }

      const contextVars = buildTemplateContext({
        name: contact.name,
        email: contact.email,
        company: contact.company,
        designation: contact.designation,
        personalizedIntro,
      });

      const subject = renderTemplate(
        recipient.editedSubject ?? campaign.subjectTemplate,
        contextVars,
      );
      const bodyText = renderTemplate(
        recipient.editedBody ?? campaign.bodyTemplate,
        contextVars,
      );

      previews.push({
        recipientId: recipient.id,
        contactId: contact.id,
        email: contact.email,
        name: contact.name,
        company: contact.company,
        designation: contact.designation,
        personalizedIntro,
        subject,
        body: bodyText,
      });
    }

    await prisma.campaign.update({
      where: { id },
      data: { status: "preview" },
    });

    return NextResponse.json({
      previews,
      count: previews.length,
      resume: {
        fileName: RESUME_ATTACHMENT_FILENAME,
        filePath: campaign.resume.filePath,
      },
    });
  } catch (error) {
    console.error("POST /api/campaigns/[id]/preview", error);
    return NextResponse.json(
      { error: "Failed to generate previews" },
      { status: 500 },
    );
  }
}
