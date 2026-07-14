"use client";

import * as React from "react";
import { Eye, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";

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
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export type EmailPreviewItem = {
  recipientId: string;
  name: string;
  email: string;
  company: string;
  designation: string;
  personalizedIntro?: string;
  subject: string;
  body: string;
};

type EmailPreviewProps = {
  previews: EmailPreviewItem[];
  resumeFileName?: string;
  onSaveEdit?: (
    recipientId: string,
    data: { subject: string; body: string },
  ) => void | Promise<void>;
  onRefreshPersonalization?: () => void | Promise<void>;
  isRefreshing?: boolean;
};

function getFirstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

export function EmailPreview({
  previews,
  resumeFileName,
  onSaveEdit,
  onRefreshPersonalization,
  isRefreshing,
}: EmailPreviewProps) {
  const [index, setIndex] = React.useState(0);
  const [editedSubject, setEditedSubject] = React.useState("");
  const [editedBody, setEditedBody] = React.useState("");

  const current = previews[index];

  React.useEffect(() => {
    if (current) {
      setEditedSubject(current.subject);
      setEditedBody(current.body);
    }
  }, [current]);

  if (!current) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          No previews available.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{previews.length} recipients</Badge>
        {resumeFileName ? (
          <Badge variant="outline">Resume: {resumeFileName}</Badge>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Email preview
              </CardTitle>
              <CardDescription>
                Hi {getFirstName(current.name)}, — {current.email} ({index + 1}/
                {previews.length})
              </CardDescription>
            </div>
            {onRefreshPersonalization ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isRefreshing}
                onClick={() => void onRefreshPersonalization()}
              >
                <RefreshCw className={isRefreshing ? "animate-spin" : ""} />
                Regenerate AI
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="preview-subject">Subject</Label>
            <Input
              id="preview-subject"
              value={editedSubject}
              onChange={(e) => setEditedSubject(e.target.value)}
            />
          </div>
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="preview-body">Body</Label>
            <Textarea
              id="preview-body"
              rows={16}
              value={editedBody}
              onChange={(e) => setEditedBody(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap justify-between gap-2">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={index === 0}
                onClick={() => setIndex((i) => i - 1)}
              >
                <ChevronLeft />
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={index >= previews.length - 1}
                onClick={() => setIndex((i) => i + 1)}
              >
                Next
                <ChevronRight />
              </Button>
            </div>
            {onSaveEdit ? (
              <Button
                type="button"
                size="sm"
                onClick={() =>
                  void onSaveEdit(current.recipientId, {
                    subject: editedSubject,
                    body: editedBody,
                  })
                }
              >
                Save edits
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
