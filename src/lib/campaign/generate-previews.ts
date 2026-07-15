import { prisma } from "@/lib/db";
import { generatePersonalizedIntro } from "@/lib/ai/openai";
import { buildTemplateContext, renderTemplate } from "@/lib/email/templates";
import { RESUME_ATTACHMENT_FILENAME } from "@/lib/constants";

export async function generateCampaignPreviews(
  campaignId: string,
  options?: { recipientIds?: string[]; persist?: boolean },
) {
  const persist = options?.persist !== false;

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      resume: true,
      recipients: {
        include: { contact: true },
        ...(options?.recipientIds?.length
          ? { where: { id: { in: options.recipientIds } } }
          : {}),
      },
    },
  });

  if (!campaign) {
    throw new Error("Campaign not found");
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

    if (persist) {
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
    where: { id: campaignId },
    data: { status: "preview" },
  });

  return {
    previews,
    count: previews.length,
    resume: {
      fileName: RESUME_ATTACHMENT_FILENAME,
      filePath: campaign.resume.filePath,
    },
  };
}
