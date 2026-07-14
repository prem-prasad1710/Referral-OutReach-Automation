import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generatePersonalizedIntro } from "@/lib/ai/openai";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      items?: Array<{
        name: string;
        email: string;
        company: string;
        designation: string;
      }>;
      recipientIds?: string[];
      campaignId?: string;
      persist?: boolean;
    };

    const results: Array<{
      recipientId?: string;
      email: string;
      name: string;
      personalizedIntro: string;
    }> = [];

    if (body.recipientIds?.length) {
      const recipients = await prisma.campaignRecipient.findMany({
        where: { id: { in: body.recipientIds } },
        include: { contact: true },
      });

      for (let i = 0; i < recipients.length; i++) {
        const recipient = recipients[i];
        const intro = await generatePersonalizedIntro({
          name: recipient.contact.name,
          email: recipient.contact.email,
          company: recipient.contact.company,
          designation: recipient.contact.designation,
          index: i,
        });

        if (body.persist) {
          await prisma.campaignRecipient.update({
            where: { id: recipient.id },
            data: { personalizedIntro: intro },
          });
        }

        results.push({
          recipientId: recipient.id,
          email: recipient.contact.email,
          name: recipient.contact.name,
          personalizedIntro: intro,
        });
      }
    } else if (body.campaignId) {
      const campaign = await prisma.campaign.findUnique({
        where: { id: body.campaignId },
        include: { recipients: { include: { contact: true } } },
      });
      if (!campaign) {
        return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
      }

      for (let i = 0; i < campaign.recipients.length; i++) {
        const recipient = campaign.recipients[i];
        const intro = await generatePersonalizedIntro({
          name: recipient.contact.name,
          email: recipient.contact.email,
          company: recipient.contact.company,
          designation: recipient.contact.designation,
          index: i,
        });

        if (body.persist) {
          await prisma.campaignRecipient.update({
            where: { id: recipient.id },
            data: { personalizedIntro: intro },
          });
        }

        results.push({
          recipientId: recipient.id,
          email: recipient.contact.email,
          name: recipient.contact.name,
          personalizedIntro: intro,
        });
      }
    } else if (body.items?.length) {
      for (let i = 0; i < body.items.length; i++) {
        const item = body.items[i];
        const intro = await generatePersonalizedIntro({ ...item, index: i });
        results.push({
          email: item.email,
          name: item.name,
          personalizedIntro: intro,
        });
      }
    } else {
      return NextResponse.json(
        { error: "Provide items, recipientIds, or campaignId" },
        { status: 400 },
      );
    }

    return NextResponse.json({ results, count: results.length });
  } catch (error) {
    console.error("POST /api/ai/personalize", error);
    return NextResponse.json(
      { error: "Failed to personalize" },
      { status: 500 },
    );
  }
}
