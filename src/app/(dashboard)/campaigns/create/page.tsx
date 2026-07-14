"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { CampaignForm } from "@/components/campaigns/campaign-form";
import {
  DEFAULT_BODY_TEMPLATE,
  DEFAULT_SUBJECT_TEMPLATE,
} from "@/lib/constants";

type ResumeOption = { id: string; fileName: string; version: number };
type ContactOption = {
  id: string;
  name: string;
  email: string;
  company: string;
  designation: string;
};

export default function CreateCampaignPage() {
  const router = useRouter();
  const [resumes, setResumes] = React.useState<ResumeOption[]>([]);
  const [contacts, setContacts] = React.useState<ContactOption[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    async function load() {
      const [resumeRes, contactRes] = await Promise.all([
        fetch("/api/resume"),
        fetch("/api/contacts"),
      ]);
      const resumeData = (await resumeRes.json()) as {
        resumes?: ResumeOption[];
      };
      const contactData = (await contactRes.json()) as {
        contacts?: ContactOption[];
      };
      if (resumeRes.ok && resumeData.resumes) {
        setResumes(resumeData.resumes);
      }
      if (contactRes.ok && contactData.contacts) {
        setContacts(contactData.contacts);
      }
    }
    void load();
  }, []);

  async function handleSubmit(values: {
    name: string;
    subjectTemplate: string;
    bodyTemplate: string;
    resumeId: string;
    delaySeconds: number;
    batchSize: number;
    scheduledAt?: string;
    contactIds: string[];
  }) {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          subjectTemplate: values.subjectTemplate,
          bodyTemplate: values.bodyTemplate,
          resumeId: values.resumeId,
          contactIds: values.contactIds,
          delaySeconds: values.delaySeconds,
          batchSize: values.batchSize,
          scheduledAt: values.scheduledAt || null,
        }),
      });
      const data = (await response.json()) as {
        campaign?: { id: string };
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to create campaign");
      }

      if (data.campaign?.id) {
        await fetch(`/api/campaigns/${data.campaign.id}/preview`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ persist: true }),
        });
        toast.success("Campaign created with AI previews");
        router.push(`/campaigns/${data.campaign.id}/preview`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Create failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create Campaign</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Select contacts, configure templates, and set send pacing.
        </p>
      </div>
      <CampaignForm
        resumes={resumes}
        contacts={contacts}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
        defaultValues={{
          subjectTemplate: DEFAULT_SUBJECT_TEMPLATE,
          bodyTemplate: DEFAULT_BODY_TEMPLATE,
          delaySeconds: 60,
          batchSize: 1,
        }}
      />
    </div>
  );
}
