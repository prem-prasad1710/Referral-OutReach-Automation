"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Eye, Send } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type CampaignRow = {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  _count?: { recipients: number; logs: number };
};

function statusVariant(status: string) {
  if (status === "running") return "default" as const;
  if (status === "completed") return "secondary" as const;
  if (status === "failed" || status === "cancelled") return "destructive" as const;
  return "outline" as const;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = React.useState<CampaignRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/campaigns");
        const data = (await response.json()) as { campaigns?: CampaignRow[] };
        if (response.ok) {
          setCampaigns(data.campaigns ?? []);
        }
      } finally {
        setIsLoading(false);
      }
    }
    void load();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Create and manage referral outreach campaigns.
          </p>
        </div>
        <Button asChild>
          <Link href="/campaigns/create">
            <Plus className="mr-2 h-4 w-4" />
            New campaign
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All campaigns</CardTitle>
          <CardDescription>
            {isLoading
              ? "Loading…"
              : `${campaigns.length} campaign${campaigns.length === 1 ? "" : "s"}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Recipients</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.length === 0 && !isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground h-24 text-center">
                    No campaigns yet. Create one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                campaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell className="font-medium">{campaign.name}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(campaign.status)}>
                        {campaign.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{campaign._count?.recipients ?? 0}</TableCell>
                    <TableCell>
                      {new Date(campaign.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/campaigns/${campaign.id}/preview`}>
                            <Eye className="mr-1 h-3.5 w-3.5" />
                            Preview
                          </Link>
                        </Button>
                        <Button size="sm" asChild>
                          <Link href={`/campaigns/${campaign.id}/send`}>
                            <Send className="mr-1 h-3.5 w-3.5" />
                            Send
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
