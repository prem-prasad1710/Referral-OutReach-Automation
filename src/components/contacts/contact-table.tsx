"use client";

import * as React from "react";
import Link from "next/link";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Loader2,
  Rocket,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type ContactRow = {
  id: string;
  name: string;
  email: string;
  company: string;
  designation: string;
  linkedinUrl?: string | null;
  isValid: boolean;
  createdAt: string | Date;
};

type CompanyGroup = {
  company: string;
  contacts: ContactRow[];
};

type ContactTableProps = {
  contacts: ContactRow[];
  onDelete?: (id: string) => void | Promise<void>;
  onDeleteCompany?: (company: string) => void | Promise<void>;
  onAutoLaunch?: (
    company: string,
    options: { discoverFirst: boolean },
  ) => void | Promise<void>;
  isLoading?: boolean;
};

function groupByCompany(contacts: ContactRow[]): CompanyGroup[] {
  const map = new Map<string, ContactRow[]>();

  for (const contact of contacts) {
    const company = contact.company.trim() || "Unknown company";
    const list = map.get(company) ?? [];
    list.push(contact);
    map.set(company, list);
  }

  return Array.from(map.entries())
    .map(([company, groupContacts]) => ({
      company,
      contacts: groupContacts.sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.company.localeCompare(b.company));
}

export function ContactTable({
  contacts,
  onDelete,
  onDeleteCompany,
  onAutoLaunch,
  isLoading,
}: ContactTableProps) {
  const [query, setQuery] = React.useState("");
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [deletingCompany, setDeletingCompany] = React.useState<string | null>(
    null,
  );
  const [launchingCompany, setLaunchingCompany] = React.useState<string | null>(
    null,
  );
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set());

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q) ||
        c.designation.toLowerCase().includes(q),
    );
  }, [contacts, query]);

  const groups = React.useMemo(() => groupByCompany(filtered), [filtered]);

  function toggleCompany(company: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(company)) next.delete(company);
      else next.add(company);
      return next;
    });
  }

  async function handleDelete(id: string) {
    if (!onDelete) return;
    setDeletingId(id);
    try {
      await onDelete(id);
      toast.success("Contact removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDeleteCompany(company: string) {
    if (!onDeleteCompany) return;
    setDeletingCompany(company);
    try {
      await onDeleteCompany(company);
      toast.success(`Removed all ${company} contacts`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    } finally {
      setDeletingCompany(null);
    }
  }

  async function handleAutoLaunch(company: string, discoverFirst: boolean) {
    if (!onAutoLaunch) return;
    setLaunchingCompany(`${company}:${discoverFirst ? "discover" : "send"}`);
    try {
      await onAutoLaunch(company, { discoverFirst });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Auto-launch failed");
    } finally {
      setLaunchingCompany(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Search contacts…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <p className="text-muted-foreground text-sm">
          {groups.length} compan{groups.length === 1 ? "y" : "ies"} ·{" "}
          {filtered.length} contact{filtered.length === 1 ? "" : "s"}
        </p>
      </div>

      {isLoading ? (
        <div className="rounded-md border border-zinc-200 p-8 text-center text-zinc-500 dark:border-zinc-800">
          Loading contacts…
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-md border border-zinc-200 p-8 text-center text-zinc-500 dark:border-zinc-800">
          No contacts found.
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => {
            const isCollapsed = collapsed.has(group.company);
            const validCount = group.contacts.filter((c) => c.isValid).length;
            const isLaunching = launchingCompany?.startsWith(`${group.company}:`);

            return (
              <div
                key={group.company}
                className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800"
              >
                <div className="flex flex-col gap-3 border-b bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={() => toggleCompany(group.company)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="h-4 w-4 shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0" />
                    )}
                    <Building2 className="text-muted-foreground h-5 w-5 shrink-0" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{group.company}</p>
                      <p className="text-muted-foreground text-xs">
                        {group.contacts.length} contact
                        {group.contacts.length === 1 ? "" : "s"} · {validCount}{" "}
                        ready to email
                      </p>
                    </div>
                  </button>

                  <div className="flex flex-wrap items-center gap-2">
                    {onAutoLaunch ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          disabled={Boolean(isLaunching) || validCount === 0}
                          onClick={() =>
                            void handleAutoLaunch(group.company, false)
                          }
                        >
                          {launchingCompany === `${group.company}:send` ? (
                            <Loader2 className="animate-spin" />
                          ) : (
                            <Rocket />
                          )}
                          Auto-send
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={Boolean(isLaunching)}
                          onClick={() =>
                            void handleAutoLaunch(group.company, true)
                          }
                        >
                          {launchingCompany === `${group.company}:discover` ? (
                            <Loader2 className="animate-spin" />
                          ) : (
                            <Search />
                          )}
                          Discover & send
                        </Button>
                      </>
                    ) : null}
                    {onDeleteCompany ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={deletingCompany === group.company}
                        onClick={() => void handleDeleteCompany(group.company)}
                      >
                        {deletingCompany === group.company ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          <Trash2 />
                        )}
                        Remove all
                      </Button>
                    ) : null}
                  </div>
                </div>

                {!isCollapsed ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        {onDelete ? <TableHead className="w-[80px]" /> : null}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.contacts.map((contact) => (
                        <TableRow key={contact.id}>
                          <TableCell className="font-medium">
                            {contact.name}
                          </TableCell>
                          <TableCell>{contact.email}</TableCell>
                          <TableCell>{contact.designation}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                contact.isValid ? "success" : "destructive"
                              }
                            >
                              {contact.isValid ? "Valid" : "Invalid"}
                            </Badge>
                          </TableCell>
                          {onDelete ? (
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                disabled={deletingId === contact.id}
                                onClick={() => void handleDelete(contact.id)}
                                aria-label={`Delete ${contact.name}`}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </TableCell>
                          ) : null}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {onAutoLaunch ? (
        <p className="text-muted-foreground text-xs">
          Auto-send creates a campaign, generates AI intros, and starts sending
          immediately. Keep this tab open or run{" "}
          <code className="rounded bg-muted px-1">npm run worker</code> in the
          background to process remaining emails.{" "}
          <Link href="/campaigns" className="underline">
            View campaigns
          </Link>
        </p>
      ) : null}
    </div>
  );
}
