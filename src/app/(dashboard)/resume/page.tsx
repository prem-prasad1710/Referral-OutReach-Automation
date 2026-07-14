"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  ResumeUpload,
  type ResumeSummary,
} from "@/components/resume/resume-upload";
import { RESUME_ATTACHMENT_FILENAME } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ResumePage() {
  const router = useRouter();
  const [resumes, setResumes] = React.useState<ResumeSummary[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const loadResumes = React.useCallback(async () => {
    try {
      const response = await fetch("/api/resume");
      const data = (await response.json()) as { resumes?: ResumeSummary[] };
      if (response.ok) {
        setResumes(data.resumes ?? []);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadResumes();
  }, [loadResumes]);

  const activeResume = resumes.find((r) => r.isActive) ?? resumes[0] ?? null;

  async function setActive(id: string) {
    const response = await fetch("/api/resume", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (response.ok) {
      toast.success("Active resume updated");
      void loadResumes();
      router.refresh();
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Upload Resume</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Upload PDF resumes. The active version is attached to every email.
        </p>
      </div>
      {!isLoading && (
        <ResumeUpload
          activeResume={activeResume}
          onUploaded={() => {
            void loadResumes();
            router.refresh();
          }}
        />
      )}

      {resumes.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Version history</CardTitle>
            <CardDescription>Switch active resume version</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {resumes.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium">
                    v{r.version} — {RESUME_ATTACHMENT_FILENAME}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {new Date(r.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {r.isActive ? (
                    <Badge variant="secondary">Active</Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void setActive(r.id)}
                    >
                      Set active
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
