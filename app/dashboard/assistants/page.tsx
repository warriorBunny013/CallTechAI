"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
  Bot, Calendar, Car, CheckCircle2, ChevronLeft, ChevronRight, HeartPulse,
  Loader2, Mic, Pencil, Play, Plus, Square, Trash2, Sparkles, MessageSquare,
  Volume2, X, Save, Utensils,
} from "lucide-react"
import { formatLanguagesLabel, getVoicePreviewSource } from "@/lib/voice-library"
import { CreateAssistantWizard } from "@/components/dashboard/create-assistant-wizard"
import { LanguageMultiSelect } from "@/components/dashboard/language-multi-select"

const VOICE_LABELS_KEY = "calltech_voice_display_names"

type AssistantTemplateMeta = {
  id: string
  name: string
  description: string
  icon: string
  highlights: string[]
  suggestedLanguages?: string[]
  defaultSystemPrompt: string
  defaultFirstMessage: string
}

const TEMPLATE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  calendar: Calendar,
  car: Car,
  utensils: Utensils,
  "heart-pulse": HeartPulse,
}

function loadVoiceLabels(): Record<string, string> {
  if (typeof window === "undefined") return {}
  try {
    return JSON.parse(localStorage.getItem(VOICE_LABELS_KEY) ?? "{}") as Record<string, string>
  } catch {
    return {}
  }
}
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import Link from "next/link"
import type { VoiceOption, VoiceAgeRange, VoiceGender } from "@/lib/voice-options"

type AssistantListItem = {
  id: string
  elevenlabsAgentId: string
  name: string
  voiceId?: string | null
  templateId?: string | null
  languages: string[]
  systemPrompt?: string | null
  firstMessage?: string | null
  isDefault: boolean
}
type PageView = "list" | "create" | "edit"

const GENDER_COLORS: Record<string, string> = {
  female: "bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400",
  male:   "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
}
const AGE_COLORS: Record<string, string> = {
  young:        "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
  "middle-age": "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
}
const LANG_LABEL = formatLanguagesLabel

function VoiceCard({
  voice,
  displayName,
  selected,
  playing,
  onSelect,
  onPlay,
  onRename,
  disabled,
}: {
  voice: VoiceOption
  displayName?: string
  selected: boolean
  playing: boolean
  onSelect: () => void
  onPlay: (e: React.MouseEvent) => void
  onRename?: (name: string) => void
  disabled?: boolean
}) {
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState(displayName ?? voice.name)
  const label = displayName ?? voice.name

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-pressed={selected}
      onClick={() => !disabled && !editingName && onSelect()}
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
        {editingName && onRename ? (
          <Input
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={() => {
              onRename(nameDraft.trim() || voice.name)
              setEditingName(false)
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onRename(nameDraft.trim() || voice.name)
                setEditingName(false)
              }
            }}
            className="h-8 text-sm"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <p className={`font-bold text-sm leading-tight flex-1 ${selected ? "text-gray-900 dark:text-white" : "text-gray-800 dark:text-gray-200"}`}>
              {label}
            </p>
            {onRename && (
              <button type="button" className="text-gray-400 hover:text-[#84CC16]" onClick={() => setEditingName(true)}>
                <Pencil className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
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
  voiceLabels,
  onRenameVoice,
  disabled,
}: {
  voices: VoiceOption[]
  selectedId: string | null
  onSelect: (id: string) => void
  playingId: string | null
  onPlay: (e: React.MouseEvent, v: VoiceOption) => void
  voiceLabels?: Record<string, string>
  onRenameVoice?: (voiceId: string, name: string) => void
  disabled?: boolean
}) {
  const [filterGender, setFilterGender]     = useState<VoiceGender | "all">("all")
  const [filterAge, setFilterAge]           = useState<VoiceAgeRange | "all">("all")
  const filtered = voices.filter((v) => {
    if (filterGender !== "all" && v.gender !== filterGender) return false
    if (filterAge !== "all" && v.ageRange !== filterAge) return false
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

      </div>

      {/* ── Voice grid ── */}
      {filtered.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">No voices match the selected filters.</p>
          <button
            type="button"
            className="mt-2 text-sm font-semibold text-[#84CC16] hover:underline"
            onClick={() => { setFilterGender("all"); setFilterAge("all") }}
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
              displayName={voiceLabels?.[voice.id] ?? voice.name}
              selected={selectedId === voice.id}
              playing={playingId === voice.id}
              onSelect={() => onSelect(voice.id)}
              onPlay={(e) => onPlay(e, voice)}
              onRename={onRenameVoice ? (n) => onRenameVoice(voice.id, n) : undefined}
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function AssistantsPage() {
  const [pageView, setPageView] = useState<PageView>("list")
  const [templates, setTemplates] = useState<AssistantTemplateMeta[]>([])
  const [voiceLabels, setVoiceLabels] = useState<Record<string, string>>({})
  const [creating, setCreating] = useState(false)

  const [voices, setVoices] = useState<VoiceOption[]>([])
  const [voicesLoading, setVoicesLoading] = useState(true)
  const [assistants, setAssistants] = useState<AssistantListItem[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [userIntents, setUserIntents] = useState<any[]>([])

  const [editingAssistant, setEditingAssistant] = useState<AssistantListItem | null>(null)
  const [editName, setEditName] = useState("")
  const [editVoiceId, setEditVoiceId] = useState<string | null>(null)
  const [editLanguages, setEditLanguages] = useState<string[]>(["en"])
  const [editSystemPrompt, setEditSystemPrompt] = useState("")
  const [editFirstMessage, setEditFirstMessage] = useState("")
  const [updating, setUpdating] = useState(false)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingAssistant, setDeletingAssistant] = useState<AssistantListItem | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [wizardKey, setWizardKey] = useState(0)

  // audio
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null)
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    fetchVoices()
    fetchAssistants()
    fetchUserIntents()
    fetchTemplates()
    setVoiceLabels(loadVoiceLabels())
  }, [])

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/assistants/templates")
      if (res.ok) {
        const data = await res.json()
        setTemplates(data.templates ?? [])
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleRenameVoice = (voiceId: string, name: string) => {
    setVoiceLabels((prev) => {
      const next = { ...prev, [voiceId]: name }
      localStorage.setItem(VOICE_LABELS_KEY, JSON.stringify(next))
      return next
    })
  }

  const fetchVoices = async () => {
    try {
      setVoicesLoading(true)
      const res = await fetch("/api/assistants/voices")
      if (res.ok) { const data = await res.json(); setVoices(data.voices || []) }
    } catch (e) { console.error(e) } finally { setVoicesLoading(false) }
  }

  const fetchAssistants = async () => {
    try {
      setListLoading(true)
      const res = await fetch("/api/assistants/list")
      if (res.ok) {
        const data = await res.json()
        setAssistants(data.assistants ?? [])
        if ((data.assistants ?? []).length === 0) {
          setPageView("create")
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setListLoading(false)
    }
  }

  const templateName = (templateId: string | null | undefined) =>
    templates.find((t) => t.id === templateId)?.name ?? "Custom"

  const voiceName = (voiceId: string | null | undefined) =>
    voices.find((v) => v.id === voiceId)?.name ?? voiceLabels[voiceId ?? ""] ?? "—"

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
    const src = getVoicePreviewSource(voice)
    if (!src) {
      toast({
        title: "Preview unavailable",
        description: "No preview sample for this voice.",
        variant: "destructive",
      })
      return
    }
    const audio = new Audio(src)
    audioPreviewRef.current = audio; setPlayingVoiceId(voice.id)
    audio.onended  = () => { audioPreviewRef.current = null; setPlayingVoiceId(null) }
    audio.onerror  = () => {
      audioPreviewRef.current = null; setPlayingVoiceId(null)
      toast({ title: "Preview failed", description: "Could not load voice sample.", variant: "destructive" })
    }
    audio.play().catch(() => {
      audioPreviewRef.current = null; setPlayingVoiceId(null)
      toast({ title: "Preview failed", description: "Could not play audio.", variant: "destructive" })
    })
  }

  const openEdit = (assistant: AssistantListItem) => {
    const template = templates.find((t) => t.id === assistant.templateId)
    setEditingAssistant(assistant)
    setEditName(assistant.name)
    setEditVoiceId(assistant.voiceId ?? null)
    setEditLanguages(assistant.languages?.length ? assistant.languages : ["en"])
    setEditSystemPrompt(assistant.systemPrompt?.trim() || template?.defaultSystemPrompt || "")
    setEditFirstMessage(assistant.firstMessage?.trim() || template?.defaultFirstMessage || "")
    setPageView("edit")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const cancelEdit = () => {
    setEditingAssistant(null)
    setEditName("")
    setEditVoiceId(null)
    setEditLanguages(["en"])
    setEditSystemPrompt("")
    setEditFirstMessage("")
    setPageView("list")
  }

  const handleSaveChanges = async () => {
    const name = editName.trim()
    if (!name || !editVoiceId || editLanguages.length === 0 || !editSystemPrompt.trim()) {
      toast({
        title: "Required",
        description: "Name, voice, at least one language, and system prompt are required.",
        variant: "destructive",
      })
      return
    }
    try {
      setUpdating(true)
      const res = await fetch("/api/assistants/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingAssistant?.id,
          name,
          voiceId: editVoiceId,
          languages: editLanguages,
          systemPrompt: editSystemPrompt.trim(),
          firstMessage: editFirstMessage.trim(),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Failed to update")
      await fetchAssistants()
      cancelEdit()
      toast({ title: "Saved!", description: `${name} has been updated.` })
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed to update.", variant: "destructive" })
    } finally { setUpdating(false) }
  }

  const handleDeleteAssistant = async () => {
    if (!deletingAssistant) return
    try {
      setDeleting(true)
      const res = await fetch(
        `/api/assistants/delete?id=${encodeURIComponent(deletingAssistant.id)}`,
        { method: "DELETE" }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Failed to delete")
      setDeleteOpen(false)
      setDeletingAssistant(null)
      if (editingAssistant?.id === deletingAssistant.id) cancelEdit()
      await fetchAssistants()
      toast({ title: "Deleted", description: "Assistant removed." })
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed to delete.", variant: "destructive" })
    } finally { setDeleting(false) }
  }

  const handleCreateAssistant = async (payload: {
    name: string
    voiceId: string
    templateId: string
    languages: string[]
    systemPrompt: string
    firstMessage: string
  }) => {
    try {
      setCreating(true)
      const res = await fetch("/api/assistants/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: payload.name,
          voiceId: payload.voiceId,
          templateId: payload.templateId,
          languages: payload.languages,
          systemPrompt: payload.systemPrompt,
          firstMessage: payload.firstMessage,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Failed to create")
      await fetchAssistants()
      setPageView("list")
      setWizardKey((k) => k + 1)
      toast({ title: "Assistant created!", description: `${payload.name} is live and ready.` })
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed to create.", variant: "destructive" })
    } finally {
      setCreating(false)
    }
  }

  const isLoading = listLoading || voicesLoading

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
            <span className="text-lg font-semibold text-gray-600 dark:text-gray-400">Loading assistants...</span>
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
                AI Assistants
              </h1>
              <p className="text-base md:text-lg text-gray-600 dark:text-gray-400 max-w-2xl">
                {pageView === "create"
                  ? "Add a new assistant — pick a template, voice, and prompts."
                  : pageView === "edit"
                    ? "Update name, languages, voice, first message, and system prompt, then save."
                    : "Manage voice assistants for your organisation. The primary assistant handles inbound calls by default."}
              </p>
            </div>

            {pageView === "edit" && (
              <Button
                variant="outline"
                onClick={cancelEdit}
                className="self-start rounded-xl font-semibold"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back to list
              </Button>
            )}
            {pageView === "create" && assistants.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setPageView("list")}
                className="self-start rounded-xl font-semibold"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back to list
              </Button>
            )}
          </div>

          {pageView === "list" && assistants.length > 0 && (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 md:p-5 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Your assistants</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {assistants.length} {assistants.length === 1 ? "assistant" : "assistants"} · Primary handles inbound calls
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setWizardKey((k) => k + 1)
                    setPageView("create")
                    window.scrollTo({ top: 0, behavior: "smooth" })
                  }}
                  className="bg-[#84CC16] hover:bg-[#65A30D] text-black font-bold rounded-xl shadow-lg shadow-[#84CC16]/25 h-11 px-5 shrink-0"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add assistants
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {assistants.map((assistant) => {
                  const Icon =
                    TEMPLATE_ICONS[
                      templates.find((t) => t.id === assistant.templateId)?.icon ?? "calendar"
                    ] ?? Bot
                  return (
                    <div
                      key={assistant.id}
                      className="p-5 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-[#84CC16]/40 transition-all flex flex-col gap-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-3 rounded-xl bg-[#84CC16]/15 shrink-0">
                          <Icon className="h-6 w-6 text-[#84CC16]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                              {assistant.name}
                            </h2>
                            {assistant.isDefault && (
                              <Badge className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-0 text-[10px] font-semibold">
                                Primary
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{templateName(assistant.templateId)}</p>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <p>
                          <span className="font-medium text-gray-700 dark:text-gray-300">Voice:</span>{" "}
                          {voiceName(assistant.voiceId)}
                        </p>
                        <p>
                          <span className="font-medium text-gray-700 dark:text-gray-300">Languages:</span>{" "}
                          {LANG_LABEL(assistant.languages)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-auto pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEdit(assistant)}
                          className="rounded-lg font-semibold flex-1"
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1.5" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setDeletingAssistant(assistant)
                            setDeleteOpen(true)
                          }}
                          className="rounded-lg border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {userIntents.length === 0 && (
                <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-500/20 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10 shrink-0">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                  </div>
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    <span className="font-semibold">No intents yet.</span>{" "}
                    <Link href="/dashboard/intents" className="font-bold underline">Add intents →</Link>{" "}
                    so assistants can answer callers correctly.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ─── INLINE EDIT FORM ─── */}
          {pageView === "edit" && editingAssistant && (
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

              {/* Languages */}
              <div className="p-6 md:p-8 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#84CC16] text-black text-sm font-bold shrink-0">2</div>
                  <Label className="font-bold text-gray-900 dark:text-white text-base">Languages</Label>
                </div>
                <LanguageMultiSelect
                  value={editLanguages}
                  onChange={setEditLanguages}
                  disabled={updating}
                />
              </div>

              {/* Voice picker */}
              <div className="p-6 md:p-8 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 space-y-5">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#84CC16] text-black text-sm font-bold shrink-0">3</div>
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

              {/* Prompts */}
              <div className="p-6 md:p-8 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#84CC16] text-black text-sm font-bold shrink-0">4</div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">Conversation prompts</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      First message and system prompt sent to ElevenLabs. Intents from your dashboard are merged into the system prompt on save.
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-first-message">First message</Label>
                  <Textarea
                    id="edit-first-message"
                    value={editFirstMessage}
                    onChange={(e) => setEditFirstMessage(e.target.value)}
                    rows={3}
                    disabled={updating}
                    className="rounded-xl border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5"
                  />
                  <p className="text-xs text-gray-500">
                    Placeholders: {"{{org_name}}"}, {"{{agent_name}}"} — replaced per call.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-system-prompt">System prompt</Label>
                  <Textarea
                    id="edit-system-prompt"
                    value={editSystemPrompt}
                    onChange={(e) => setEditSystemPrompt(e.target.value)}
                    rows={12}
                    disabled={updating}
                    className="rounded-xl border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 font-mono text-sm"
                  />
                </div>
              </div>

              {/* Save / Cancel */}
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleSaveChanges}
                  disabled={
                    updating ||
                    !editName.trim() ||
                    !editVoiceId ||
                    editLanguages.length === 0 ||
                    !editSystemPrompt.trim()
                  }
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

          {/* ─── CREATE WIZARD (no assistant yet) ─── */}
          {(pageView === "create" || assistants.length === 0) && (
            <>
              <CreateAssistantWizard
                key={wizardKey}
                templates={templates}
                voices={voices}
                voicesLoading={voicesLoading}
                voiceLabels={voiceLabels}
                onRenameVoice={handleRenameVoice}
                playingVoiceId={playingVoiceId}
                onPlayPreview={handlePlayPreview}
                creating={creating}
                onCancel={
                  assistants.length > 0
                    ? () => {
                        setPageView("list")
                        setWizardKey((k) => k + 1)
                      }
                    : undefined
                }
                onCreate={handleCreateAssistant}
              />
              {userIntents.length === 0 && (
                <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-500/20 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10 shrink-0">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                  </div>
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    <span className="font-semibold">Tip:</span> Add{" "}
                    <Link href="/dashboard/intents" className="font-bold underline">intents & knowledge</Link>{" "}
                    before creating so your assistant answers callers correctly.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ─── DELETE CONFIRMATION ─── */}
      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open)
          if (!open) setDeletingAssistant(null)
        }}
      >
        <AlertDialogContent className="rounded-2xl border-gray-200 dark:border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">Delete assistant?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-400">
              This will permanently delete <span className="font-semibold text-gray-900 dark:text-white">{deletingAssistant?.name}</span> from ElevenLabs. You can create a new assistant anytime.
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
