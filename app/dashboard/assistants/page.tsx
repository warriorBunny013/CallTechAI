"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import {
  Bot, CheckCircle2, Loader2, Mic, Pencil, Play, Plus,
  Square, Trash2, Sparkles, MessageSquare, Volume2, X, Save,
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import Link from "next/link"
import type { VoiceOption, VoiceAgeRange, VoiceGender } from "@/lib/voice-options"

type LanguageFilter = "all" | "en" | "ru" | "en-ru"
type CurrentAssistant = { id: string; name: string; voiceId?: string | null; voiceProvider?: string | null } | null

const GENDER_COLORS: Record<string, string> = {
  female: "bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400",
  male:   "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
}
const AGE_COLORS: Record<string, string> = {
  young:        "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
  "middle-age": "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
}
const LANG_LABEL = (langs: string[]) => {
  if (langs.includes("en") && langs.includes("ru")) return "EN & RU"
  if (langs.includes("ru")) return "Russian"
  return "English"
}

function VoiceCard({
  voice,
  selected,
  playing,
  onSelect,
  onPlay,
  disabled,
}: {
  voice: VoiceOption
  selected: boolean
  playing: boolean
  onSelect: () => void
  onPlay: (e: React.MouseEvent) => void
  disabled?: boolean
}) {
  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-pressed={selected}
      onClick={() => !disabled && onSelect()}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault()
          onSelect()
        }
      }}
      className={`relative flex flex-col gap-3 rounded-2xl border p-4 cursor-pointer select-none transition-all duration-200 group ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      } ${
        selected
          ? "border-[#84CC16] bg-[#84CC16]/10 ring-2 ring-[#84CC16]/25 shadow-lg shadow-[#84CC16]/10"
          : "border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-[#84CC16]/50 hover:bg-[#84CC16]/5 hover:shadow-md"
      }`}
    >
      {selected && (
        <div className="absolute bottom-3 right-3">
          <div className="p-1 rounded-full bg-[#84CC16]">
            <CheckCircle2 className="h-3.5 w-3.5 text-black" />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl transition-all ${
          selected
            ? "bg-[#84CC16] shadow-lg shadow-[#84CC16]/30"
            : voice.gender === "female"
              ? "bg-pink-100 dark:bg-pink-900/30"
              : "bg-blue-100 dark:bg-blue-900/30"
        }`}>
          <Mic className={`h-5 w-5 ${
            selected ? "text-black"
              : voice.gender === "female" ? "text-pink-600 dark:text-pink-400"
              : "text-blue-600 dark:text-blue-400"
          }`} />
        </div>

        <button
          type="button"
          title={playing ? "Stop preview" : "Preview voice"}
          onClick={onPlay}
          className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all ${
            playing
              ? "bg-[#84CC16] text-black shadow-md shadow-[#84CC16]/30"
              : "bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 hover:bg-[#84CC16]/20 hover:text-[#84CC16]"
          }`}
        >
          {playing
            ? <Square className="h-3.5 w-3.5 fill-current" />
            : <Play className="h-3.5 w-3.5 fill-current" />}
        </button>
      </div>

      <div>
        <p className={`font-bold text-sm leading-tight ${selected ? "text-gray-900 dark:text-white" : "text-gray-800 dark:text-gray-200"}`}>
          {voice.name}
        </p>
        {voice.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{voice.description}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-semibold ${GENDER_COLORS[voice.gender] ?? ""}`}>
          {voice.gender.charAt(0).toUpperCase() + voice.gender.slice(1)}
        </span>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-semibold ${AGE_COLORS[voice.ageRange] ?? "bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400"}`}>
          {voice.ageRange === "middle-age" ? "Mid-age" : "Young"}
        </span>
        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400">
          {LANG_LABEL(voice.languages)}
        </span>
      </div>
    </div>
  )
}

// Inline voice picker: filters on the page + full grid below
function VoicePicker({
  voices,
  selectedId,
  onSelect,
  playingId,
  onPlay,
  disabled,
}: {
  voices: VoiceOption[]
  selectedId: string | null
  onSelect: (id: string) => void
  playingId: string | null
  onPlay: (e: React.MouseEvent, v: VoiceOption) => void
  disabled?: boolean
}) {
  const [filterGender, setFilterGender]     = useState<VoiceGender | "all">("all")
  const [filterAge, setFilterAge]           = useState<VoiceAgeRange | "all">("all")
  const [filterLanguage, setFilterLanguage] = useState<LanguageFilter>("all")

  const filtered = voices.filter((v) => {
    if (filterGender !== "all" && v.gender !== filterGender) return false
    if (filterAge !== "all" && v.ageRange !== filterAge) return false
    if (filterLanguage === "en-ru") return v.languages.includes("en") && v.languages.includes("ru")
    if (filterLanguage === "en")    return v.languages.includes("en")
    if (filterLanguage === "ru")    return v.languages.includes("ru")
    return true
  })

  const FILTER_BTN = "px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-all border"
  const active = "bg-[#84CC16] text-black border-[#84CC16] shadow-md shadow-[#84CC16]/20"
  const inactive = "bg-white dark:bg-white/5 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/10 hover:border-[#84CC16]/50 hover:text-gray-900 dark:hover:text-white"

  return (
    <div className="space-y-5">
      {/* ── Inline filters ── */}
      <div className="flex flex-wrap gap-4">
        {/* Gender */}
        <div className="space-y-1.5">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Gender</p>
          <div className="flex gap-1.5">
            {(["all", "female", "male"] as const).map((v) => (
              <button key={v} type="button" onClick={() => setFilterGender(v)}
                className={`${FILTER_BTN} ${filterGender === v ? active : inactive}`}>
                {v === "all" ? "All" : v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Age */}
        <div className="space-y-1.5">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Age</p>
          <div className="flex gap-1.5">
            {([
              { v: "all" as const, label: "All" },
              { v: "young" as const, label: "Young" },
              { v: "middle-age" as const, label: "Mid-age" },
            ]).map(({ v, label }) => (
              <button key={v} type="button" onClick={() => setFilterAge(v)}
                className={`${FILTER_BTN} ${filterAge === v ? active : inactive}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Language */}
        <div className="space-y-1.5">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Language</p>
          <div className="flex gap-1.5">
            {([
              { v: "all" as const, label: "All" },
              { v: "en" as const, label: "English" },
              { v: "ru" as const, label: "Russian" },
              { v: "en-ru" as const, label: "EN & RU" },
            ]).map(({ v, label }) => (
              <button key={v} type="button" onClick={() => setFilterLanguage(v)}
                className={`${FILTER_BTN} ${filterLanguage === v ? active : inactive}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Voice grid ── */}
      {filtered.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">No voices match the selected filters.</p>
          <button
            type="button"
            className="mt-2 text-sm font-semibold text-[#84CC16] hover:underline"
            onClick={() => { setFilterGender("all"); setFilterAge("all"); setFilterLanguage("all") }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((voice) => (
            <VoiceCard
              key={voice.id}
              voice={voice}
              selected={selectedId === voice.id}
              playing={playingId === voice.id}
              onSelect={() => onSelect(voice.id)}
              onPlay={(e) => onPlay(e, voice)}
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function AssistantsPage() {
  // create state
  const [assistantName, setAssistantName]     = useState("")
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null)
  const [creating, setCreating]               = useState(false)

  // data
  const [voices, setVoices]                   = useState<VoiceOption[]>([])
  const [voicesLoading, setVoicesLoading]     = useState(true)
  const [currentAssistant, setCurrentAssistant] = useState<CurrentAssistant>(null)
  const [orgLoading, setOrgLoading]           = useState(true)
  const [userIntents, setUserIntents]         = useState<any[]>([])

  // inline edit state
  const [isEditing, setIsEditing]   = useState(false)
  const [editName, setEditName]     = useState("")
  const [editVoiceId, setEditVoiceId] = useState<string | null>(null)
  const [updating, setUpdating]     = useState(false)

  // delete
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting]     = useState(false)

  // audio
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null)
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => { fetchVoices(); fetchOrganisation(); fetchUserIntents() }, [])

  const fetchVoices = async () => {
    try {
      setVoicesLoading(true)
      const res = await fetch("/api/assistants/voices")
      if (res.ok) { const data = await res.json(); setVoices(data.voices || []) }
    } catch (e) { console.error(e) } finally { setVoicesLoading(false) }
  }

  const fetchOrganisation = async () => {
    try {
      setOrgLoading(true)
      const res = await fetch("/api/assistants/current")
      if (res.ok) {
        const data = await res.json()
        setCurrentAssistant(data.assistant
          ? { id: data.assistant.id, name: data.assistant.name, voiceId: data.assistant.voiceId ?? null, voiceProvider: data.assistant.voiceProvider ?? null }
          : null
        )
      }
    } catch (e) { console.error(e) } finally { setOrgLoading(false) }
  }

  const fetchUserIntents = async () => {
    try {
      const res = await fetch("/api/intents")
      if (res.ok) { const data = await res.json(); setUserIntents(data.intents || []) }
    } catch (e) { console.error(e) }
  }

  const handlePlayPreview = (e: React.MouseEvent, voice: VoiceOption) => {
    e.stopPropagation()
    if (playingVoiceId === voice.id) {
      audioPreviewRef.current?.pause(); audioPreviewRef.current = null; setPlayingVoiceId(null); return
    }
    const audio = new Audio(voice.previewFile)
    audioPreviewRef.current = audio; setPlayingVoiceId(voice.id)
    audio.onended  = () => { audioPreviewRef.current = null; setPlayingVoiceId(null) }
    audio.onerror  = () => {
      audioPreviewRef.current = null; setPlayingVoiceId(null)
      toast({ title: "Preview failed", description: "Audio file not found.", variant: "destructive" })
    }
    audio.play().catch(() => {
      audioPreviewRef.current = null; setPlayingVoiceId(null)
      toast({ title: "Preview failed", description: "Could not play audio.", variant: "destructive" })
    })
  }

  const openEdit = () => {
    setEditName(currentAssistant?.name ?? "")
    setEditVoiceId(currentAssistant?.voiceId ?? null)
    setIsEditing(true)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const cancelEdit = () => { setIsEditing(false); setEditName(""); setEditVoiceId(null) }

  const handleSaveChanges = async () => {
    const name = editName.trim()
    if (!name || !editVoiceId) {
      toast({ title: "Required", description: "Name and voice are required.", variant: "destructive" }); return
    }
    try {
      setUpdating(true)
      const res = await fetch("/api/assistants/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, voiceId: editVoiceId, voiceProvider: "11labs" }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Failed to update")
      setCurrentAssistant((prev) => prev ? { ...prev, name, voiceId: editVoiceId } : null)
      setIsEditing(false)
      toast({ title: "Saved!", description: `${name} has been updated.` })
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed to update.", variant: "destructive" })
    } finally { setUpdating(false) }
  }

  const handleDeleteAssistant = async () => {
    try {
      setDeleting(true)
      const res = await fetch("/api/assistants/delete", { method: "DELETE" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Failed to delete")
      setCurrentAssistant(null); setDeleteOpen(false); setIsEditing(false)
      toast({ title: "Deleted", description: "Your assistant has been removed." })
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed to delete.", variant: "destructive" })
    } finally { setDeleting(false) }
  }

  const handleCreateAssistant = async () => {
    const name = assistantName.trim()
    if (!name) { toast({ title: "Name required", description: "Enter a name.", variant: "destructive" }); return }
    if (!selectedVoiceId) { toast({ title: "Voice required", description: "Select a voice.", variant: "destructive" }); return }
    try {
      setCreating(true)
      const res = await fetch("/api/assistants/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, voiceId: selectedVoiceId, voiceProvider: "11labs" }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Failed to create")
      setCurrentAssistant({ id: data.assistant.id, name: data.assistant.name, voiceId: selectedVoiceId, voiceProvider: "11labs" })
      toast({ title: "Assistant created!", description: `${name} is live and ready.` })
      setAssistantName(""); setSelectedVoiceId(null)
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed to create.", variant: "destructive" })
    } finally { setCreating(false) }
  }

  const isLoading = orgLoading || voicesLoading
  const selectedVoiceName = voices.find((v) => v.id === currentAssistant?.voiceId)?.name

  if (isLoading) {
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
            <span className="text-lg font-semibold text-gray-600 dark:text-gray-400">Loading assistant...</span>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
        * { font-family: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-[#0A0A0A] dark:via-black dark:to-[#0A0A0A] p-4 md:p-6 lg:p-8">
        <div className="max-w-[1600px] mx-auto space-y-6 md:space-y-8">

          {/* ─── HEADER ─── */}
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-white dark:via-gray-100 dark:to-white bg-clip-text text-transparent">
                AI Assistant
              </h1>
              <p className="text-base md:text-lg text-gray-600 dark:text-gray-400 max-w-2xl">
                {!currentAssistant
                  ? "Create your voice assistant — name it, pick a voice, and it will handle inbound calls using your intents."
                  : isEditing
                    ? "Make your changes below and click Save Changes when you're done."
                    : "Your assistant is live. Edit its name or voice, or delete it below."}
              </p>
            </div>

            {/* Action buttons — only shown in view mode when assistant exists */}
            {currentAssistant && !isEditing && (
              <div className="flex items-center gap-2 self-start">
                <Button
                  onClick={openEdit}
                  className="bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 shadow-sm font-semibold rounded-xl"
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setDeleteOpen(true)}
                  className="rounded-xl border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 font-semibold"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            )}
          </div>

          {/* ─── ACTIVE VIEW (read-only) ─── */}
          {currentAssistant && !isEditing && (
            <div className="space-y-6">
              {/* Active assistant card */}
              <div className="p-6 md:p-8 rounded-2xl bg-gradient-to-br from-[#84CC16]/10 via-[#84CC16]/5 to-transparent border border-[#84CC16]/30 dark:border-[#84CC16]/20">
                <div className="flex items-center gap-4">
                  <div className="p-4 rounded-2xl bg-[#84CC16] shadow-lg shadow-[#84CC16]/30">
                    <Bot className="h-7 w-7 text-black" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{currentAssistant.name}</h2>
                      <Badge className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-0 font-semibold">
                        <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse mr-1.5" />
                        Active
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Linked to your phone numbers · {userIntents.length} {userIntents.length === 1 ? "intent" : "intents"} synced
                    </p>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="group p-5 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-[#84CC16]/50 transition-all">
                  <div className="p-2.5 rounded-xl bg-[#84CC16]/10 w-fit mb-3">
                    <MessageSquare className="h-4 w-4 text-[#84CC16]" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{userIntents.length}</div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mt-0.5">Intents synced</p>
                  <Link href="/dashboard/intents" className="text-xs font-semibold text-[#84CC16] hover:text-[#65A30D] mt-2 inline-block">
                    Manage intents →
                  </Link>
                </div>
                <div className="group p-5 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-[#84CC16]/50 transition-all">
                  <div className="p-2.5 rounded-xl bg-blue-500/10 w-fit mb-3">
                    <Volume2 className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{selectedVoiceName ?? "—"}</div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mt-0.5">Current voice</p>
                </div>
              </div>

              {userIntents.length === 0 && (
                <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-500/20 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10 shrink-0">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                  </div>
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    <span className="font-semibold">No intents yet.</span>{" "}
                    <Link href="/dashboard/intents" className="font-bold underline">Add intents →</Link>{" "}
                    so your assistant can answer callers correctly.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ─── INLINE EDIT FORM ─── */}
          {currentAssistant && isEditing && (
            <div className="space-y-6">
              {/* Name */}
              <div className="p-6 md:p-8 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#84CC16] text-black text-sm font-bold shrink-0">1</div>
                  <Label htmlFor="edit-name" className="font-bold text-gray-900 dark:text-white text-base">
                    Assistant name
                  </Label>
                </div>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Name your assistant"
                  disabled={updating}
                  className="max-w-sm rounded-xl border-gray-200 dark:border-white/10 focus:border-[#84CC16] focus:ring-[#84CC16]/20 bg-gray-50 dark:bg-white/5 h-11 text-base"
                />
                {editName && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Callers will hear: <span className="italic font-semibold text-gray-700 dark:text-gray-300">&quot;Hi there, this is {editName}. How can I help you today?&quot;</span>
                  </p>
                )}
              </div>

              {/* Voice picker */}
              <div className="p-6 md:p-8 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 space-y-5">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#84CC16] text-black text-sm font-bold shrink-0">2</div>
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">Choose a voice</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Filter below, then click a card to select. Hit ▶ to preview.</p>
                    </div>
                  </div>
                  {editVoiceId && (
                    <Badge className="bg-[#84CC16]/10 text-[#84CC16] border border-[#84CC16]/20 font-semibold">
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                      {voices.find((v) => v.id === editVoiceId)?.name} selected
                    </Badge>
                  )}
                </div>
                <VoicePicker
                  voices={voices}
                  selectedId={editVoiceId}
                  onSelect={setEditVoiceId}
                  playingId={playingVoiceId}
                  onPlay={handlePlayPreview}
                  disabled={updating}
                />
              </div>

              {/* Save / Cancel */}
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleSaveChanges}
                  disabled={updating || !editName.trim() || !editVoiceId}
                  className="bg-[#84CC16] hover:bg-[#65A30D] text-black font-bold h-12 px-8 rounded-xl shadow-lg shadow-[#84CC16]/25 hover:shadow-[#84CC16]/40 transition-all text-base"
                >
                  {updating
                    ? <><Loader2 className="h-5 w-5 animate-spin mr-2" />Saving...</>
                    : <><Save className="h-5 w-5 mr-2" />Save Changes</>}
                </Button>
                <Button
                  variant="outline"
                  onClick={cancelEdit}
                  disabled={updating}
                  className="h-12 px-6 rounded-xl border-gray-200 dark:border-white/10 font-semibold text-base"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* ─── CREATE FORM (no assistant yet) ─── */}
          {!currentAssistant && (
            <div className="space-y-6">
              {/* Step 1 — Name */}
              <div className="p-6 md:p-8 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#84CC16] text-black text-sm font-bold shrink-0">1</div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">Name your assistant</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">This is the name callers will hear when your assistant picks up.</p>
                  </div>
                </div>
                <Input
                  placeholder="Name your assistant"
                  value={assistantName}
                  onChange={(e) => setAssistantName(e.target.value)}
                  disabled={creating}
                  className="max-w-sm rounded-xl border-gray-200 dark:border-white/10 focus:border-[#84CC16] focus:ring-[#84CC16]/20 bg-gray-50 dark:bg-white/5 h-11 text-base"
                />
                {assistantName && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Callers will hear: <span className="italic font-semibold text-gray-700 dark:text-gray-300">&quot;Hi there, this is {assistantName}. How can I help you today?&quot;</span>
                  </p>
                )}
              </div>

              {/* Step 2 — Voice */}
              <div className="p-6 md:p-8 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 space-y-5">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#84CC16] text-black text-sm font-bold shrink-0">2</div>
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">Pick a voice</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Filter below, then click a card to select. Hit ▶ to preview.</p>
                    </div>
                  </div>
                  {selectedVoiceId && (
                    <Badge className="bg-[#84CC16]/10 text-[#84CC16] border border-[#84CC16]/20 font-semibold">
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                      {voices.find((v) => v.id === selectedVoiceId)?.name} selected
                    </Badge>
                  )}
                </div>

                {voicesLoading ? (
                  <div className="flex items-center gap-3 py-8">
                    <div className="p-2.5 rounded-xl bg-[#84CC16]/10">
                      <Loader2 className="h-5 w-5 animate-spin text-[#84CC16]" />
                    </div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Loading voices...</span>
                  </div>
                ) : (
                  <VoicePicker
                    voices={voices}
                    selectedId={selectedVoiceId}
                    onSelect={setSelectedVoiceId}
                    playingId={playingVoiceId}
                    onPlay={handlePlayPreview}
                    disabled={creating}
                  />
                )}
              </div>

              {/* Create button */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <Button
                  onClick={handleCreateAssistant}
                  disabled={creating || !assistantName.trim() || !selectedVoiceId}
                  className="bg-[#84CC16] hover:bg-[#65A30D] text-black font-bold h-12 px-8 rounded-xl shadow-lg shadow-[#84CC16]/25 hover:shadow-[#84CC16]/40 transition-all text-base"
                >
                  {creating
                    ? <><Loader2 className="h-5 w-5 animate-spin mr-2" />Creating...</>
                    : <><Plus className="h-5 w-5 mr-2" />Create Assistant</>}
                </Button>
                {(!assistantName.trim() || !selectedVoiceId) && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {!assistantName.trim() && !selectedVoiceId
                      ? "Enter a name and select a voice to continue"
                      : !assistantName.trim() ? "Enter a name to continue"
                      : "Select a voice to continue"}
                  </p>
                )}
              </div>

              {userIntents.length === 0 && (
                <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-500/20 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10 shrink-0">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                  </div>
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    <span className="font-semibold">Tip:</span> Add{" "}
                    <Link href="/dashboard/intents" className="font-bold underline">intents</Link>{" "}
                    (hours, services, FAQs) before creating so your assistant answers callers correctly.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── DELETE CONFIRMATION ─── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="rounded-2xl border-gray-200 dark:border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">Delete assistant?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-400">
              This will remove <span className="font-semibold text-gray-900 dark:text-white">{currentAssistant?.name}</span> from your phone numbers and delete it from VAPI. You can create a new one anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} className="rounded-xl border-gray-200 dark:border-white/10 font-semibold">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDeleteAssistant() }}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold"
            >
              {deleting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Deleting...</> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Toaster />
    </>
  )
}
