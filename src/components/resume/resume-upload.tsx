"use client"

import * as React from "react"
import { FileUp, FileText, Loader2, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { RESUME_ATTACHMENT_FILENAME } from "@/lib/constants"

export type ResumeSummary = {
  id: string
  fileName: string
  fileSize: number
  version: number
  isActive: boolean
  createdAt: string | Date
}

type ResumeUploadProps = {
  activeResume?: ResumeSummary | null
  onUploaded?: (resume: ResumeSummary) => void
  className?: string
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function ResumeUpload({ activeResume, onUploaded, className }: ResumeUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = React.useState(false)

  async function uploadFile(file: File) {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please upload a PDF resume")
      return
    }

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/resume/upload", {
        method: "POST",
        body: formData,
      })

      const data = (await response.json()) as {
        resume?: ResumeSummary;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "Upload failed");
      }

      toast.success("Resume uploaded");
      if (data.resume) onUploaded?.(data.resume);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Resume PDF
        </CardTitle>
        <CardDescription>
          Attach your latest resume to outbound referral emails. PDF only.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeResume ? (
          <div className="flex items-start justify-between gap-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="font-medium">{RESUME_ATTACHMENT_FILENAME}</span>
                {activeResume.isActive ? <Badge variant="secondary">Active</Badge> : null}
              </div>
              <p className="text-xs text-zinc-500">
                v{activeResume.version} · {formatBytes(activeResume.fileSize)}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">No resume uploaded yet.</p>
        )}

        <div
          className={cn(
            "flex flex-col items-center gap-3 rounded-lg border border-dashed border-zinc-200 px-6 py-8 text-center dark:border-zinc-800"
          )}
        >
          <FileUp className="h-8 w-8 text-zinc-400" />
          <Button
            type="button"
            disabled={isUploading}
            onClick={() => inputRef.current?.click()}
          >
            {isUploading ? (
              <>
                <Loader2 className="animate-spin" />
                Uploading…
              </>
            ) : (
              "Upload new resume"
            )}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void uploadFile(file)
            }}
          />
        </div>
      </CardContent>
    </Card>
  )
}
