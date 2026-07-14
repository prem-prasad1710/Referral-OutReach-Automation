"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { ContactTable, type ContactRow } from "@/components/contacts/contact-table";
import { ContactUpload } from "@/components/contacts/contact-upload";

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
    if (response.ok) {
      setContacts((prev) => prev.filter((c) => c.id !== id));
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Contacts</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Import and manage referral outreach recipients.
        </p>
      </div>
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
      />
    </div>
  );
}
