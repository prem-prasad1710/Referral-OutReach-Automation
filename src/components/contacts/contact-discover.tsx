"use client";

import * as React from "react";
import { Building2, Loader2, Search, ClipboardPaste, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DISCOVERY_ROLE_QUERIES, type DiscoveryRoleId } from "@/lib/discovery/constants";

type ContactDiscoverProps = {
  onComplete?: () => void;
};

export function ContactDiscover({ onComplete }: ContactDiscoverProps) {
  const [company, setCompany] = React.useState("");
  const [companyDomain, setCompanyDomain] = React.useState("");
  const [pasteText, setPasteText] = React.useState("");
  const [selectedRoles, setSelectedRoles] = React.useState<Set<DiscoveryRoleId>>(
    new Set(DISCOVERY_ROLE_QUERIES.map((r) => r.id)),
  );
  const [isDiscovering, setIsDiscovering] = React.useState(false);
  const [isPasting, setIsPasting] = React.useState(false);
  const [lastResult, setLastResult] = React.useState<{
    totalFound: number;
    imported: number;
    skippedNoEmail: number;
  } | null>(null);

  function toggleRole(id: DiscoveryRoleId) {
    setSelectedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function runDiscoverAndSend() {
    if (!company.trim()) {
      toast.error("Enter a company name");
      return;
    }
    setIsDiscovering(true);
    setLastResult(null);
    try {
      const response = await fetch("/api/campaigns/auto-launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: company.trim(),
          companyDomain: companyDomain.trim() || undefined,
          discoverFirst: true,
          delaySeconds: 60,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        recipientCount?: number;
        campaignId?: string;
        discovered?: { imported?: number; totalFound?: number };
        worker?: { sent?: number };
      };
      if (!response.ok) throw new Error(data.error ?? "Auto-launch failed");

      setLastResult({
        totalFound: data.discovered?.totalFound ?? data.recipientCount ?? 0,
        imported: data.discovered?.imported ?? data.recipientCount ?? 0,
        skippedNoEmail: 0,
      });
      toast.success(
        `Full automation complete — ${data.recipientCount ?? 0} contacts, campaign started`,
        {
          description: data.worker?.sent
            ? `${data.worker.sent} email(s) already sent`
            : undefined,
        },
      );
      onComplete?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Automation failed");
    } finally {
      setIsDiscovering(false);
    }
  }

  async function runAutoDiscover() {
    if (!company.trim()) {
      toast.error("Enter a company name");
      return;
    }
    setIsDiscovering(true);
    setLastResult(null);
    try {
      const response = await fetch("/api/contacts/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: company.trim(),
          companyDomain: companyDomain.trim() || undefined,
          roles: Array.from(selectedRoles),
          maxPerRole: 8,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        summary?: {
          totalFound: number;
          imported: number;
          skippedNoEmail: number;
        };
      };
      if (!response.ok) throw new Error(data.error ?? "Discovery failed");

      const s = data.summary!;
      setLastResult({
        totalFound: s.totalFound,
        imported: s.imported,
        skippedNoEmail: s.skippedNoEmail,
      });
      toast.success(
        `Imported ${s.imported} contacts from ${company} (${s.totalFound} profiles found)`,
      );
      if (s.skippedNoEmail > 0) {
        toast.message(
          `${s.skippedNoEmail} profiles skipped — no email found. Add HUNTER_API_KEY for better results.`,
        );
      }
      onComplete?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Discovery failed");
    } finally {
      setIsDiscovering(false);
    }
  }

  async function runSmartPaste() {
    if (!company.trim() || !pasteText.trim()) {
      toast.error("Company name and pasted content are required");
      return;
    }
    setIsPasting(true);
    setLastResult(null);
    try {
      const response = await fetch("/api/contacts/smart-paste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: company.trim(),
          companyDomain: companyDomain.trim() || undefined,
          text: pasteText,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        imported?: number;
        found?: unknown[];
        skippedNoEmail?: number;
      };
      if (!response.ok) throw new Error(data.error ?? "Import failed");

      setLastResult({
        totalFound: data.found?.length ?? 0,
        imported: data.imported ?? 0,
        skippedNoEmail: data.skippedNoEmail ?? 0,
      });
      toast.success(`Imported ${data.imported ?? 0} contacts from pasted text`);
      onComplete?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Paste import failed");
    } finally {
      setIsPasting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Auto-discover contacts
        </CardTitle>
        <CardDescription>
          Find HR, recruiters, and employees on LinkedIn automatically — no Excel
          needed. Requires free{" "}
          <a
            href="https://serper.dev"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            Serper API key
          </a>{" "}
          in .env.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="discover-company">Target company *</Label>
            <Input
              id="discover-company"
              placeholder="e.g. Adobe, Google, Paytm"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="discover-domain">Company domain (optional)</Label>
            <Input
              id="discover-domain"
              placeholder="e.g. adobe.com — helps find emails"
              value={companyDomain}
              onChange={(e) => setCompanyDomain(e.target.value)}
            />
          </div>
        </div>

        <Tabs defaultValue="auto">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="auto">
              <Search className="mr-2 h-4 w-4" />
              Full auto
            </TabsTrigger>
            <TabsTrigger value="paste">
              <ClipboardPaste className="mr-2 h-4 w-4" />
              Smart paste
            </TabsTrigger>
          </TabsList>

          <TabsContent value="auto" className="space-y-4 pt-4">
            <p className="text-muted-foreground text-sm">
              Searches LinkedIn for recruiters, HR, engineering managers, and
              engineers at your target company, then finds emails automatically.
            </p>
            <div className="flex flex-wrap gap-2">
              {DISCOVERY_ROLE_QUERIES.map((role) => (
                <Badge
                  key={role.id}
                  variant={selectedRoles.has(role.id) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleRole(role.id)}
                >
                  {role.label}
                </Badge>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={isDiscovering}
              onClick={() => void runAutoDiscover()}
            >
              {isDiscovering ? (
                <>
                  <Loader2 className="animate-spin" />
                  Discovering… (30–90s)
                </>
              ) : (
                <>
                  <Building2 />
                  Discover & import
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="default"
              disabled={isDiscovering}
              onClick={() => void runDiscoverAndSend()}
            >
              {isDiscovering ? (
                <>
                  <Loader2 className="animate-spin" />
                  Running full automation…
                </>
              ) : (
                <>
                  <Sparkles />
                  Discover & send emails
                </>
              )}
            </Button>
            </div>
          </TabsContent>

          <TabsContent value="paste" className="space-y-4 pt-4">
            <p className="text-muted-foreground text-sm">
              Copy LinkedIn search results, profile lists, or URLs from your
              browser and paste below. Groq extracts names and titles; emails
              are found automatically.
            </p>
            <Textarea
              rows={8}
              placeholder={`Paste from LinkedIn — examples:\n\nRahul Sharma\nSenior Software Engineer at Adobe\nhttps://linkedin.com/in/rahulsharma\n\nPriya Singh - Engineering Manager - Adobe | LinkedIn\n...`}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={isPasting}
              onClick={() => void runSmartPaste()}
            >
              {isPasting ? (
                <>
                  <Loader2 className="animate-spin" />
                  Parsing…
                </>
              ) : (
                <>
                  <ClipboardPaste />
                  Parse & import
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>

        {lastResult ? (
          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            Found <strong>{lastResult.totalFound}</strong> profiles · Imported{" "}
            <strong>{lastResult.imported}</strong>
            {lastResult.skippedNoEmail > 0 ? (
              <> · {lastResult.skippedNoEmail} without email</>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
