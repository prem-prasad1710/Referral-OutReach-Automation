"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  MAX_DELAY_SECONDS,
  MIN_DELAY_SECONDS,
  DEFAULT_BODY_TEMPLATE,
  DEFAULT_SUBJECT_TEMPLATE,
  RESUME_ATTACHMENT_FILENAME,
} from "@/lib/constants";

const campaignFormSchema = z.object({
  name: z.string().min(1, "Campaign name is required"),
  subjectTemplate: z.string().min(1, "Subject is required"),
  bodyTemplate: z.string().min(1, "Body is required"),
  resumeId: z.string().min(1, "Select a resume"),
  delaySeconds: z.number().min(MIN_DELAY_SECONDS).max(MAX_DELAY_SECONDS),
  batchSize: z.number().min(1).max(10),
  scheduledAt: z.string().optional(),
});

export type CampaignFormValues = z.infer<typeof campaignFormSchema>;

type ResumeOption = { id: string; fileName: string; version: number };

type ContactOption = {
  id: string;
  name: string;
  email: string;
  company: string;
  designation: string;
};

type CampaignFormProps = {
  resumes: ResumeOption[];
  contacts: ContactOption[];
  defaultValues?: Partial<CampaignFormValues>;
  onSubmit: (
    values: CampaignFormValues & { contactIds: string[] },
  ) => void | Promise<void>;
  isSubmitting?: boolean;
};

export function CampaignForm({
  resumes,
  contacts,
  defaultValues,
  onSubmit,
  isSubmitting,
}: CampaignFormProps) {
  const [selectedContacts, setSelectedContacts] = React.useState<Set<string>>(
    new Set(contacts.map((c) => c.id)),
  );

  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: {
      name: "",
      subjectTemplate: DEFAULT_SUBJECT_TEMPLATE,
      bodyTemplate: DEFAULT_BODY_TEMPLATE,
      resumeId: resumes.find((r) => r)?.id ?? "",
      delaySeconds: 60,
      batchSize: 1,
      ...defaultValues,
    },
  });

  const delaySeconds = form.watch("delaySeconds");
  const batchSize = form.watch("batchSize");

  function toggleContact(id: string) {
    setSelectedContacts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <form
      className="space-y-6"
      onSubmit={form.handleSubmit(async (values) => {
        if (selectedContacts.size === 0) return;
        await onSubmit({
          ...values,
          contactIds: Array.from(selectedContacts),
        });
      })}
    >
      <Card>
        <CardHeader>
          <CardTitle>Campaign details</CardTitle>
          <CardDescription>
            Placeholders: {"{{name}}"}, {"{{company}}"}, {"{{designation}}"},{" "}
            {"{{ai_intro}}"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Campaign name</Label>
            <Input id="name" {...form.register("name")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="resumeId">Resume attachment</Label>
            <Select
              value={form.watch("resumeId")}
              onValueChange={(v) =>
                form.setValue("resumeId", v, { shouldValidate: true })
              }
            >
              <SelectTrigger id="resumeId">
                <SelectValue placeholder="Select resume" />
              </SelectTrigger>
              <SelectContent>
                {resumes.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    v{r.version} — {RESUME_ATTACHMENT_FILENAME}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subjectTemplate">Email subject</Label>
            <Input id="subjectTemplate" {...form.register("subjectTemplate")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bodyTemplate">Email body</Label>
            <Textarea
              id="bodyTemplate"
              rows={14}
              {...form.register("bodyTemplate")}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <Label>Delay between emails</Label>
              <span className="text-muted-foreground">{delaySeconds}s</span>
            </div>
            <Slider
              min={MIN_DELAY_SECONDS}
              max={MAX_DELAY_SECONDS}
              step={5}
              value={[delaySeconds]}
              onValueChange={([v]) => form.setValue("delaySeconds", v)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <Label>Batch size</Label>
              <span className="text-muted-foreground">{batchSize}</span>
            </div>
            <Slider
              min={1}
              max={5}
              step={1}
              value={[batchSize]}
              onValueChange={([v]) => form.setValue("batchSize", v)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="scheduledAt">Schedule (optional)</Label>
            <Input
              id="scheduledAt"
              type="datetime-local"
              {...form.register("scheduledAt")}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Select contacts ({selectedContacts.size})</CardTitle>
          <CardDescription>
            Choose recipients for this campaign
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {contacts.map((c) => (
              <label
                key={c.id}
                className="flex cursor-pointer items-center gap-3 rounded-md border p-3 hover:bg-muted/50"
              >
                <input
                  type="checkbox"
                  checked={selectedContacts.has(c.id)}
                  onChange={() => toggleContact(c.id)}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{c.name}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {c.email} · {c.company} · {c.designation}
                  </p>
                </div>
              </label>
            ))}
            {contacts.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No contacts. Import contacts first.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={isSubmitting || selectedContacts.size === 0}>
        <Save />
        {isSubmitting ? "Creating…" : "Create & preview"}
      </Button>
    </form>
  );
}
