"use client"

import * as React from "react"
import { Search, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export type ContactRow = {
  id: string
  name: string
  email: string
  company: string
  designation: string
  linkedinUrl?: string | null
  isValid: boolean
  createdAt: string | Date
}

type ContactTableProps = {
  contacts: ContactRow[]
  onDelete?: (id: string) => void | Promise<void>
  isLoading?: boolean
}

export function ContactTable({ contacts, onDelete, isLoading }: ContactTableProps) {
  const [query, setQuery] = React.useState("")
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return contacts
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q) ||
        c.designation.toLowerCase().includes(q)
    )
  }, [contacts, query])

  async function handleDelete(id: string) {
    if (!onDelete) return
    setDeletingId(id)
    try {
      await onDelete(id)
      toast.success("Contact removed")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <Input
          placeholder="Search contacts…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="rounded-md border border-zinc-200 dark:border-zinc-800">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              {onDelete ? <TableHead className="w-[80px]" /> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={onDelete ? 6 : 5} className="h-24 text-center text-zinc-500">
                  Loading contacts…
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={onDelete ? 6 : 5} className="h-24 text-center text-zinc-500">
                  No contacts found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell className="font-medium">{contact.name}</TableCell>
                  <TableCell>{contact.email}</TableCell>
                  <TableCell>{contact.company}</TableCell>
                  <TableCell>{contact.designation}</TableCell>
                  <TableCell>
                    <Badge variant={contact.isValid ? "success" : "destructive"}>
                      {contact.isValid ? "Valid" : "Invalid"}
                    </Badge>
                  </TableCell>
                  {onDelete ? (
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={deletingId === contact.id}
                        onClick={() => void handleDelete(contact.id)}
                        aria-label={`Delete ${contact.name}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
