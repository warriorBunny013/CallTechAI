"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  CheckCircle2,
  Phone,
  MessageSquare,
  Bot,
  Loader2,
  ArrowRight,
  CalendarDays,
  Send,
  Sparkles,
} from "lucide-react"
import Link from "next/link"

interface SetupStatus {
  hasAssistant: boolean
  hasIntents: boolean
  hasPhoneNumber: boolean
  hasCalendar: boolean
  hasTelegram: boolean
}

interface SetupWizardProps {
  onComplete?: () => void
}

type StepColor = "green" | "purple" | "blue" | "teal" | "amber"

const colorMap: Record<
  StepColor,
  { bg: string; icon: string; ring: string; line: string }
> = {
  green: {
    bg: "bg-green-500/10",
    icon: "text-green-500",
    ring: "ring-green-500/25",
    line: "from-green-500 to-green-500/40",
  },
  purple: {
    bg: "bg-purple-500/10",
    icon: "text-purple-500",
    ring: "ring-purple-500/25",
    line: "from-purple-500 to-purple-500/40",
  },
  blue: {
    bg: "bg-blue-500/10",
    icon: "text-blue-500",
    ring: "ring-blue-500/25",
    line: "from-blue-500 to-blue-500/40",
  },
  teal: {
    bg: "bg-teal-500/10",
    icon: "text-teal-500",
    ring: "ring-teal-500/25",
    line: "from-teal-500 to-teal-500/40",
  },
  amber: {
    bg: "bg-amber-500/10",
    icon: "text-amber-500",
    ring: "ring-amber-500/25",
    line: "from-amber-500 to-amber-500/40",
  },
}

export function SetupWizard({ onComplete }: SetupWizardProps) {
  const [status, setStatus] = useState<SetupStatus>({
    hasAssistant: false,
    hasIntents: false,
    hasPhoneNumber: false,
    hasCalendar: false,
    hasTelegram: false,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkSetupStatus()
  }, [])

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        checkSetupStatus()
      }
    }
    document.addEventListener("visibilitychange", handleVisibility)
    return () => document.removeEventListener("visibilitychange", handleVisibility)
  }, [])

  const checkSetupStatus = async () => {
    try {
      setIsLoading(true)

      const [phoneRes, calendarRes, intentsRes, orgRes, telegramRes] = await Promise.all([
        fetch("/api/phone-numbers"),
        fetch("/api/calendar/status"),
        fetch("/api/intents"),
        fetch("/api/organisation"),
        fetch("/api/alerts/telegram/connect"),
      ])

      const phoneData = phoneRes.ok ? await phoneRes.json() : { phoneNumbers: [] }
      const calendarData = calendarRes.ok ? await calendarRes.json() : { connected: false }
      const intentsData = intentsRes.ok ? await intentsRes.json() : { intents: [] }
      const orgData = orgRes.ok ? await orgRes.json() : { organisation: null }
      const telegramData = telegramRes.ok ? await telegramRes.json() : { connected: false }

      const selectedVoiceAgentId = orgData.organisation?.selected_voice_agent_id ?? null

      setStatus({
        hasAssistant: !!selectedVoiceAgentId,
        hasIntents: (intentsData.intents?.length ?? 0) > 0,
        hasPhoneNumber: (phoneData.phoneNumbers?.length ?? 0) > 0,
        hasCalendar: calendarData.connected === true,
        hasTelegram: telegramData.connected === true,
      })
    } catch (error) {
      console.error("Error checking setup status:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const steps: {
    id: string
    title: string
    description: string
    icon: typeof Bot
    completed: boolean
    link: string
    color: StepColor
  }[] = [
    {
      id: "assistant",
      title: "Choose Assistant",
      description: "Select your AI voice personality and configure how it sounds",
      icon: Bot,
      completed: status.hasAssistant,
      link: "/dashboard/assistants",
      color: "green",
    },
    {
      id: "intents",
      title: "Create Intents",
      description: "Teach your AI how to respond to customers and handle common questions",
      icon: MessageSquare,
      completed: status.hasIntents,
      link: "/dashboard/intents",
      color: "purple",
    },
    {
      id: "phone",
      title: "Add Phone Number",
      description: "Get a local number or import your existing one for inbound calls",
      icon: Phone,
      completed: status.hasPhoneNumber,
      link: "/dashboard/phone-numbers",
      color: "blue",
    },
    {
      id: "calendar",
      title: "Connect Calendar",
      description: "Link Google Calendar so your AI can book appointments in real time",
      icon: CalendarDays,
      completed: status.hasCalendar,
      link: "/dashboard/bookings",
      color: "teal",
    },
    {
      id: "telegram",
      title: "Connect Telegram for Alerts",
      description: "Get instant notifications when calls come in or appointments are booked",
      icon: Send,
      completed: status.hasTelegram,
      link: "/dashboard/alerts",
      color: "amber",
    },
  ]

  const allComplete = steps.every((s) => s.completed)
  const completedCount = steps.filter((s) => s.completed).length
  const totalSteps = steps.length
  const progress = (completedCount / totalSteps) * 100
  const activeIndex = steps.findIndex(
    (s, i) => !s.completed && steps.slice(0, i).every((prev) => prev.completed)
  )

  if (isLoading) {
    return (
      <div className="p-12 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="relative">
            <Loader2 className="h-12 w-12 animate-spin text-[#84CC16]" />
            <div className="absolute inset-0 blur-xl bg-[#84CC16]/20 animate-pulse" />
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Loading setup status...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="relative overflow-hidden p-8 rounded-2xl bg-gradient-to-br from-[#84CC16]/10 via-[#84CC16]/5 to-transparent border border-[#84CC16]/20">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#84CC16]/10 rounded-full blur-3xl -z-10" />

        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                Quick Setup
              </h2>
            </div>
            <p className="text-base text-gray-600 dark:text-gray-400 max-w-2xl">
              {allComplete
                ? "Your assistant is configured and ready to handle calls!"
                : activeIndex >= 0
                ? `Step ${activeIndex + 1} of ${totalSteps} — complete each step in order to go live.`
                : "Complete these steps to activate your AI voice assistant"}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="text-right">
              <div className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                {completedCount}/{totalSteps}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Steps Complete</p>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Progress</span>
            <span className="text-sm font-bold text-[#84CC16]">{Math.round(progress)}%</span>
          </div>
          <div className="h-2.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#84CC16] to-[#65A30D] rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Timeline Steps */}
      <div className="p-6 md:p-8 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10">
        <div className="relative">
          {steps.map((step, index) => {
            const Icon = step.icon
            const isCompleted = step.completed
            const isActive = index === activeIndex
            const isUpcoming = !isCompleted && !isActive
            const isLast = index === steps.length - 1
            const colors = colorMap[step.color]
            const prevCompleted = index === 0 || steps[index - 1].completed

            return (
              <div key={step.id} className="relative flex gap-5 md:gap-6">
                {/* Timeline rail */}
                <div className="flex flex-col items-center shrink-0 w-10 md:w-12">
                  {/* Connector line above node (except first) */}
                  {index > 0 && (
                    <div
                      className={`w-0.5 h-6 md:h-8 transition-colors duration-500 ${
                        prevCompleted
                          ? "bg-gradient-to-b from-[#84CC16] to-[#84CC16]/60"
                          : "bg-gray-200 dark:bg-white/10"
                      }`}
                    />
                  )}

                  {/* Node */}
                  <div
                    className={`relative z-10 flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full border-2 transition-all duration-300 ${
                      isCompleted
                        ? "bg-[#84CC16] border-[#84CC16] shadow-lg shadow-[#84CC16]/30"
                        : isActive
                        ? `bg-white dark:bg-[#111] border-[#84CC16] ring-4 ${colors.ring} shadow-lg shadow-[#84CC16]/20`
                        : "bg-gray-100 dark:bg-white/5 border-gray-300 dark:border-white/15"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-5 w-5 md:h-6 md:w-6 text-black" />
                    ) : (
                      <span
                        className={`text-sm md:text-base font-bold ${
                          isActive ? "text-[#84CC16]" : "text-gray-400 dark:text-gray-500"
                        }`}
                      >
                        {index + 1}
                      </span>
                    )}

                    {isActive && (
                      <span className="absolute inset-0 rounded-full animate-ping bg-[#84CC16]/20 pointer-events-none" />
                    )}
                  </div>

                  {/* Connector line below node */}
                  {!isLast && (
                    <div
                      className={`w-0.5 flex-1 min-h-[3rem] transition-colors duration-500 ${
                        isCompleted
                          ? "bg-gradient-to-b from-[#84CC16] to-[#84CC16]/40"
                          : "bg-gray-200 dark:bg-white/10"
                      }`}
                    />
                  )}
                </div>

                {/* Step card */}
                <div
                  className={`flex-1 mb-6 md:mb-8 last:mb-0 p-5 md:p-6 rounded-2xl border-2 transition-all duration-300 ${
                    isCompleted
                      ? "bg-[#84CC16]/5 dark:bg-[#84CC16]/5 border-[#84CC16]/40"
                      : isActive
                      ? "bg-white dark:bg-white/[0.03] border-[#84CC16]/50 shadow-lg shadow-[#84CC16]/10 scale-[1.01]"
                      : isUpcoming
                      ? "bg-gray-50/80 dark:bg-white/[0.02] border-gray-200 dark:border-white/10 opacity-55"
                      : "border-gray-200 dark:border-white/10"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`shrink-0 p-3 rounded-xl transition-all duration-300 ${
                        isCompleted
                          ? "bg-[#84CC16]/15"
                          : isActive
                          ? colors.bg
                          : "bg-gray-200/80 dark:bg-white/5"
                      }`}
                    >
                      <Icon
                        className={`h-5 w-5 md:h-6 md:w-6 ${
                          isCompleted
                            ? "text-[#84CC16]"
                            : isActive
                            ? colors.icon
                            : "text-gray-400 dark:text-gray-600"
                        }`}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3
                              className={`text-base md:text-lg font-bold ${
                                isUpcoming
                                  ? "text-gray-500 dark:text-gray-500"
                                  : "text-gray-900 dark:text-white"
                              }`}
                            >
                              {step.title}
                            </h3>
                            {isActive && (
                              <Badge className="bg-[#84CC16] text-black border-0 font-bold text-[10px] uppercase tracking-wide animate-pulse">
                                Next Step
                              </Badge>
                            )}
                            {isCompleted && (
                              <Badge className="bg-[#84CC16]/10 text-[#84CC16] border border-[#84CC16]/20 font-semibold text-xs">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Done
                              </Badge>
                            )}
                          </div>
                          <p
                            className={`text-sm leading-relaxed ${
                              isUpcoming
                                ? "text-gray-400 dark:text-gray-600"
                                : "text-gray-600 dark:text-gray-400"
                            }`}
                          >
                            {step.description}
                          </p>
                        </div>
                      </div>

                      {isActive && (
                        <div className="mt-4">
                          <Button
                            asChild
                            className="bg-[#84CC16] hover:bg-[#65A30D] text-black font-semibold h-11 rounded-xl shadow-lg shadow-[#84CC16]/25 hover:shadow-[#84CC16]/40 transition-all duration-300 group/btn"
                          >
                            <Link href={step.link}>
                              Continue — {step.title}
                              <ArrowRight className="h-4 w-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                            </Link>
                          </Button>
                        </div>
                      )}

                      {isCompleted && (
                        <div className="mt-3">
                          <Link
                            href={step.link}
                            className="text-xs font-semibold text-[#84CC16] hover:text-[#65A30D] transition-colors"
                          >
                            View settings →
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Completion Card */}
      {allComplete && (
        <div className="relative overflow-hidden p-8 rounded-2xl bg-gradient-to-br from-[#84CC16] to-[#65A30D] shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full blur-2xl" />

          <div className="relative flex items-start gap-6">
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-white mb-2">All Set!</h3>
              <p className="text-white/90 text-base leading-relaxed mb-6">
                Your AI assistant is now live and ready to handle customer calls 24/7, including
                booking appointments and sending you Telegram alerts. Monitor performance anytime.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  className="bg-white hover:bg-gray-100 text-black font-semibold h-11 rounded-xl shadow-lg hover:shadow-xl transition-all"
                  asChild
                >
                  <Link href="/dashboard/phone-numbers">
                    View Phone Numbers
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="border-2 border-white/30 hover:bg-black/10 text-white font-semibold h-11 rounded-xl backdrop-blur-sm"
                  asChild
                >
                  <Link href="/dashboard/recordings">View Call Logs</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
