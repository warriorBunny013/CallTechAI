"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Bot, CheckCircle2, Loader2, Mic, Pencil, Play, Plus, Square, Trash2, Filter } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import type { VoiceOption, VoiceAgeRange, VoiceGender } from "@/lib/voice-options"

type LanguageFilter = "all" | "en" | "ru" | "en-ru"

type CurrentAssistant = { id: string; name: string; voiceId?: string | null; voiceProvider?: string | null } | null

export default function AssistantsPage() {
  const [assistantName, setAssistantName] = useState("")
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null)
  const [voices, setVoices] = useState<VoiceOption[]>([])
  const [voicesLoading, setVoicesLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [currentAssistant, setCurrentAssistant] = useState<CurrentAssistant>(null)
  const [orgLoading, setOrgLoading] = useState(true)
  const [userIntents, setUserIntents] = useState<any[]>([])
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState("")
  const [editVoiceId, setEditVoiceId] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [filterAge, setFilterAge] = useState<VoiceAgeRange | "all">("all")
  const [filterGender, setFilterGender] = useState<VoiceGender | "all">("all")
  const [filterLanguage, setFilterLanguage] = useState<LanguageFilter>("all")
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null)

  const filteredVoices = voices.filter((v) => {
    if (filterAge !== "all" && v.ageRange !== filterAge) return false
    if (filterGender !== "all" && v.gender !== filterGender) return false
    if (filterLanguage !== "all") {
      if (filterLanguage === "en-ru") {
        if (!(v.languages.includes("en") && v.languages.includes("ru"))) return false
      } else if (filterLanguage === "en") {
        if (!v.languages.includes("en")) return false
      } else if (filterLanguage === "ru") {
        if (!v.languages.includes("ru")) return false
      }
    }
    return true
  })

  useEffect(() => {
    fetchVoices()
    fetchOrganisation()
    fetchUserIntents()
  }, [])

  const fetchVoices = async () => {
    try {
      setVoicesLoading(true)
      const res = await fetch("/api/assistants/voices")
      if (res.ok) {
        const data = await res.json()
        setVoices(data.voices || [])
      }
    } catch (e) {
      console.error("Error fetching voices:", e)
    } finally {
      setVoicesLoading(false)
    }
  }

  const fetchOrganisation = async () => {
    try {
      setOrgLoading(true)
      const res = await fetch("/api/assistants/current")
      if (res.ok) {
        const data = await res.json()
        if (data.assistant) {
          setCurrentAssistant({
            id: data.assistant.id,
            name: data.assistant.name,
            voiceId: data.assistant.voiceId ?? null,
            voiceProvider: data.assistant.voiceProvider ?? null,
          })
        } else {
          setCurrentAssistant(null)
        }
      }
    } catch (e) {
      console.error("Error fetching organisation:", e)
    } finally {
      setOrgLoading(false)
    }
  }

  const handlePlayPreview = (e: React.MouseEvent, voice: VoiceOption) => {
    e.stopPropagation()
    if (playingVoiceId === voice.id) {
      audioPreviewRef.current?.pause()
      audioPreviewRef.current = null
      setPlayingVoiceId(null)
      return
    }
    const audio = new Audio(voice.previewFile)
    audioPreviewRef.current = audio
    setPlayingVoiceId(voice.id)
    audio.onended = () => {
      audioPreviewRef.current = null
      setPlayingVoiceId(null)
    }
    audio.onerror = () => {
      audioPreviewRef.current = null
      setPlayingVoiceId(null)
      toast({
        title: "Preview failed",
        description: "Audio file not found. Ensure voice previews are in public/voice-previews/.",
        variant: "destructive",
      })
    }
    audio.play().catch(() => {
      audioPreviewRef.current = null
      setPlayingVoiceId(null)
      toast({
        title: "Preview failed",
        description: "Could not play audio.",
        variant: "destructive",
      })
    })
  }

  const openEditDialog = () => {
    if (currentAssistant) {
      setEditName(currentAssistant.name)
      setEditVoiceId(currentAssistant.voiceId ?? null)
      setEditOpen(true)
    }
  }

  const handleUpdateAssistant = async () => {
    const name = editName.trim()
    if (!name || !editVoiceId) {
      toast({
        title: "Invalid input",
        description: "Name and voice are required.",
        variant: "destructive",
      })
      return
    }
    try {
      setUpdating(true)
      const res = await fetch("/api/assistants/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, voiceId: editVoiceId, voiceProvider: "11labs" }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Failed to update assistant")
      setCurrentAssistant((prev) => prev ? { ...prev, name, voiceId: editVoiceId } : null)
      setEditOpen(false)
      toast({ title: "Assistant updated", description: `${name} has been updated successfully.` })
    } catch (e: unknown) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to update assistant.",
        variant: "destructive",
      })
    } finally {
      setUpdating(false)
    }
  }

  const handleDeleteAssistant = async () => {
    try {
      setDeleting(true)
      const res = await fetch("/api/assistants/delete", { method: "DELETE" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Failed to delete assistant")
      setCurrentAssistant(null)
      setDeleteOpen(false)
      toast({ title: "Assistant deleted", description: "Your assistant has been removed." })
    } catch (e: unknown) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to delete assistant.",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
    }
  }

  const fetchUserIntents = async () => {
    try {
      const res = await fetch("/api/intents")
      if (res.ok) {
        const data = await res.json()
        setUserIntents(data.intents || [])
      }
    } catch (e) {
      console.error("Error fetching intents:", e)
    }
  }

  const handleCreateAssistant = async () => {
    const name = assistantName.trim()
    if (!name) {
      toast({
        title: "Name required",
        description: "Please enter a name for your assistant.",
        variant: "destructive",
      })
      return
    }
    if (!selectedVoiceId) {
      toast({
        title: "Voice required",
        description: "Please select a voice for your assistant.",
        variant: "destructive",
      })
      return
    }

    try {
      setCreating(true)
      const res = await fetch("/api/assistants/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          voiceId: selectedVoiceId,
          voiceProvider: "11labs",
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Failed to create assistant")
      }

      setCurrentAssistant({ id: data.assistant.id, name: data.assistant.name, voiceId: selectedVoiceId, voiceProvider: "11labs" })
      toast({
        title: "Assistant created",
        description: `${name} has been created and linked to your phone numbers. It will appear in your VAPI dashboard.`,
      })
      setAssistantName("")
      setSelectedVoiceId(null)
    } catch (e: unknown) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to create assistant.",
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <Toaster />

      <div>
        <h1 className="text-3xl font-bold">Create Assistant</h1>
        <p className="text-muted-foreground mt-2">
          Create a custom voice assistant for your organisation. Name it, choose a voice, and your dashboard intents will be added to its system prompt.
        </p>
      </div>

      <Card className="border-lime-500/30 bg-lime-500/5 dark:bg-lime-500/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-lime-500" />
            Create your assistant
          </CardTitle>
          <CardDescription>
            Your assistant will use the intents saved in the dashboard. Add or edit intents anytime—the system prompt will update automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="assistant-name">Assistant name</Label>
            <Input
              id="assistant-name"
              placeholder="e.g. Taylor, Sarah, Alex"
              value={assistantName}
              onChange={(e) => setAssistantName(e.target.value)}
              disabled={creating}
              className="max-w-sm"
            />
          </div>

          <div className="space-y-2">
            <Label>Voice configuration</Label>
            <p className="text-sm text-muted-foreground">
              Select a voice from the 11labs provider. Your assistant will greet callers with: &quot;Hi there, this is {assistantName || "[name]"}. How can I help you today?&quot;
            </p>
            {voicesLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading voices...
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <select
                    value={filterLanguage}
                    onChange={(e) => setFilterLanguage(e.target.value as LanguageFilter)}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="all">All languages</option>
                    <option value="en">English</option>
                    <option value="ru">Russian</option>
                    <option value="en-ru">English & Russian</option>
                  </select>
                  <select
                    value={filterAge}
                    onChange={(e) => setFilterAge(e.target.value as VoiceAgeRange | "all")}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="all">All ages</option>
                    <option value="young">Young</option>
                    <option value="middle-age">Middle-age</option>
                  </select>
                  <select
                    value={filterGender}
                    onChange={(e) => setFilterGender(e.target.value as VoiceGender | "all")}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="all">All genders</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                  </select>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredVoices.map((voice) => (
                  <button
                    key={voice.id}
                    type="button"
                    onClick={() => setSelectedVoiceId(voice.id)}
                    disabled={creating}
                    className={`flex items-center gap-3 rounded-lg border p-4 text-left transition-colors ${
                      selectedVoiceId === voice.id
                        ? "border-lime-500 bg-lime-500/10 ring-2 ring-lime-500"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                      <Mic className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{voice.name}</div>
                      <div className="text-xs text-muted-foreground capitalize">
                        {voice.languages.length === 2
                          ? "English & Russian"
                          : voice.languages[0] === "en"
                            ? "English"
                            : "Russian"}
                        {" · "}
                        {voice.gender} · {voice.ageRange.replace("-", " ")}
                      </div>
                      {voice.description && (
                        <div className="text-xs text-muted-foreground mt-0.5">{voice.description}</div>
                      )}
                      {selectedVoiceId === voice.id && (
                        <CheckCircle2 className="mt-1 h-4 w-4 text-lime-500" />
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      title={playingVoiceId === voice.id ? "Stop" : "Preview voice"}
                      onClick={(e) => handlePlayPreview(e, voice)}
                    >
                      {playingVoiceId === voice.id ? (
                        <Square className="h-4 w-4 fill-current" />
                      ) : (
                        <Play className="h-4 w-4 fill-current" />
                      )}
                    </Button>
                  </button>
                ))}
              </div>
              </>
            )}
          </div>

          <Button
            onClick={handleCreateAssistant}
            disabled={creating || !assistantName.trim() || !selectedVoiceId}
            className="bg-lime-500 hover:bg-lime-600 text-black font-semibold"
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Create assistant
          </Button>

          {currentAssistant && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-lime-500/30 bg-lime-500/5 p-3">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 className="h-5 w-5 text-lime-500 shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium">Active assistant: {currentAssistant.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Linked to your phone numbers. Intents from the dashboard are synced to this assistant.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={openEditDialog}>
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)} className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          )}

          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Edit assistant</DialogTitle>
                <DialogDescription>
                  Update the name and voice for your assistant.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Assistant name</Label>
                  <Input
                    id="edit-name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="e.g. Charlie, Taylor"
                    disabled={updating}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Voice</Label>
                  <div className="grid gap-2 sm:grid-cols-2 max-h-48 overflow-y-auto">
                    {voices.map((voice) => (
                      <div
                        key={voice.id}
                        className={`flex items-center gap-2 rounded-lg border p-3 cursor-pointer transition-colors ${
                          editVoiceId === voice.id
                            ? "border-lime-500 bg-lime-500/10"
                            : "border-border hover:bg-muted/50"
                        }`}
                        onClick={() => setEditVoiceId(voice.id)}
                      >
                        <Mic className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="flex-1 min-w-0 truncate font-medium text-sm">{voice.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          title={playingVoiceId === voice.id ? "Stop" : "Preview"}
                          onClick={(e) => { e.stopPropagation(); handlePlayPreview(e, voice) }}
                        >
                          {playingVoiceId === voice.id ? (
                            <Square className="h-3.5 w-3.5 fill-current" />
                          ) : (
                            <Play className="h-3.5 w-3.5 fill-current" />
                          )}
                        </Button>
                        {editVoiceId === voice.id && <CheckCircle2 className="h-4 w-4 text-lime-500 shrink-0" />}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditOpen(false)} disabled={updating}>
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateAssistant}
                  disabled={updating || !editName.trim() || !editVoiceId}
                  className="bg-lime-500 hover:bg-lime-600 text-black"
                >
                  {updating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete assistant?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove your assistant from phone numbers and delete it from VAPI. You can create a new one anytime.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => { e.preventDefault(); handleDeleteAssistant() }}
                  disabled={deleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {userIntents.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Add <a href="/dashboard/intents" className="underline text-lime-600 dark:text-lime-400">intents</a> (hours, services, FAQs) so your assistant can answer callers correctly.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{userIntents.length}</div>
            <p className="text-xs text-muted-foreground">Your intents (synced to assistant)</p>
            <a href="/dashboard/intents" className="text-sm text-lime-600 dark:text-lime-400 underline mt-1 inline-block">Manage intents →</a>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{currentAssistant ? "1" : "0"}</div>
            <p className="text-xs text-muted-foreground">Active assistant</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
