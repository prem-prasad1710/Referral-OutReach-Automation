import Link from "next/link";

import {
  EmailPreview,
  type EmailPreviewItem,
} from "@/components/campaigns/email-preview";
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
import {
  DEFAULT_BODY_TEMPLATE,
  DEFAULT_SUBJECT_TEMPLATE,
  RESUME_ATTACHMENT_FILENAME,
} from "@/lib/constants";
import { buildTemplateContext, renderTemplate } from "@/lib/email/templates";
import { prisma } from "@/lib/db";

const sampleContact = {
  name: "Rahul Sharma",
  email: "rahul@company.com",
  company: "Adobe",
  designation: "Senior Software Engineer",
};

export default async function TemplatesPage() {
  const templates = await prisma.campaignTemplate.findMany({
    orderBy: { createdAt: "desc" },
  });

  const subjectTemplate =
    templates[0]?.subjectTemplate ?? DEFAULT_SUBJECT_TEMPLATE;
  const bodyTemplate = templates[0]?.bodyTemplate ?? DEFAULT_BODY_TEMPLATE;

  const context = buildTemplateContext({
    ...sampleContact,
    personalizedIntro:
      "Your experience leading engineering teams at Adobe caught my attention.",
  });

  const previewItem: EmailPreviewItem = {
    recipientId: "preview",
    name: sampleContact.name,
    email: sampleContact.email,
    company: sampleContact.company,
    designation: sampleContact.designation,
    personalizedIntro: context.ai_intro,
    subject: renderTemplate(subjectTemplate, context),
    body: renderTemplate(bodyTemplate, context),
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Templates</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Saved subject and body templates for campaigns.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/campaigns/create">Use in new campaign</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Saved templates</CardTitle>
          <CardDescription>
            {templates.length === 0
              ? "No saved templates yet — defaults are used when creating campaigns."
              : `${templates.length} template${templates.length === 1 ? "" : "s"}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground text-center">
                    No templates in database.
                  </TableCell>
                </TableRow>
              ) : (
                templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">{template.name}</TableCell>
                    <TableCell className="max-w-md truncate">
                      {template.subjectTemplate}
                    </TableCell>
                    <TableCell>
                      {template.createdAt.toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <EmailPreview previews={[previewItem]} resumeFileName={RESUME_ATTACHMENT_FILENAME} />
    </div>
  );
}
