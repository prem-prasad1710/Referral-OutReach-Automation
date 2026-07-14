"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail } from "lucide-react";
import { toast } from "sonner";

import { SMTP_PRESETS } from "@/lib/constants";
import type { SmtpPresetId } from "@/types";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const smtpFormSchema = z.object({
  provider: z.enum(["gmail", "outlook"]),
  email: z.string().email("Valid email required"),
  password: z.string().min(1, "App password required"),
  fromName: z.string().min(1, "From name is required"),
});

export type SmtpFormValues = z.infer<typeof smtpFormSchema>;

type SmtpFormProps = {
  defaultValues?: Partial<SmtpFormValues>;
  onSaved?: () => void;
};

export function SmtpForm({ defaultValues, onSaved }: SmtpFormProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  const [isTesting, setIsTesting] = React.useState(false);

  const form = useForm<SmtpFormValues>({
    resolver: zodResolver(smtpFormSchema),
    defaultValues: {
      provider: "gmail",
      email: "",
      password: "",
      fromName: "Prem Prasad",
      ...defaultValues,
    },
  });

  const provider = form.watch("provider") as SmtpPresetId;

  async function onSubmit(values: SmtpFormValues) {
    setIsSaving(true);
    try {
      const response = await fetch("/api/settings/smtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to save SMTP settings");
      }
      toast.success("SMTP settings saved (encrypted)");
      onSaved?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    } finally {
      setIsSaving(false);
    }
  }

  async function testConnection() {
    const values = form.getValues();
    setIsTesting(true);
    try {
      const response = await fetch("/api/settings/smtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          action: "test",
          testEmail: values.email,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Test failed");
      toast.success("Test email sent successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Test failed");
    } finally {
      setIsTesting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          SMTP configuration
        </CardTitle>
        <CardDescription>
          Gmail or Outlook with app password. Credentials are encrypted at rest.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label>Provider</Label>
            <Select
              value={provider}
              onValueChange={(value) =>
                form.setValue("provider", value as SmtpPresetId, {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(SMTP_PRESETS) as SmtpPresetId[]).map((id) => (
                  <SelectItem key={id} value={id}>
                    {SMTP_PRESETS[id].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...form.register("email")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fromName">From name</Label>
              <Input id="fromName" {...form.register("fromName")} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="password">App password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                {...form.register("password")}
              />
            </div>
          </div>

          <p className="text-muted-foreground text-xs">
            Using {SMTP_PRESETS[provider].host}:{SMTP_PRESETS[provider].port}
          </p>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving…" : "Save SMTP settings"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isTesting}
              onClick={() => void testConnection()}
            >
              {isTesting ? "Testing…" : "Test connection"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
