import { prisma } from "@/lib/db";
import { generatePersonalizedIntro } from "@/lib/ai/openai";
import { buildTemplateContext, renderTemplate } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/sender";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function processCampaignWorker(campaignId?: string) {
  const running = campaignId
    ? await prisma.campaign.findMany({
        where: { id: campaignId, status: "running" },
      })
    : await prisma.campaign.findMany({
        where: { status: "running" },
        orderBy: { startedAt: "asc" },
        take: 1,
      });

  if (running.length === 0) {
    return {
      processed: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      message: "No running campaigns",
    };
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: running[0].id },
    include: {
      resume: true,
      recipients: {
        where: { status: "pending" },
        include: { contact: true },
        orderBy: { id: "asc" },
        take: running[0].batchSize,
      },
    },
  });

  if (!campaign) {
    throw new Error("Campaign not found");
  }

  if (campaign.scheduledAt && campaign.scheduledAt.getTime() > Date.now()) {
    return {
      processed: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      nextRunAt: campaign.scheduledAt,
    };
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < campaign.recipients.length; i++) {
    const recipient = campaign.recipients[i];
    const fresh = await prisma.campaign.findUnique({
      where: { id: campaign.id },
      select: { status: true },
    });
    if (!fresh || fresh.status !== "running") break;

    const contact = recipient.contact;
    if (!contact.isValid) {
      skipped += 1;
      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: { status: "skipped", lastError: "Invalid contact" },
      });
      continue;
    }

    let personalizedIntro = recipient.personalizedIntro ?? "";
    if (!personalizedIntro) {
      personalizedIntro = await generatePersonalizedIntro({
        name: contact.name,
        email: contact.email,
        company: contact.company,
        designation: contact.designation,
        index: i,
      });
      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: { personalizedIntro },
      });
    }

    const context = buildTemplateContext({
      name: contact.name,
      email: contact.email,
      company: contact.company,
      designation: contact.designation,
      personalizedIntro,
    });

    const subject = renderTemplate(
      recipient.editedSubject ?? campaign.subjectTemplate,
      context,
    );
    const bodyText = renderTemplate(
      recipient.editedBody ?? campaign.bodyTemplate,
      context,
    );

    const result = await sendEmail({
      to: contact.email,
      subject,
      html: bodyText.replace(/\n/g, "<br/>"),
      text: bodyText,
      pdfPath: campaign.resume.filePath,
    });

    if (result.success) {
      sent += 1;
      await prisma.$transaction([
        prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: { status: "sent", sentAt: new Date(), lastError: null },
        }),
        prisma.emailLog.create({
          data: {
            campaignId: campaign.id,
            recipientEmail: contact.email,
            recipientName: contact.name,
            status: "sent",
          },
        }),
      ]);
    } else {
      failed += 1;
      const retryCount = recipient.retryCount + 1;
      const exhausted = retryCount >= campaign.maxRetries;
      await prisma.$transaction([
        prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: {
            status: exhausted ? "failed" : "pending",
            retryCount,
            lastError: result.error ?? "Send failed",
          },
        }),
        prisma.emailLog.create({
          data: {
            campaignId: campaign.id,
            recipientEmail: contact.email,
            recipientName: contact.name,
            status: "failed",
            errorMessage: result.error,
          },
        }),
      ]);
    }

    if (campaign.delaySeconds > 0) {
      await sleep(campaign.delaySeconds * 1000);
    }
  }

  const remaining = await prisma.campaignRecipient.count({
    where: { campaignId: campaign.id, status: "pending" },
  });

  let completed = false;
  if (remaining === 0) {
    completed = true;
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: "completed", completedAt: new Date() },
    });
  }

  return {
    campaignId: campaign.id,
    processed: sent + failed + skipped,
    sent,
    failed,
    skipped,
    remaining,
    completed,
  };
}

export async function pauseCampaign(campaignId: string): Promise<void> {
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "paused" },
  });
}

export async function resumeCampaign(campaignId: string): Promise<void> {
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "running", startedAt: new Date() },
  });
}
