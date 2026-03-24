"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Bell, BellRing, Save, Loader2, Send, CheckCircle2,
  AlertCircle, MessageCircle, Phone, CalendarCheck, Info,
} from "lucide-react"

interface AlertConfig {
  telegram_enabled: boolean
  telegram_chat_id: string
  whatsapp_enabled: boolean
  whatsapp_to_number: string
  whatsapp_from_number: string
  alert_on_new_call: boolean
  alert_on_new_booking: boolean
}

const DEFAULT_CONFIG: AlertConfig = {
  telegram_enabled: false,
  telegram_chat_id: "",
  whatsapp_enabled: false,
  whatsapp_to_number: "",
  whatsapp_from_number: "",
  alert_on_new_call: true,
  alert_on_new_booking: true,
}

export default function AlertsPage() {
  const [config, setConfig] = useState<AlertConfig>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testingTelegram, setTestingTelegram] = useState(false)
  const [testingWhatsApp, setTestingWhatsApp] = useState(false)

  const fetchConfig = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/alerts/config")
      if (res.ok) {
        const data = await res.json()
        if (data.config) {
          setConfig({
            telegram_enabled: data.config.telegram_enabled ?? false,
            telegram_chat_id: data.config.telegram_chat_id ?? "",
            whatsapp_enabled: data.config.whatsapp_enabled ?? false,
            whatsapp_to_number: data.config.whatsapp_to_number ?? "",
            whatsapp_from_number: data.config.whatsapp_from_number ?? "",
            alert_on_new_call: data.config.alert_on_new_call ?? true,
            alert_on_new_booking: data.config.alert_on_new_booking ?? true,
          })
        }
      }
    } catch {
      // silently ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchConfig() }, [fetchConfig])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/alerts/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      })
      if (!res.ok) throw new Error("Failed to save")
      toast({ title: "Alert settings saved", description: "Your notification preferences have been updated." })
    } catch {
      toast({ title: "Error", description: "Failed to save alert settings.", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async (channel: "telegram" | "whatsapp") => {
    if (channel === "telegram") setTestingTelegram(true)
    else setTestingWhatsApp(true)
    try {
      const res = await fetch("/api/alerts/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel }),
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
      if (channel === "telegram") setTestingTelegram(false)
      else setTestingWhatsApp(false)
    }
  }

  const set = (key: keyof AlertConfig, value: string | boolean) =>
    setConfig((prev) => ({ ...prev, [key]: value }))

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 gap-2 text-gray-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading alert settings…</span>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#84CC16]/10 via-[#84CC16]/5 to-transparent border border-[#84CC16]/20 p-8">
        <div className="absolute top-0 right-0 w-72 h-72 bg-[#84CC16]/8 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#84CC16]/10 border border-[#84CC16]/20">
                <BellRing className="h-5 w-5 text-[#84CC16]" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                Alerts &amp; Notifications
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl">
              Get instantly notified on Telegram or WhatsApp whenever your AI assistant receives a new call or books an appointment.
            </p>
          </div>
          <Badge className="gap-1.5 bg-[#84CC16]/10 text-[#84CC16] border border-[#84CC16]/30 shrink-0 mt-1 px-3 py-1.5">
            <Bell className="h-3.5 w-3.5" />
            {config.telegram_enabled || config.whatsapp_enabled ? "Active" : "Inactive"}
          </Badge>
        </div>
      </div>

      {/* ── Trigger Settings ─────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#84CC16]/10">
              <Bell className="h-5 w-5 text-[#84CC16]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Alert Triggers</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Choose which events send you a notification.</p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02] px-4 py-3">
            <div className="flex items-center gap-3">
              <CalendarCheck className="h-4 w-4 text-[#84CC16]" />
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">New appointment booked by assistant</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Get notified with customer name, email, phone, appointment details, and an AI call summary after every booking</p>
              </div>
            </div>
            <Switch
              checked={config.alert_on_new_booking}
              onCheckedChange={(v) => set("alert_on_new_booking", v)}
            />
          </div>
        </div>
      </div>

      {/* ── Telegram ─────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-white/5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
                <MessageCircle className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">Telegram Alerts</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Receive real-time alerts via <strong className="text-blue-500">@CallTechAIbot</strong> — our official bot.
                </p>
              </div>
            </div>
            <Switch
              checked={config.telegram_enabled}
              onCheckedChange={(v) => set("telegram_enabled", v)}
            />
          </div>
        </div>

        {config.telegram_enabled && (
          <div className="p-6 space-y-5">
            {/* Steps */}
            <div className="rounded-xl border border-blue-200 dark:border-blue-800/30 bg-blue-50 dark:bg-blue-950/20 p-5 space-y-4">
             
              <div className="space-y-3">
                {[
                  {
                    num: "1",
                    text: (
                      <>
                        Open Telegram and search for{" "}
                        <a
                          href="https://t.me/CallTechAIbot"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-blue-600 dark:text-blue-400 underline underline-offset-2"
                        >
                          @CallTechAIbot
                        </a>
                        , then tap <strong>Start</strong>.
                      </>
                    ),
                  },
                  {
                    num: "2",
                    text: (
                      <>
                        The bot will reply with your <strong>Chat ID</strong>. It looks like{" "}
                        <code className="bg-blue-100 dark:bg-blue-900/40 px-1.5 py-0.5 rounded text-xs">123456789</code>.
                      </>
                    ),
                  },
                  {
                    num: "3",
                    text: "Paste your Chat ID below and save — you're done!",
                  },
                ].map(({ num, text }) => (
                  <div key={num} className="flex items-start gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white text-xs font-bold">
                      {num}
                    </div>
                    <p className="text-sm text-blue-700 dark:text-blue-300 pt-0.5">{text}</p>
                  </div>
                ))}
              </div>
              <a
                href="https://t.me/CallTechAIbot"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold px-4 py-2 transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                Open @CallTechAIbot in Telegram
              </a>
            </div>

            {/* Chat ID input */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Your Telegram Chat ID
              </Label>
              <Input
                placeholder="e.g. 123456789"
                value={config.telegram_chat_id}
                onChange={(e) => set("telegram_chat_id", e.target.value)}
                className="font-mono text-sm border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 max-w-xs"
              />
              <p className="text-xs text-gray-400">
                Sent to you by @CallTechAIbot when you type /start
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTest("telegram")}
                disabled={testingTelegram || !config.telegram_chat_id}
                className="border-blue-200 dark:border-blue-800/40 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20"
              >
                {testingTelegram ? (
                  <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Sending…</>
                ) : (
                  <><Send className="mr-1.5 h-3.5 w-3.5" />Send Test Message</>
                )}
              </Button>
              {config.telegram_chat_id && (
                <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Chat ID entered — save to activate
                </span>
              )}
            </div>
          </div>
        )}

        {!config.telegram_enabled && (
          <div className="px-6 py-4 text-sm text-gray-400 dark:text-gray-500">
            Enable the toggle above to receive Telegram alerts via <strong>@CallTechAIbot</strong>.
          </div>
        )}
      </div>

      {/* ── WhatsApp ─────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-white/5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500/10">
                <Phone className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">WhatsApp Alerts</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Send alerts via WhatsApp using Twilio.</p>
              </div>
            </div>
            <Switch
              checked={config.whatsapp_enabled}
              onCheckedChange={(v) => set("whatsapp_enabled", v)}
            />
          </div>
        </div>

        {config.whatsapp_enabled && (
          <div className="p-6 space-y-5">
            <Alert className="border-green-200 dark:border-green-800/30 bg-green-50 dark:bg-green-950/20">
              <Info className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-700 dark:text-green-300 text-sm space-y-1">
                <p><strong>How to set up:</strong></p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Go to your <strong>Twilio Console</strong> → Messaging → Try it out → Send a WhatsApp message</li>
                  <li>Add <code className="bg-green-100 dark:bg-green-900/40 px-1 rounded">TWILIO_ACCOUNT_SID</code> and <code className="bg-green-100 dark:bg-green-900/40 px-1 rounded">TWILIO_AUTH_TOKEN</code> to your <code className="bg-green-100 dark:bg-green-900/40 px-1 rounded">.env.local</code></li>
                  <li>For testing, use the Twilio Sandbox number: <strong>+14155238886</strong></li>
                  <li>Send <code className="bg-green-100 dark:bg-green-900/40 px-1 rounded">join &lt;your-sandbox-code&gt;</code> from your WhatsApp to the sandbox number to activate it</li>
                  <li>For production, request a WhatsApp-enabled Twilio number</li>
                </ol>
              </AlertDescription>
            </Alert>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Your WhatsApp Number <span className="text-gray-400 font-normal">(receive alerts here)</span>
                </Label>
                <Input
                  placeholder="+1234567890"
                  value={config.whatsapp_to_number}
                  onChange={(e) => set("whatsapp_to_number", e.target.value)}
                  className="font-mono text-sm border-gray-200 dark:border-white/10 bg-white dark:bg-white/5"
                />
                <p className="text-xs text-gray-400">Include country code, e.g. +44 7700 900000</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Twilio WhatsApp From Number <span className="text-gray-400 font-normal">(sender)</span>
                </Label>
                <Input
                  placeholder="+14155238886"
                  value={config.whatsapp_from_number}
                  onChange={(e) => set("whatsapp_from_number", e.target.value)}
                  className="font-mono text-sm border-gray-200 dark:border-white/10 bg-white dark:bg-white/5"
                />
                <p className="text-xs text-gray-400">Twilio sandbox: +14155238886 · or your own WhatsApp number</p>
              </div>
            </div>

            <Alert className="border-amber-200 dark:border-amber-800/30 bg-amber-50 dark:bg-amber-950/20">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-amber-700 dark:text-amber-300 text-xs">
                Make sure <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">TWILIO_ACCOUNT_SID</code> and <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">TWILIO_AUTH_TOKEN</code> are set in your <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">.env.local</code> file for WhatsApp sending to work.
              </AlertDescription>
            </Alert>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTest("whatsapp")}
                disabled={testingWhatsApp || !config.whatsapp_to_number || !config.whatsapp_from_number}
                className="border-green-200 dark:border-green-800/40 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/20"
              >
                {testingWhatsApp ? (
                  <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Sending…</>
                ) : (
                  <><Send className="mr-1.5 h-3.5 w-3.5" />Send Test Message</>
                )}
              </Button>
              {config.whatsapp_to_number && config.whatsapp_from_number && (
                <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Numbers entered
                </span>
              )}
            </div>
          </div>
        )}

        {!config.whatsapp_enabled && (
          <div className="px-6 py-4 text-sm text-gray-400 dark:text-gray-500">
            Enable the toggle above to configure WhatsApp alerts.
          </div>
        )}
      </div>

      {/* ── Save ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-6">
        <div>
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Save all alert settings</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Changes take effect immediately after saving.</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#84CC16] hover:bg-[#65A30D] text-black font-semibold shadow-lg shadow-[#84CC16]/25"
        >
          {saving ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</>
          ) : (
            <><Save className="mr-2 h-4 w-4" />Save Settings</>
          )}
        </Button>
      </div>

      <Toaster />
    </div>
  )
}
