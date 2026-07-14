"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import {
  SendControls,
  type CampaignRunStatus,
} from "@/components/campaigns/send-controls";
import { Button } from "@/components/ui/button";

export default function CampaignSendPage() {
  const params = useParams<{ id: string }>();
  const campaignId = params.id;

  const [campaignName, setCampaignName] = React.useState("");
  const [status, setStatus] = React.useState<CampaignRunStatus>("draft");
  const [sentCount, setSentCount] = React.useState(0);
  const [failedCount, setFailedCount] = React.useState(0);
  const [pendingCount, setPendingCount] = React.useState(0);
  const [totalCount, setTotalCount] = React.useState(0);
  const [scheduledAt, setScheduledAt] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const loadData = React.useCallback(async () => {
    const [campRes, statusRes] = await Promise.all([
      fetch(`/api/campaigns/${campaignId}`),
      fetch(`/api/campaigns/${campaignId}/status`),
    ]);
    const campData = (await campRes.json()) as {
      campaign?: { name: string; status: string; scheduledAt?: string | null };
    };
    const statusData = (await statusRes.json()) as {
      sent?: number;
      failed?: number;
      pending?: number;
      total?: number;
      status?: string;
    };

    if (campData.campaign) {
      setCampaignName(campData.campaign.name);
      setStatus(campData.campaign.status as CampaignRunStatus);
      setScheduledAt(campData.campaign.scheduledAt ?? null);
    }
    if (statusRes.ok) {
      setSentCount(statusData.sent ?? 0);
      setFailedCount(statusData.failed ?? 0);
      setPendingCount(statusData.pending ?? 0);
      setTotalCount(statusData.total ?? 0);
      if (statusData.status) setStatus(statusData.status as CampaignRunStatus);
    }
    setIsLoading(false);
  }, [campaignId]);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">Loading campaign…</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Send: {campaignName}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Start, pause, or schedule automated delivery with rate limiting.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/campaigns/${campaignId}/preview`}>Back to preview</Link>
        </Button>
      </div>
      <SendControls
        campaignId={campaignId}
        status={status}
        sentCount={sentCount}
        failedCount={failedCount}
        pendingCount={pendingCount}
        totalCount={totalCount}
        scheduledAt={scheduledAt}
        onStatusChange={() => {
          void loadData();
        }}
      />
    </div>
  );
}
