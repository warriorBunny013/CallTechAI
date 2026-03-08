"use client"

import { useState, useEffect, useRef } from "react"
import { Loader2 } from "lucide-react"
import Link from "next/link"
import VapiWidget, { type AssistantConfig } from "@/components/vapi-widget"
import { Intent } from "@/lib/supabase"

export default function DemoPage() {
  const [intents, setIntents] = useState<Intent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>("")
  const [assistantId, setAssistantId] = useState<string>("")
  const [isCreatingAssistant, setIsCreatingAssistant] = useState(false)
  const [selectedVoiceAgentId, setSelectedVoiceAgentId] = useState<string | null>(null)
  const [assistantConfig, setAssistantConfig] = useState<AssistantConfig | null>(null)
  const [liveTranscript, setLiveTranscript] = useState<Array<{ role: string; text: string }>>([])
  const [apiKeyReady, setApiKeyReady] = useState(false)
  const transcriptEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [liveTranscript])

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_VAPI_API_KEY
    setApiKeyReady(!!apiKey && apiKey !== "your_vapi_api_key_here")
  }, [])

  useEffect(() => {
    fetch("/api/organisation")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => setSelectedVoiceAgentId(d?.organisation?.selected_voice_agent_id ?? null))
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch("/api/assistant-config")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => setAssistantConfig(d?.assistantConfig ?? null))
      .catch(() => setAssistantConfig(null))
  }, [intents.length, selectedVoiceAgentId])

  const effectiveAssistantId = selectedVoiceAgentId || assistantId

  useEffect(() => {
    fetch("/api/intents")
      .then((r) => (r.ok ? r.json() : { intents: [] }))
      .then((d) => setIntents(d.intents || []))
      .catch(() => setError("Failed to load"))
      .finally(() => setIsLoading(false))
  }, [])

  const createAssistant = async () => {
    setIsCreatingAssistant(true)
    setError("")
    try {
      const res = await fetch("/api/create-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intents }),
      })
      if (!res.ok) throw new Error((await res.json()).error || "Failed")
      const data = await res.json()
      setAssistantId(data.assistantId)
      return data.assistantId
    } catch (e) {
      setError(String(e))
      throw e
    } finally {
      setIsCreatingAssistant(false)
    }
  }

  const handleStartCall = async () => {
    if (assistantConfig) return assistantConfig
    if (effectiveAssistantId) return effectiveAssistantId
    const id = await createAssistant()
    return id ?? undefined
  }

  const assistantOk = apiKeyReady && (!!assistantConfig || !!effectiveAssistantId || isCreatingAssistant)
  const intentsOk = intents.length > 0

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            assistantOk ? "bg-lime-500/20 text-lime-600 dark:text-lime-400" : "bg-muted text-muted-foreground"
          }`}
        >
          Assistant {assistantOk ? "✓" : "—"}
        </span>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            intentsOk ? "bg-lime-500/20 text-lime-600 dark:text-lime-400" : "bg-muted text-muted-foreground"
          }`}
        >
          Intents {intentsOk ? "✓" : "—"}
        </span>
      </div>

      {!assistantOk && (
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/dashboard/assistants" className="underline">Configure assistant</Link>
        </p>
      )}
      {!intentsOk && (
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/dashboard/intents" className="underline">Add intents</Link>
        </p>
      )}

      {apiKeyReady ? (
        <div className="flex w-full max-w-sm flex-col items-center gap-4">
          <VapiWidget
            apiKey={process.env.NEXT_PUBLIC_VAPI_API_KEY!}
            assistantId={effectiveAssistantId}
            assistantConfig={assistantConfig}
            config={{}}
            onStartCall={handleStartCall}
            onTranscriptUpdate={setLiveTranscript}
            onConnectionChange={(c) => !c && setLiveTranscript([])}
            inline
            className="flex justify-center"
          />
          {liveTranscript.length > 0 && (
            <div className="w-full max-w-md rounded-2xl border bg-card p-4 shadow-sm">
              <div className="mb-3 text-xs font-medium text-muted-foreground">Live transcript</div>
              <div className="max-h-40 space-y-3 overflow-y-auto">
                {liveTranscript.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                        m.role === "user"
                          ? "bg-lime-500 text-black rounded-br-md"
                          : "bg-muted text-foreground rounded-bl-md"
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                ))}
                <div ref={transcriptEndRef} />
              </div>
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">System not configured</p>
      )}
    </div>
  )
}
