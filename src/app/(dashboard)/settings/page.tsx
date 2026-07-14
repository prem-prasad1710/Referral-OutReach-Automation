"use client";

import * as React from "react";

import { SmtpForm, type SmtpFormValues } from "@/components/settings/smtp-form";

export default function SettingsPage() {
  const [defaults, setDefaults] = React.useState<
    Partial<SmtpFormValues> | undefined
  >(undefined);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/settings/smtp");
        if (response.ok) {
          const data = (await response.json()) as {
            settings?: Partial<SmtpFormValues>;
          };
          setDefaults(data.settings);
        }
      } finally {
        setIsLoading(false);
      }
    }
    void load();
  }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Configure SMTP credentials for sending outreach email.
        </p>
      </div>
      {!isLoading && <SmtpForm defaultValues={defaults} />}
      {isLoading && (
        <p className="text-muted-foreground text-sm">Loading settings…</p>
      )}
    </div>
  );
}
