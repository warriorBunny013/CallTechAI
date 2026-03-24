"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Phone, MessageSquare, Bot, Loader2, ArrowRight, CalendarDays } from "lucide-react"
import Link from "next/link"

interface SetupStatus {
  hasPhoneNumber: boolean
  hasCalendar: boolean
  hasIntents: boolean
  hasAssistant: boolean
}

interface SetupWizardProps {
  onComplete?: () => void
}

export function SetupWizard({ onComplete }: SetupWizardProps) {
  const [status, setStatus] = useState<SetupStatus>({
    hasPhoneNumber: false,
    hasCalendar: false,
    hasIntents: false,
    hasAssistant: false,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkSetupStatus()
  }, [])

  // Refetch when page becomes visible (e.g. user returns from another page)
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

      const [phoneRes, calendarRes, intentsRes, orgRes] = await Promise.all([
        fetch("/api/phone-numbers"),
        fetch("/api/calendar/status"),
        fetch("/api/intents"),
        fetch("/api/organisation"),
      ])

      const phoneData = phoneRes.ok ? await phoneRes.json() : { phoneNumbers: [] }
      const calendarData = calendarRes.ok ? await calendarRes.json() : { connected: false }
      const intentsData = intentsRes.ok ? await intentsRes.json() : { intents: [] }
      const orgData = orgRes.ok ? await orgRes.json() : { organisation: null }

      const selectedVoiceAgentId = orgData.organisation?.selected_voice_agent_id ?? null

      setStatus({
        hasPhoneNumber: (phoneData.phoneNumbers?.length ?? 0) > 0,
        hasCalendar: calendarData.connected === true,
        hasIntents: (intentsData.intents?.length ?? 0) > 0,
        hasAssistant: !!selectedVoiceAgentId,
      })
    } catch (error) {
      console.error("Error checking setup status:", error)
    } finally {
      setIsLoading(false)
    }
  }

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

  const steps = [
    {
      id: "phone",
      title: "Add Phone Number",
      description: "Get a local number or import your existing one",
      icon: Phone,
      completed: status.hasPhoneNumber,
      link: "/dashboard/phone-numbers",
      color: "blue" as const,
    },
    {
      id: "calendar",
      title: "Connect Calendar",
      description: "Link Google Calendar so your AI can book appointments in real time",
      icon: CalendarDays,
      completed: status.hasCalendar,
      link: "/dashboard/bookings",
      color: "teal" as const,
    },
    {
      id: "intents",
      title: "Create Intents",
      description: "Teach your AI how to respond to customers",
      icon: MessageSquare,
      completed: status.hasIntents,
      link: "/dashboard/intents",
      color: "purple" as const,
    },
    {
      id: "assistant",
      title: "Choose Assistant",
      description: "Select your AI voice personality",
      icon: Bot,
      completed: status.hasAssistant,
      link: "/dashboard/assistants",
      color: "green" as const,
    },
  ]

  const allComplete = steps.every((s) => s.completed)
  const completedCount = steps.filter((s) => s.completed).length
  const totalSteps = steps.length
  const progress = (completedCount / totalSteps) * 100

  const colorMap = {
    blue: {
      bg: "bg-blue-500/10 dark:bg-blue-500/10",
      text: "text-blue-600 dark:text-blue-400",
      border: "border-blue-500/20",
      icon: "text-blue-500",
    },
    teal: {
      bg: "bg-teal-500/10 dark:bg-teal-500/10",
      text: "text-teal-600 dark:text-teal-400",
      border: "border-teal-500/20",
      icon: "text-teal-500",
    },
    purple: {
      bg: "bg-purple-500/10 dark:bg-purple-500/10",
      text: "text-purple-600 dark:text-purple-400",
      border: "border-purple-500/20",
      icon: "text-purple-500",
    },
    green: {
      bg: "bg-green-500/10 dark:bg-green-500/10",
      text: "text-green-600 dark:text-green-400",
      border: "border-green-500/20",
      icon: "text-green-500",
    },
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="relative overflow-hidden p-8 rounded-2xl bg-gradient-to-br from-[#84CC16]/10 via-[#84CC16]/5 to-transparent border border-[#84CC16]/20">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#84CC16]/10 rounded-full blur-3xl -z-10" />

        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="flex-1">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Quick Setup
            </h2>
            <p className="text-base text-gray-600 dark:text-gray-400 max-w-2xl">
              {allComplete
                ? "Your assistant is configured and ready to handle calls!"
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

        {/* Progress Bar */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Progress</span>
            <span className="text-sm font-bold text-[#84CC16]">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#84CC16] to-[#65A30D] rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-4">
        {steps.map((step, index) => {
          const Icon = step.icon
          const isActive = !step.completed && steps.slice(0, index).every((s) => s.completed)
          const colors = colorMap[step.color]

          return (
            <div
              key={step.id}
              className={`group relative p-6 rounded-2xl border-2 transition-all duration-300 ${
                step.completed
                  ? "bg-white dark:bg-white/5 border-[#84CC16]/50 shadow-lg shadow-[#84CC16]/5"
                  : isActive
                  ? "bg-white dark:bg-white/5 border-[#84CC16]/30 hover:border-[#84CC16]/50 shadow-md hover:shadow-lg hover:shadow-[#84CC16]/5"
                  : "bg-gray-50 dark:bg-white/[0.02] border-gray-200 dark:border-white/10 opacity-60"
              }`}
            >
              {/* Step number badge */}
              <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-gradient-to-br from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 flex items-center justify-center shadow-lg">
                <span className="text-sm font-bold text-white dark:text-black">{index + 1}</span>
              </div>

              <div className="flex items-start gap-4">
                {/* Icon */}
                <div
                  className={`flex-shrink-0 p-3 rounded-xl transition-all duration-300 ${
                    step.completed
                      ? "bg-[#84CC16]/10 group-hover:scale-110"
                      : isActive
                      ? `${colors.bg} group-hover:scale-110`
                      : "bg-gray-200 dark:bg-white/5"
                  }`}
                >
                  <Icon
                    className={`h-6 w-6 ${
                      step.completed ? "text-[#84CC16]" : isActive ? colors.icon : "text-gray-400 dark:text-gray-600"
                    }`}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1">
                      <h3
                        className={`text-lg font-bold mb-1 ${
                          step.completed
                            ? "text-gray-900 dark:text-white"
                            : isActive
                            ? "text-gray-900 dark:text-white"
                            : "text-gray-600 dark:text-gray-400"
                        }`}
                      >
                        {step.title}
                      </h3>
                      <p
                        className={`text-sm leading-relaxed ${
                          step.completed || isActive
                            ? "text-gray-600 dark:text-gray-400"
                            : "text-gray-500 dark:text-gray-500"
                        }`}
                      >
                        {step.description}
                      </p>
                    </div>

                    {step.completed && (
                      <Badge className="bg-[#84CC16]/10 text-[#84CC16] border border-[#84CC16]/20 font-semibold">
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        Complete
                      </Badge>
                    )}
                  </div>

                  {/* Action Button */}
                  {!step.completed && isActive && (
                    <div className="mt-4">
                      <Button
                        asChild
                        className="bg-[#84CC16] hover:bg-[#65A30D] text-black font-semibold h-11 rounded-xl shadow-lg shadow-[#84CC16]/25 hover:shadow-[#84CC16]/40 transition-all duration-300 group/btn"
                      >
                        <Link href={step.link}>
                          {step.title}
                          <ArrowRight className="h-4 w-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Connecting line */}
              {index < steps.length - 1 && (
                <div className="absolute left-[3.25rem] top-[5.5rem] bottom-[-1rem] w-0.5 bg-gray-200 dark:bg-white/10 -z-10" />
              )}
            </div>
          )
        })}
      </div>

      {/* Completion Card */}
      {allComplete && (
        <div className="relative overflow-hidden p-8 rounded-2xl bg-gradient-to-br from-[#84CC16] to-[#65A30D] shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full blur-2xl" />

          <div className="relative flex items-start gap-6">
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-white mb-2">🎉 All Set!</h3>
              <p className="text-white/90 text-base leading-relaxed mb-6">
                Your AI assistant is now live and ready to handle customer calls 24/7, including booking appointments directly into your calendar. Monitor performance and adjust settings anytime.
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
