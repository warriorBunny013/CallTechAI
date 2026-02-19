"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Bot, CheckCircle2, Loader2, Mic, Plus } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"

interface VoiceOption {
  id: string
  name: string
  provider: string
  description?: string
}

export default function AssistantsPage() {
  const [assistantName, setAssistantName] = useState("")
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null)
  const [voices, setVoices] = useState<VoiceOption[]>([])
  const [voicesLoading, setVoicesLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [currentAssistant, setCurrentAssistant] = useState<{ id: string; name: string } | null>(null)
  const [orgLoading, setOrgLoading] = useState(true)
  const [userIntents, setUserIntents] = useState<any[]>([])

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

      setCurrentAssistant({ id: data.assistant.id, name: data.assistant.name })
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
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {voices.map((voice) => (
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
                      {voice.description && (
                        <div className="text-xs text-muted-foreground">{voice.description}</div>
                      )}
                      {selectedVoiceId === voice.id && (
                        <CheckCircle2 className="mt-1 h-4 w-4 text-lime-500" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
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
            <div className="flex items-center gap-2 rounded-lg border border-lime-500/30 bg-lime-500/5 p-3">
              <CheckCircle2 className="h-5 w-5 text-lime-500 shrink-0" />
              <div>
                <p className="font-medium">Active assistant: {currentAssistant.name}</p>
                <p className="text-xs text-muted-foreground">
                  Linked to your phone numbers. Intents from the dashboard are synced to this assistant.
                </p>
              </div>
            </div>
          )}

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
