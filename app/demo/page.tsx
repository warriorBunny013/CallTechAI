"use client"

import { useState, useEffect, useRef } from "react"
import { Loader2, Mic, MessageSquare, ArrowRight } from "lucide-react"
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
            <span className="text-lg font-semibold text-gray-600 dark:text-gray-400">Loading demo...</span>
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

      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-[#0A0A0A] dark:via-black dark:to-[#0A0A0A] flex flex-col items-center justify-center p-4 md:p-6 lg:p-8">
        <div className="w-full max-w-lg mx-auto space-y-6">

          {/* Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex p-4 rounded-2xl bg-[#84CC16]/10 mb-2">
              <Mic className="h-8 w-8 text-[#84CC16]" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-white dark:via-gray-100 dark:to-white bg-clip-text text-transparent">
              Voice Demo
            </h1>
            <p className="text-base text-gray-600 dark:text-gray-400 max-w-md mx-auto">
              Talk to your AI voice assistant live. Test how it handles your configured intents.
            </p>
          </div>

          {/* Status indicators */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
              assistantOk
                ? "bg-[#84CC16]/10 text-[#84CC16] border-[#84CC16]/20"
                : "bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-white/10"
            }`}>
              <div className={`h-2 w-2 rounded-full ${assistantOk ? "bg-[#84CC16] animate-pulse" : "bg-gray-400"}`} />
              Assistant {assistantOk ? "Ready" : "Not configured"}
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
              intentsOk
                ? "bg-[#84CC16]/10 text-[#84CC16] border-[#84CC16]/20"
                : "bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-white/10"
            }`}>
              <div className={`h-2 w-2 rounded-full ${intentsOk ? "bg-[#84CC16] animate-pulse" : "bg-gray-400"}`} />
              {intents.length} {intents.length === 1 ? "Intent" : "Intents"} {intentsOk ? "Active" : "—"}
            </div>
          </div>

          {/* Setup prompts */}
          {(!assistantOk || !intentsOk) && (
            <div className="space-y-2">
              {!assistantOk && (
                <Link
                  href="/dashboard/assistants"
                  className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-[#84CC16]/50 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gray-100 dark:bg-white/10">
                      <Mic className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    </div>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Configure your assistant</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-[#84CC16] transition-colors" />
                </Link>
              )}
              {!intentsOk && (
                <Link
                  href="/dashboard/intents"
                  className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-[#84CC16]/50 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gray-100 dark:bg-white/10">
                      <MessageSquare className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    </div>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Add intents to your assistant</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-[#84CC16] transition-colors" />
                </Link>
              )}
            </div>
          )}

          {/* Voice Widget */}
          {apiKeyReady ? (
            <div className="space-y-4">
              <div className="p-6 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10">
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
              </div>

              {liveTranscript.length > 0 && (
                <div className="rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-100 dark:border-white/5 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-[#84CC16] animate-pulse" />
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Live transcript</span>
                  </div>
                  <div className="p-4 max-h-48 space-y-3 overflow-y-auto">
                    {liveTranscript.map((m, i) => (
                      <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm font-medium ${
                            m.role === "user"
                              ? "bg-[#84CC16] text-black rounded-br-md shadow-lg shadow-[#84CC16]/20"
                              : "bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white rounded-bl-md"
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

              {error && (
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-500/20">
                  <p className="text-sm font-medium text-red-700 dark:text-red-400">{error}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-center">
              <div className="inline-flex p-4 rounded-full bg-gray-100 dark:bg-white/5 mb-4">
                <Mic className="h-8 w-8 text-gray-400 dark:text-gray-600" />
              </div>
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">System not configured</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Set up your VAPI API key to enable voice demo</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
