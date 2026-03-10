"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { Loader2, Mail, Phone, Building2, User, Pencil, Check, X } from "lucide-react"

interface Profile {
  full_name: string | null
  email: string | null
  phone: string | null
  organisation_name: string | null
}

function getInitials(name: string | null, email: string | null): string {
  if (name && name.trim()) {
    const parts = name.trim().split(" ")
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name.trim().slice(0, 2).toUpperCase()
  }
  if (email) return email.slice(0, 2).toUpperCase()
  return "??"
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const [editField, setEditField] = useState<"full_name" | "phone" | "organisation_name" | null>(null)
  const [editValue, setEditValue] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => setProfile(d.profile ?? null))
      .catch(() => toast({ title: "Failed to load profile", variant: "destructive" }))
      .finally(() => setLoading(false))
  }, [])

  const startEdit = (field: "full_name" | "phone" | "organisation_name") => {
    setEditField(field)
    setEditValue(profile?.[field] ?? "")
  }

  const cancelEdit = () => {
    setEditField(null)
    setEditValue("")
  }

  const saveEdit = async () => {
    if (!editField) return
    setSaving(true)
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [editField]: editValue }),
      })
      if (!res.ok) throw new Error("Failed to save")
      setProfile((prev) => prev ? { ...prev, [editField]: editValue } : prev)
      toast({ title: "Saved", description: "Profile updated successfully." })
      setEditField(null)
    } catch {
      toast({ title: "Error", description: "Could not save changes.", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const initials = getInitials(profile?.full_name ?? null, profile?.email ?? null)

  const fields: {
    key: "full_name" | "phone" | "organisation_name"
    label: string
    icon: React.ReactNode
    editable: true
    placeholder: string
  }[] = [
    {
      key: "full_name",
      label: "Full name",
      icon: <User className="h-4 w-4" />,
      editable: true,
      placeholder: "Your full name",
    },
    {
      key: "phone",
      label: "Phone number",
      icon: <Phone className="h-4 w-4" />,
      editable: true,
      placeholder: "+1 234 567 8900",
    },
    {
      key: "organisation_name",
      label: "Organisation name",
      icon: <Building2 className="h-4 w-4" />,
      editable: true,
      placeholder: "Your company name",
    },
  ]

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">View and update your account details.</p>
      </div>

      {/* Avatar + name */}
      <div className="flex items-center gap-5">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-lime-500/15 border-2 border-lime-500/30 text-2xl font-bold text-lime-600 dark:text-lime-400 shrink-0 select-none">
          {initials}
        </div>
        <div>
          <p className="text-xl font-semibold">{profile?.full_name ?? "—"}</p>
          <p className="text-sm text-muted-foreground">{profile?.email ?? "—"}</p>
        </div>
      </div>

      <Separator />

      {/* Email — read-only */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
          <Mail className="h-3.5 w-3.5" />
          Email address
        </div>
        <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
          <span className="text-sm font-medium">{profile?.email ?? "—"}</span>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Read-only</span>
        </div>
        <p className="text-xs text-muted-foreground px-1">Email cannot be changed after registration.</p>
      </div>

      {/* Editable fields */}
      {fields.map((field) => {
        const isEditing = editField === field.key
        const value = profile?.[field.key]

        return (
          <div key={field.key} className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {field.icon}
              {field.label}
            </div>

            {isEditing ? (
              <div className="flex items-center gap-2">
                <Input
                  autoFocus
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder={field.placeholder}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEdit()
                    if (e.key === "Escape") cancelEdit()
                  }}
                  className="flex-1"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={saveEdit}
                  disabled={saving}
                  className="h-9 w-9 text-lime-600 hover:text-lime-700 hover:bg-lime-500/10"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={cancelEdit}
                  disabled={saving}
                  className="h-9 w-9 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-lg border px-4 py-3 group hover:border-lime-500/50 transition-colors">
                <span className="text-sm font-medium">
                  {value ? value : <span className="text-muted-foreground italic">Not set</span>}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => startEdit(field.key)}
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        )
      })}

      <Toaster />
    </div>
  )
}
