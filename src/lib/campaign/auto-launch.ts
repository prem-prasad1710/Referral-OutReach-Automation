import { prisma } from "@/lib/db";
import {
  DEFAULT_BODY_TEMPLATE,
  DEFAULT_SUBJECT_TEMPLATE,
} from "@/lib/constants";
import { autoDiscoverContacts } from "@/lib/discovery/auto-discover";
import { generateCampaignPreviews } from "@/lib/campaign/generate-previews";
import { processCampaignWorker } from "@/lib/campaign/worker";

export type AutoLaunchOptions = {
  company: string;
  companyDomain?: string;
  discoverFirst?: boolean;
  delaySeconds?: number;
  batchSize?: number;
};

export type AutoLaunchResult = {
  campaignId: string;
  campaignName: string;
  recipientCount: number;
  discovered?: {
    imported: number;
    totalFound: number;
    skippedNoEmail: number;
  };
  worker: Awaited<ReturnType<typeof processCampaignWorker>>;
};

function normalizeCompany(value: string): string {
  return value.trim().toLowerCase();
}

export async function autoLaunchCampaign(
  options: AutoLaunchOptions,
): Promise<AutoLaunchResult> {
  const company = options.company.trim();
  if (!company) {
    throw new Error("Company name is required");
  }

  let discovered: AutoLaunchResult["discovered"];

  if (options.discoverFirst) {
    const result = await autoDiscoverContacts({
      company,
      companyDomain: options.companyDomain,
      maxPerRole: 8,
    });
    discovered = {
      imported: result.imported,
      totalFound: result.found.length,
      skippedNoEmail: result.skippedNoEmail,
    };
  }

  const allContacts = await prisma.contact.findMany({
    where: { isValid: true },
    orderBy: { createdAt: "desc" },
  });

  const companyKey = normalizeCompany(company);
  const contacts = allContacts.filter(
    (c) => normalizeCompany(c.company) === companyKey && c.email.trim(),
  );

  if (contacts.length === 0) {
    throw new Error(
      `No contacts with email found for ${company}. Run discover first or import contacts.`,
    );
  }

  const resume = await prisma.resume.findFirst({
    where: { isActive: true },
    orderBy: { version: "desc" },
  });
  if (!resume) {
    throw new Error("No active resume. Upload a resume before sending.");
  }

  const smtp = await prisma.smtpSettings.findFirst({
    where: { isActive: true },
  });
  if (!smtp) {
    throw new Error("SMTP not configured. Add email settings before sending.");
  }

  const campaignName = `${company} outreach — ${new Date().toLocaleDateString()}`;

  const campaign = await prisma.campaign.create({
    data: {
      name: campaignName,
      subjectTemplate: DEFAULT_SUBJECT_TEMPLATE,
      bodyTemplate: DEFAULT_BODY_TEMPLATE,
      resumeId: resume.id,
      delaySeconds: options.delaySeconds ?? 60,
      batchSize: options.batchSize ?? 1,
      status: "draft",
      recipients: {
        create: contacts.map((c) => ({ contactId: c.id })),
      },
    },
  });

  await generateCampaignPreviews(campaign.id);

  await prisma.campaign.update({
    where: { id: campaign.id },
    data: {
      status: "running",
      startedAt: new Date(),
      completedAt: null,
    },
  });

  const worker = await processCampaignWorker(campaign.id);

  return {
    campaignId: campaign.id,
    campaignName,
    recipientCount: contacts.length,
    discovered,
    worker,
  };
}
