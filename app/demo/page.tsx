"use client"

import { useState, useEffect, useRef } from "react"
import { Loader2, Mic, MessageSquare, ArrowRight, CalendarDays, Bot } from "lucide-react"
import Link from "next/link"
import ElevenLabsWidget from "@/components/elevenlabs-widget"

interface AssistantInfo {
  elevenlabsAgentId: string
  name: string
}

export default function DemoPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [orgName, setOrgName] = useState<string>("Your Business")
  const [assistant, setAssistant] = useState<AssistantInfo | null>(null)
  const [intentsCount, setIntentsCount] = useState(0)
  const [calendarConnected, setCalendarConnected] = useState(false)
  const [liveTranscript, setLiveTranscript] = useState<Array<{ role: string; text: string }>>([])
  const transcriptEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [liveTranscript])

  useEffect(() => {
    async function load() {
      try {
        // Load org info, assistants, intents, calendar status in parallel
        const [orgRes, assistantsRes, intentsRes, calRes] = await Promise.all([
          fetch("/api/organisation"),
          fetch("/api/assistants/list"),
          fetch("/api/intents"),
          fetch("/api/calendar/status"),
        ])

        if (orgRes.ok) {
          const d = await orgRes.json()
          setOrgId(d?.organisation?.id ?? null)
          setOrgName(d?.organisation?.name ?? "Your Business")
        }

        if (assistantsRes.ok) {
          const d = await assistantsRes.json()
          const list: AssistantInfo[] = d?.assistants ?? []
          // Pick the default assistant, or the first one
          const def = list.find((a) => (a as AssistantInfo & { isDefault?: boolean }).isDefault) ?? list[0]
          if (def) setAssistant(def)
        }

        if (intentsRes.ok) {
          const d = await intentsRes.json()
          setIntentsCount((d?.intents ?? []).length)
        }

        if (calRes.ok) {
          const d = await calRes.json()
          setCalendarConnected(d?.connected ?? false)
        }
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const agentReady = !!assistant?.elevenlabsAgentId
  const intentsOk = intentsCount > 0

  // Dynamic variables injected into every demo session so booking tools know which org to use
  const dynamicVariables = orgId
    ? { org_id: orgId, org_name: orgName }
    : undefined

  // System-prompt addition so the LLM always sends org_id in tool calls
  const overrides = orgId
    ? {
        agent: {
          prompt: {
            prompt:
              `\n\n## Tool Calls\nYour organisation ID is "${orgId}". ` +
              `Always include "org_id": "${orgId}" in every tool call you make.`,
          },
        },
      }
    : undefined

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-[#0A0A0A] dark:via-black dark:to-[#0A0A0A] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-[#84CC16]/10">
            <Loader2 className="h-6 w-6 animate-spin text-[#84CC16]" />
          </div>
          <span className="text-lg font-semibold text-gray-600 dark:text-gray-400">Loading demo...</span>
        </div>
      </div>
    )
  }

  return (
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
            Talk live to your AI assistant. Test booking, intents, and availability.
          </p>
          {assistant && (
            <p className="text-sm text-[#84CC16] font-semibold">
              Using: {assistant.name}
            </p>
          )}
        </div>

        {/* Status indicators */}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
            agentReady
              ? "bg-[#84CC16]/10 text-[#84CC16] border-[#84CC16]/20"
              : "bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-white/10"
          }`}>
            <div className={`h-2 w-2 rounded-full ${agentReady ? "bg-[#84CC16] animate-pulse" : "bg-gray-400"}`} />
            Assistant {agentReady ? "Ready" : "Not configured"}
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
            intentsOk
              ? "bg-[#84CC16]/10 text-[#84CC16] border-[#84CC16]/20"
              : "bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-white/10"
          }`}>
            <div className={`h-2 w-2 rounded-full ${intentsOk ? "bg-[#84CC16] animate-pulse" : "bg-gray-400"}`} />
            {intentsCount} {intentsCount === 1 ? "Intent" : "Intents"} {intentsOk ? "Active" : "—"}
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
            calendarConnected
              ? "bg-[#84CC16]/10 text-[#84CC16] border-[#84CC16]/20"
              : "bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-white/10"
          }`}>
            <div className={`h-2 w-2 rounded-full ${calendarConnected ? "bg-[#84CC16] animate-pulse" : "bg-gray-400"}`} />
            Booking {calendarConnected ? "Ready" : "Not set up"}
          </div>
        </div>

        {/* Setup prompts when things are missing */}
        {(!agentReady || !calendarConnected) && (
          <div className="space-y-2">
            {!agentReady && (
              <Link
                href="/dashboard/assistants"
                className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-[#84CC16]/50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gray-100 dark:bg-white/10">
                    <Bot className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  </div>
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Create an assistant first
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-[#84CC16] transition-colors" />
              </Link>
            )}
            {!calendarConnected && agentReady && (
              <Link
                href="/dashboard/bookings"
                className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-white/5 border border-amber-200 dark:border-amber-900/40 hover:border-[#84CC16]/50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                    <CalendarDays className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Connect Google Calendar for booking
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Demo will work but booking tools won&apos;t be available
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-[#84CC16] transition-colors" />
              </Link>
            )}
            {!intentsOk && agentReady && (
              <Link
                href="/dashboard/intents"
                className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-[#84CC16]/50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gray-100 dark:bg-white/10">
                    <MessageSquare className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  </div>
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Add intents for Q&amp;A
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-[#84CC16] transition-colors" />
              </Link>
            )}
          </div>
        )}

        {/* Voice Widget */}
        {agentReady ? (
          <div className="space-y-4">
            <div className="p-6 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10">
              <ElevenLabsWidget
                agentId={assistant!.elevenlabsAgentId}
                dynamicVariables={dynamicVariables}
                overrides={overrides}
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
                <div className="p-4 max-h-56 space-y-3 overflow-y-auto">
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
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-center">
            <div className="inline-flex p-4 rounded-full bg-gray-100 dark:bg-white/5 mb-4">
              <Bot className="h-8 w-8 text-gray-400 dark:text-gray-600" />
            </div>
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">No assistant configured</p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              Create an assistant in the Assistants section to enable voice demo
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
