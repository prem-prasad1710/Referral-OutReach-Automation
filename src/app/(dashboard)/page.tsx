import Link from "next/link";
import { StatsCards, type DashboardStats } from "@/components/dashboard/stats-cards";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";

async function getDashboardStats(): Promise<DashboardStats> {
  const [totalContacts, emailsSent, failedSends] = await Promise.all([
    prisma.contact.count(),
    prisma.emailLog.count({ where: { status: "sent" } }),
    prisma.emailLog.count({ where: { status: "failed" } }),
  ]);

  const successRate =
    emailsSent + failedSends > 0
      ? Math.round((emailsSent / (emailsSent + failedSends)) * 100)
      : 0;

  return { totalContacts, emailsSent, failedSends, successRate };
}

export default async function DashboardPage() {
  const [stats, recentCampaigns] = await Promise.all([
    getDashboardStats(),
    prisma.campaign.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        recipients: { select: { status: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Track outreach performance across all campaigns.
          </p>
        </div>
        <Button variant="outline" asChild>
          <a href="/api/logs/export">Export logs (CSV)</a>
        </Button>
      </div>

      <StatsCards stats={stats} />

      <Card>
        <CardHeader>
          <CardTitle>Recent campaigns</CardTitle>
          <CardDescription>Latest outreach activity</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentCampaigns.map((c) => {
            const sent = c.recipients.filter((r) => r.status === "sent").length;
            const failed = c.recipients.filter((r) => r.status === "failed").length;
            return (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {sent} sent · {failed} failed · {c.recipients.length} total
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{c.status}</Badge>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/campaigns/${c.id}/send`}>View</Link>
                  </Button>
                </div>
              </div>
            );
          })}
          {recentCampaigns.length === 0 ? (
            <p className="text-muted-foreground text-sm">No campaigns yet.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
