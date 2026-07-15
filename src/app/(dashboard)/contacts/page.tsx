"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ContactTable, type ContactRow } from "@/components/contacts/contact-table";
import { ContactUpload } from "@/components/contacts/contact-upload";
import { ContactDiscover } from "@/components/contacts/contact-discover";

export default function ContactsPage() {
  const router = useRouter();
  const [contacts, setContacts] = React.useState<ContactRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const loadContacts = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/contacts");
      const data = (await response.json()) as { contacts?: ContactRow[] };
      if (response.ok) {
        setContacts(data.contacts ?? []);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadContacts();
  }, [loadContacts]);

  async function handleDelete(id: string) {
    const response = await fetch(`/api/contacts?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      throw new Error(data.error ?? "Failed to delete contact");
    }
    setContacts((prev) => prev.filter((c) => c.id !== id));
  }

  async function handleDeleteCompany(company: string) {
    const response = await fetch(
      `/api/contacts?company=${encodeURIComponent(company)}`,
      { method: "DELETE" },
    );
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      throw new Error(data.error ?? "Failed to delete company contacts");
    }
    setContacts((prev) =>
      prev.filter((c) => c.company.trim() !== company.trim()),
    );
  }

  async function handleAutoLaunch(
    company: string,
    options: { discoverFirst: boolean },
  ) {
    const response = await fetch("/api/campaigns/auto-launch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company,
        discoverFirst: options.discoverFirst,
        delaySeconds: 60,
      }),
    });
    const data = (await response.json()) as {
      error?: string;
      campaignId?: string;
      recipientCount?: number;
      worker?: { sent?: number; message?: string };
      discovered?: { imported?: number };
    };

    if (!response.ok) {
      throw new Error(data.error ?? "Auto-launch failed");
    }

    if (options.discoverFirst) {
      await loadContacts();
    }

    toast.success(
      `Campaign started for ${data.recipientCount ?? 0} contacts at ${company}`,
      {
        description: data.worker?.sent
          ? `${data.worker.sent} email(s) sent in the first batch`
          : data.worker?.message,
        action: data.campaignId
          ? {
              label: "View",
              onClick: () =>
                router.push(`/campaigns/${data.campaignId}/send`),
            }
          : undefined,
      },
    );

    router.refresh();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Contacts</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Contacts are grouped by company. Use{" "}
          <strong>Discover &amp; send</strong> for full automation — find
          people, personalize emails, and start sending in one click.
        </p>
      </div>

      <ContactDiscover
        onComplete={() => {
          void loadContacts();
          router.refresh();
        }}
      />

      <ContactUpload
        onUploadComplete={() => {
          void loadContacts();
          router.refresh();
        }}
      />

      <ContactTable
        contacts={contacts}
        isLoading={isLoading}
        onDelete={handleDelete}
        onDeleteCompany={handleDeleteCompany}
        onAutoLaunch={handleAutoLaunch}
      />
    </div>
  );
}
