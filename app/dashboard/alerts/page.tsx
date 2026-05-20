"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import {
  Bell, BellRing, Loader2, Send, CheckCircle2,
  MessageCircle, CalendarCheck, ExternalLink, Unlink, RefreshCw, Phone,
} from "lucide-react"

interface TelegramStatus {
  botUsername: string
  connectUrl: string
  connected: boolean
  chatIdMasked: string | null
  alertOnNewBooking: boolean
  alertOnNewCall: boolean
}

export default function AlertsPage() {
  const [status, setStatus] = useState<TelegramStatus | null>(null)
  const [chatId, setChatId] = useState("")
  const [loading, setLoading] = useState(true)
  const [waitingForConnect, setWaitingForConnect] = useState(false)
  const [testing, setTesting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [savingTriggers, setSavingTriggers] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchStatus = useCallback(async (): Promise<TelegramStatus | null> => {
    try {
      const [connectRes, configRes] = await Promise.all([
        fetch("/api/alerts/telegram/connect"),
        fetch("/api/alerts/config"),
      ])

      let data: TelegramStatus | null = null
      if (connectRes.ok) {
        data = (await connectRes.json()) as TelegramStatus
        setStatus(data)
      }

      if (configRes.ok) {
        const configData = await configRes.json()
        const savedId = configData.config?.telegram_chat_id ?? ""
        if (savedId) setChatId(savedId)
      }

      return data
    } catch {
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [fetchStatus])

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    setWaitingForConnect(false)
  }

  const startPolling = () => {
    stopPolling()
    setWaitingForConnect(true)

    pollRef.current = setInterval(async () => {
      const data = await fetchStatus()
      if (data?.connected) {
        stopPolling()
        toast({
          title: "Telegram connected!",
          description: "You'll receive alerts from @CallTechAIbot.",
        })
      }
    }, 2500)

    setTimeout(() => stopPolling(), 5 * 60 * 1000)
  }

  const handleConnect = () => {
    if (!status?.connectUrl) return
    window.open(status.connectUrl, "_blank", "noopener,noreferrer")
    startPolling()
  }

  const handleDisconnect = async () => {
    setDisconnecting(true)
    try {
      const res = await fetch("/api/alerts/telegram/disconnect", { method: "POST" })
      if (!res.ok) throw new Error("Failed to disconnect")
      stopPolling()
      setChatId("")
      await fetchStatus()
      toast({ title: "Telegram disconnected" })
    } catch {
      toast({ title: "Error", description: "Could not disconnect.", variant: "destructive" })
    } finally {
      setDisconnecting(false)
    }
  }

  const saveChatId = async (id: string) => {
    const res = await fetch("/api/alerts/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        telegram_enabled: true,
        telegram_chat_id: id,
        alert_on_new_booking: status?.alertOnNewBooking ?? true,
        alert_on_new_call: status?.alertOnNewCall ?? true,
      }),
    })
    if (!res.ok) throw new Error("Failed to save Chat ID")
    await fetchStatus()
  }

  const handleTest = async () => {
    const id = chatId.trim()
    if (!id && !status?.connected) {
      toast({
        title: "Chat ID required",
        description: "Paste your Chat ID from @CallTechAIbot, or use Connect Telegram above.",
        variant: "destructive",
      })
      return
    }

    if (id && !/^\d+$/.test(id)) {
      toast({
        title: "Invalid Chat ID",
        description: "Chat ID should be numbers only. Send /id to @CallTechAIbot to get it.",
        variant: "destructive",
      })
      return
    }

    setTesting(true)
    try {
      if (id) await saveChatId(id)

      const res = await fetch("/api/alerts/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(id ? { chat_id: id } : {}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Test failed")
      toast({ title: "Test sent!", description: data.message })
    } catch (e) {
      toast({
        title: "Test failed",
        description: e instanceof Error ? e.message : "Could not send test message.",
        variant: "destructive",
      })
    } finally {
      setTesting(false)
    }
  }

  const saveTriggers = async (updates: Partial<Pick<TelegramStatus, "alertOnNewBooking" | "alertOnNewCall">>) => {
    if (!status) return
    const next = { ...status, ...updates }
    setStatus(next)
    setSavingTriggers(true)
    try {
      const res = await fetch("/api/alerts/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegram_enabled: next.connected,
          telegram_chat_id: chatId.trim() || undefined,
          alert_on_new_booking: next.alertOnNewBooking,
          alert_on_new_call: next.alertOnNewCall,
        }),
      })
      if (!res.ok) throw new Error("Save failed")
    } catch {
      toast({ title: "Error", description: "Failed to save preferences.", variant: "destructive" })
      await fetchStatus()
    } finally {
      setSavingTriggers(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 gap-2 text-gray-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading alert settings…</span>
      </div>
    )
  }

  const connected = status?.connected ?? false
  const botUsername = status?.botUsername ?? "CallTechAIbot"

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#84CC16]/10 via-[#84CC16]/5 to-transparent border border-[#84CC16]/20 p-8">
        <div className="absolute top-0 right-0 w-72 h-72 bg-[#84CC16]/8 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#84CC16]/10 border border-[#84CC16]/20">
                <BellRing className="h-5 w-5 text-[#84CC16]" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                Telegram Alerts
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400 max-w-xl">
              Get notified on Telegram when calls complete and when your AI assistant books an appointment.
            </p>
          </div>
          <Badge
            className={`gap-1.5 shrink-0 mt-1 px-3 py-1.5 ${
              connected
                ? "bg-[#84CC16]/10 text-[#84CC16] border border-[#84CC16]/30"
                : "bg-gray-100 dark:bg-white/5 text-gray-500 border border-gray-200 dark:border-white/10"
            }`}
          >
            <Bell className="h-3.5 w-3.5" />
            {connected ? "Connected" : "Not connected"}
          </Badge>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
              <MessageCircle className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Connect @{botUsername}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                One click in Telegram, or paste your Chat ID below.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {connected && (
            <div className="flex items-center gap-2 text-sm text-[#84CC16] font-medium">
              <CheckCircle2 className="h-4 w-4" />
              Connected — alerts are active
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="ml-auto text-xs text-gray-400 hover:text-red-500 flex items-center gap-1"
              >
                {disconnecting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Unlink className="h-3 w-3" />}
                Disconnect
              </button>
            </div>
          )}

          {!connected && (
            <>
              <div className="relative pl-8 space-y-6">
                <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-200 dark:bg-white/10" />
                {[
                  { title: "Click Connect Telegram", desc: "Opens @CallTechAIbot with your secure link." },
                  { title: 'Tap "Start" in Telegram', desc: "The bot links your account automatically." },
                  { title: "Return here — done", desc: "This page updates when the connection succeeds." },
                ].map((step, i) => (
                  <div key={i} className="relative flex gap-4">
                    <div
                      className={`absolute -left-8 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold z-10 ${
                        waitingForConnect && i === 1
                          ? "bg-[#84CC16] text-black ring-4 ring-[#84CC16]/20 animate-pulse"
                          : "bg-blue-500 text-white"
                      }`}
                    >
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{step.title}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={handleConnect}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-semibold h-11 px-6 rounded-xl"
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Connect Telegram
                  <ExternalLink className="ml-2 h-3.5 w-3.5 opacity-70" />
                </Button>
                {waitingForConnect && (
                  <span className="flex items-center gap-2 text-sm text-[#84CC16] font-medium">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Waiting for Start…
                  </span>
                )}
              </div>
            </>
          )}

          <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-white/5">
            <div className="space-y-1.5">
              <Label htmlFor="telegram-chat-id" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Your Telegram Chat ID
              </Label>
              <Input
                id="telegram-chat-id"
                placeholder="e.g. 123456789"
                value={chatId}
                onChange={(e) => setChatId(e.target.value.replace(/\s/g, ""))}
                className="font-mono text-sm border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 max-w-sm"
              />
              <p className="text-xs text-gray-400">
                From @{botUsername} after tapping Start, or send <code className="text-xs">/id</code>
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleTest}
              disabled={testing}
              className="border-blue-200 dark:border-blue-800/40 text-blue-600 dark:text-blue-400"
            >
              {testing ? (
                <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Sending…</>
              ) : (
                <><Send className="mr-1.5 h-3.5 w-3.5" />Send test message</>
              )}
            </Button>
          </div>
        </div>
      </div>

      {connected && (
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-white/5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#84CC16]/10">
                <Bell className="h-5 w-5 text-[#84CC16]" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">Alert triggers</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {savingTriggers && (
                    <span className="text-[#84CC16]">
                      <Loader2 className="inline h-3 w-3 animate-spin mr-1" />
                      Saving…
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02] px-4 py-3">
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-[#84CC16]" />
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Call completed</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Caller, duration, and AI summary right after each call</p>
                </div>
              </div>
              <Switch
                checked={status?.alertOnNewCall ?? true}
                onCheckedChange={(v) => saveTriggers({ alertOnNewCall: v })}
                disabled={savingTriggers}
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02] px-4 py-3">
              <div className="flex items-center gap-3">
                <CalendarCheck className="h-4 w-4 text-[#84CC16]" />
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">New appointment booked</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Customer details and AI call summary</p>
                </div>
              </div>
              <Switch
                checked={status?.alertOnNewBooking ?? true}
                onCheckedChange={(v) => saveTriggers({ alertOnNewBooking: v })}
                disabled={savingTriggers}
              />
            </div>
          </div>
        </div>
      )}

      <Toaster />
    </div>
  )
}
