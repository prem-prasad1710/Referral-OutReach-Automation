"use client"

import * as React from "react"
import { Upload, FileSpreadsheet, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

type ContactUploadProps = {
  onUploadComplete?: (result: { imported: number; skipped: number }) => void
  className?: string
}

export function ContactUpload({ onUploadComplete, className }: ContactUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = React.useState(false)
  const [isUploading, setIsUploading] = React.useState(false)
  const [fileName, setFileName] = React.useState<string | null>(null)

  async function uploadFile(file: File) {
    if (!file.name.match(/\.(csv|xlsx|xls)$/i)) {
      toast.error("Please upload a CSV or Excel file")
      return
    }

    setIsUploading(true)
    setFileName(file.name)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/contacts/import", {
        method: "POST",
        body: formData,
      })

      const data = (await response.json()) as {
        imported?: number
        skipped?: number
        error?: string
      }

      if (!response.ok) {
        throw new Error(data.error ?? "Import failed")
      }

      const imported = data.imported ?? 0
      const skipped = data.skipped ?? 0
      toast.success(`Imported ${imported} contact${imported === 1 ? "" : "s"}`)
      if (skipped > 0) {
        toast.message(`${skipped} row(s) skipped (duplicates or invalid)`)
      }
      onUploadComplete?.({ imported, skipped })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed"
      toast.error(message)
    } finally {
      setIsUploading(false)
    }
  }

  function handleFiles(files: FileList | null) {
    const file = files?.[0]
    if (file) void uploadFile(file)
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Import contacts
        </CardTitle>
        <CardDescription>
          Upload CSV or Excel with columns: name, email, company, designation (linkedin optional).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click()
          }}
          onDragEnter={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setIsDragging(false)
            handleFiles(e.dataTransfer.files)
          }}
          className={cn(
            "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-10 text-center transition-colors",
            isDragging
              ? "border-zinc-900 bg-zinc-50 dark:border-zinc-300 dark:bg-zinc-900"
              : "border-zinc-200 dark:border-zinc-800"
          )}
        >
          <Upload className="h-10 w-10 text-zinc-400" />
          <div>
            <p className="text-sm font-medium">Drag and drop your file here</p>
            <p className="text-xs text-zinc-500">or choose a file from your computer</p>
          </div>
          {fileName ? (
            <p className="text-xs text-zinc-500">Selected: {fileName}</p>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            disabled={isUploading}
            onClick={() => inputRef.current?.click()}
          >
            {isUploading ? (
              <>
                <Loader2 className="animate-spin" />
                Uploading…
              </>
            ) : (
              "Browse files"
            )}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      </CardContent>
    </Card>
  )
}
