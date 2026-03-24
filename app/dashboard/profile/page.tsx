"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
      <>
        <style jsx global>{`
          @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
          * { font-family: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        `}</style>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-[#0A0A0A] dark:via-black dark:to-[#0A0A0A] flex items-center justify-center">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-[#84CC16]/10">
              <Loader2 className="h-6 w-6 animate-spin text-[#84CC16]" />
            </div>
            <span className="text-lg font-semibold text-gray-600 dark:text-gray-400">Loading profile...</span>
          </div>
        </div>
      </>
    )
  }

  const initials = getInitials(profile?.full_name ?? null, profile?.email ?? null)

  const fields: {
    key: "full_name" | "phone" | "organisation_name"
    label: string
    icon: React.ElementType
    placeholder: string
  }[] = [
    { key: "full_name", label: "Full name", icon: User, placeholder: "Your full name" },
    { key: "phone", label: "Phone number", icon: Phone, placeholder: "+1 234 567 8900" },
    { key: "organisation_name", label: "Organisation name", icon: Building2, placeholder: "Your company name" },
  ]

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
        * { font-family: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-[#0A0A0A] dark:via-black dark:to-[#0A0A0A] p-4 md:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto space-y-6 md:space-y-8">

          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-white dark:via-gray-100 dark:to-white bg-clip-text text-transparent">
              Profile
            </h1>
            <p className="text-base md:text-lg text-gray-600 dark:text-gray-400">
              View and update your account details.
            </p>
          </div>

          {/* Avatar + name card */}
          <div className="p-6 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10">
            <div className="flex items-center gap-5">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#84CC16]/20 to-[#84CC16]/5 border-2 border-[#84CC16]/30 text-2xl font-bold text-[#84CC16] shrink-0 select-none shadow-lg shadow-[#84CC16]/10">
                {initials}
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{profile?.full_name ?? "—"}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{profile?.email ?? "—"}</p>
              </div>
            </div>
          </div>

          {/* Email — read-only */}
          <div className="p-6 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-lg bg-gray-100 dark:bg-white/10">
                <Mail className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">Email address</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{profile?.email ?? "—"}</span>
              <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-white/10 px-2.5 py-1 rounded-lg font-medium">Read-only</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2 px-1">Email cannot be changed after registration.</p>
          </div>

          {/* Editable fields */}
          <div className="space-y-4">
            {fields.map((field) => {
              const isEditing = editField === field.key
              const value = profile?.[field.key]
              const Icon = field.icon

              return (
                <div key={field.key} className="p-6 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-[#84CC16]/30 transition-all group">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 rounded-lg bg-gray-100 dark:bg-white/10">
                      <Icon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">{field.label}</span>
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
                        className="flex-1 rounded-xl border-gray-200 dark:border-white/10 focus:border-[#84CC16] bg-gray-50 dark:bg-white/5"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={saveEdit}
                        disabled={saving}
                        className="h-10 w-10 rounded-xl bg-[#84CC16]/10 text-[#84CC16] hover:bg-[#84CC16]/20 shrink-0"
                      >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={cancelEdit}
                        disabled={saving}
                        className="h-10 w-10 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {value ? value : <span className="text-gray-400 dark:text-gray-600 italic font-normal">Not set</span>}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => startEdit(field.key)}
                        className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#84CC16]/10 text-gray-400 hover:text-[#84CC16]"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <Toaster />
    </>
  )
}
