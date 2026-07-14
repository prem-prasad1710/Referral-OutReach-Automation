"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";

import {
  EmailPreview,
  type EmailPreviewItem,
} from "@/components/campaigns/email-preview";
import { Button } from "@/components/ui/button";

export default function CampaignPreviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const campaignId = params.id;

  const [previews, setPreviews] = React.useState<EmailPreviewItem[]>([]);
  const [resumeFileName, setResumeFileName] = React.useState<string>();
  const [campaignName, setCampaignName] = React.useState("");
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  const loadPreviews = React.useCallback(async () => {
    const response = await fetch(`/api/campaigns/${campaignId}/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ persist: true }),
    });
    const data = (await response.json()) as {
      previews?: EmailPreviewItem[];
      resume?: { fileName: string };
      error?: string;
    };
    if (response.ok && data.previews) {
      setPreviews(data.previews);
      setResumeFileName(data.resume?.fileName);
    }
    setIsLoading(false);
  }, [campaignId]);

  React.useEffect(() => {
    async function init() {
      const campRes = await fetch(`/api/campaigns/${campaignId}`);
      const campData = (await campRes.json()) as {
        campaign?: { name: string };
      };
      if (campData.campaign) setCampaignName(campData.campaign.name);
      await loadPreviews();
    }
    void init();
  }, [campaignId, loadPreviews]);

  async function handleSaveEdit(
    recipientId: string,
    data: { subject: string; body: string },
  ) {
    const response = await fetch(`/api/campaigns/${campaignId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipients: [
          {
            id: recipientId,
            editedSubject: data.subject,
            editedBody: data.body,
          },
        ],
      }),
    });
    if (response.ok) toast.success("Saved");
    else toast.error("Failed to save");
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      await loadPreviews();
      toast.success("AI intros regenerated");
    } finally {
      setIsRefreshing(false);
    }
  }

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">Generating previews…</p>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Preview: {campaignName}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Review and edit emails before sending. Each greeting uses the
            contact&apos;s first name.
          </p>
        </div>
        <Button onClick={() => router.push(`/campaigns/${campaignId}/send`)}>
          Proceed to Send
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
      <EmailPreview
        previews={previews}
        resumeFileName={resumeFileName}
        onSaveEdit={handleSaveEdit}
        onRefreshPersonalization={handleRefresh}
        isRefreshing={isRefreshing}
      />
      <Button variant="outline" asChild>
        <Link href="/campaigns">Back to campaigns</Link>
      </Button>
    </div>
  );
}
