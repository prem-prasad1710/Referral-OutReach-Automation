"use client";

import * as React from "react";
import { Play, Pause, CalendarClock } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type CampaignRunStatus =
  | "draft"
  | "preview"
  | "scheduled"
  | "running"
  | "paused"
  | "completed"
  | "failed";

type SendControlsProps = {
  campaignId: string;
  status: CampaignRunStatus;
  sentCount?: number;
  failedCount?: number;
  pendingCount?: number;
  totalCount?: number;
  scheduledAt?: string | null;
  onStatusChange?: () => void;
};

type LogEntry = {
  recipientEmail: string;
  recipientName: string;
  status: string;
  sentAt: string;
  errorMessage?: string | null;
};

export function SendControls({
  campaignId,
  status,
  sentCount = 0,
  failedCount = 0,
  pendingCount = 0,
  totalCount = 0,
  scheduledAt,
  onStatusChange,
}: SendControlsProps) {
  const [scheduleValue, setScheduleValue] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [logs, setLogs] = React.useState<LogEntry[]>([]);
  const workerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const progress =
    totalCount > 0 ? Math.round((sentCount / totalCount) * 100) : 0;

  const loadStatus = React.useCallback(async () => {
    const res = await fetch(`/api/campaigns/${campaignId}/status`);
    const data = (await res.json()) as {
      sent?: number;
      failed?: number;
      pending?: number;
      total?: number;
      status?: string;
      recentLogs?: LogEntry[];
    };
    if (data.recentLogs) setLogs(data.recentLogs);
    onStatusChange?.();
    return data;
  }, [campaignId, onStatusChange]);

  async function runWorker() {
    const res = await fetch("/api/campaigns/worker", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId }),
    });
    const data = await res.json();
    await loadStatus();
    return data;
  }

  React.useEffect(() => {
    if (status === "running") {
      workerRef.current = setInterval(() => {
        void runWorker();
      }, 3000);
      void runWorker();
    }
    return () => {
      if (workerRef.current) clearInterval(workerRef.current);
    };
  }, [status, campaignId]);

  async function callAction(action: string, body?: Record<string, unknown>) {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/${action}`, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Action failed");
      }
      toast.success("Campaign updated");
      onStatusChange?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Request failed");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle>Send Campaign</CardTitle>
              <CardDescription>
                Sent {sentCount} · Failed {failedCount} · Pending {pendingCount}
              </CardDescription>
            </div>
            <Badge variant="secondary">{status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span>
                {sentCount} / {totalCount} ({progress}%)
              </span>
            </div>
            <Progress value={progress} />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={
                isLoading || status === "running" || status === "completed"
              }
              onClick={() => void callAction("start")}
            >
              <Play />
              Start
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={isLoading || status !== "running"}
              onClick={() => void callAction("pause")}
            >
              <Pause />
              Pause
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isLoading || status !== "paused"}
              onClick={() => void callAction("resume")}
            >
              <Play />
              Resume
            </Button>
          </div>

          <div className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CalendarClock className="h-4 w-4" />
              Schedule
            </div>
            {scheduledAt ? (
              <p className="text-muted-foreground text-xs">
                Scheduled for {new Date(scheduledAt).toLocaleString()}
              </p>
            ) : null}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="schedule-at">Date & time</Label>
                <Input
                  id="schedule-at"
                  type="datetime-local"
                  value={scheduleValue}
                  onChange={(e) => setScheduleValue(e.target.value)}
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                disabled={isLoading || !scheduleValue}
                onClick={() =>
                  void callAction("schedule", { scheduledAt: scheduleValue })
                }
              >
                Schedule
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recipient</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.slice(0, 10).map((log, i) => (
                <TableRow key={i}>
                  <TableCell>{log.recipientName}</TableCell>
                  <TableCell>
                    <Badge
                      variant={log.status === "sent" ? "secondary" : "destructive"}
                    >
                      {log.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {new Date(log.sentAt).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground text-center">
                    No sends yet
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
