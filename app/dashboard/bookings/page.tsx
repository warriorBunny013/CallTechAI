"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import {
  Calendar, CalendarDays, CheckCircle2, ExternalLink, Save, RefreshCw,
  Loader2, Phone, Clock, CalendarCheck, AlertCircle, Globe, Unlink, Mail,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: i === 0 ? "12:00 AM" : i < 12 ? `${i}:00 AM` : i === 12 ? "12:00 PM" : `${i - 12}:00 PM`,
}))

const DEFAULT_AVAILABILITY = {
  days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  startHour: 9,
  endHour: 17,
  appointmentDuration: 30,
  bufferTime: 15,
}

interface AvailabilitySettings {
  days: string[]
  startHour: number
  endHour: number
  appointmentDuration: number
  bufferTime: number
}

interface Appointment {
  id: string
  summary: string
  start_at: string
  end_at: string
  customer_phone: string | null
  customer_name: string | null
  customer_email: string | null
  calendar_event_id: string | null
  call_id: string | null
  created_at: string
}

/** Build a Google Calendar day-view URL for the appointment's date. */
function googleCalendarDayUrl(isoDate: string): string {
  const d = new Date(isoDate)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, "0")
  const day = String(d.getUTCDate()).padStart(2, "0")
  return `https://calendar.google.com/calendar/r/day/${y}/${m}/${day}`
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

export default function BookingsPage() {
  const [calendarConnected, setCalendarConnected] = useState(false)
  const [calendarId, setCalendarId] = useState<string | null>(null)
  const [calendarLoading, setCalendarLoading] = useState(true)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [availability, setAvailability] = useState<AvailabilitySettings>(DEFAULT_AVAILABILITY)
  const [isSavingAvailability, setIsSavingAvailability] = useState(false)

  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [appointmentsLoading, setAppointmentsLoading] = useState(true)
  const [appointmentsError, setAppointmentsError] = useState<string | null>(null)

  const fetchCalendarStatus = useCallback(async () => {
    setCalendarLoading(true)
    try {
      const res = await fetch("/api/calendar/status")
      if (res.ok) {
        const data = await res.json()
        setCalendarConnected(data.connected ?? false)
        setCalendarId(data.calendarId ?? null)
        if (data.availabilitySettings) {
          setAvailability((prev) => ({ ...prev, ...data.availabilitySettings }))
        }
      }
    } catch {
      // silently ignore — calendar just shows as disconnected
    } finally {
      setCalendarLoading(false)
    }
  }, [])

  const fetchAppointments = useCallback(async () => {
    setAppointmentsLoading(true)
    setAppointmentsError(null)
    try {
      const res = await fetch("/api/calendar/appointments-list")
      if (!res.ok) throw new Error("Failed to load appointments")
      const data = await res.json()
      setAppointments(data.appointments ?? [])
    } catch (e) {
      setAppointmentsError(e instanceof Error ? e.message : "Failed to load appointments")
    } finally {
      setAppointmentsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    const calendarParam = params.get("calendar")
    const reason = params.get("reason")

    if (calendarParam === "connected") {
      toast({
        title: "Google Calendar connected!",
        description: "Your calendar is now linked. Set your availability below and save.",
      })
      window.history.replaceState({}, "", "/dashboard/bookings")
      fetchCalendarStatus()
    } else if (calendarParam === "denied") {
      toast({
        title: "Connection cancelled",
        description: "You cancelled the Google Calendar authorization. Click Connect to try again.",
        variant: "destructive",
      })
      window.history.replaceState({}, "", "/dashboard/bookings")
    } else if (calendarParam === "error") {
      const descriptions: Record<string, string> = {
        redirect_uri_mismatch:
          "Redirect URI mismatch — make sure the callback URL is added as an Authorized Redirect URI in your Google Cloud Console.",
        invalid_client:
          "Invalid Google credentials — double-check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env.",
        invalid_grant:
          "Authorization code expired or already used — please try connecting again.",
        no_credentials:
          "Google credentials are not configured in the server environment.",
        db_error:
          "Failed to save tokens to the database. Check your Supabase connection.",
      }
      toast({
        title: "Google Calendar connection failed",
        description:
          (reason && descriptions[reason]) ||
          "Something went wrong during the OAuth flow. Check the server logs for details.",
        variant: "destructive",
      })
      window.history.replaceState({}, "", "/dashboard/bookings")
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    fetchCalendarStatus()
    fetchAppointments()
  }, [fetchCalendarStatus, fetchAppointments])

  const handleSaveAvailability = async () => {
    setIsSavingAvailability(true)
    try {
      const res = await fetch("/api/calendar/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(availability),
      })
      if (!res.ok) throw new Error("Failed to save")
      toast({ title: "Availability saved", description: "Your booking hours have been updated." })
    } catch {
      toast({ title: "Error", description: "Failed to save availability settings.", variant: "destructive" })
    } finally {
      setIsSavingAvailability(false)
    }
  }

  const handleDisconnect = async () => {
    setIsDisconnecting(true)
    try {
      const res = await fetch("/api/calendar/disconnect", { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to disconnect")
      setCalendarConnected(false)
      setAvailability(DEFAULT_AVAILABILITY)
      toast({
        title: "Calendar disconnected",
        description: "Google Calendar has been unlinked and the booking tools removed from your assistant.",
      })
    } catch {
      toast({ title: "Error", description: "Failed to disconnect calendar. Please try again.", variant: "destructive" })
    } finally {
      setIsDisconnecting(false)
    }
  }

  const toggleDay = (day: string) => {
    setAvailability((prev) => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter((d) => d !== day)
        : [...prev.days, day],
    }))
  }

  const summaryLabel =
    availability.days.length > 0
      ? `${availability.days.join(", ")} · ${HOUR_OPTIONS[availability.startHour]?.label} – ${HOUR_OPTIONS[availability.endHour]?.label} · ${availability.appointmentDuration} min slots${availability.bufferTime > 0 ? ` · ${availability.bufferTime} min buffer` : ""}`
      : "No days selected"

  return (
    <div className="space-y-8">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#84CC16]/10 via-[#84CC16]/5 to-transparent border border-[#84CC16]/20 p-8">
        <div className="absolute top-0 right-0 w-72 h-72 bg-[#84CC16]/8 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#84CC16]/10 border border-[#84CC16]/20">
                <CalendarDays className="h-5 w-5 text-[#84CC16]" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                Bookings &amp; Appointments
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl">
              Connect Google Calendar and set your availability so your AI assistant can book appointments in real time during calls.
            </p>
          </div>
          {!calendarLoading && (
            calendarConnected ? (
              <Badge className="gap-1.5 bg-[#84CC16]/10 text-[#84CC16] border border-[#84CC16]/30 shrink-0 mt-1 px-3 py-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Calendar Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1.5 shrink-0 mt-1 px-3 py-1.5">
                Not Connected
              </Badge>
            )
          )}
        </div>
      </div>

      {/* ── Step 1: Connect Google Calendar ─────────────────── */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#84CC16]/10">
              <CalendarDays className="h-5 w-5 text-[#84CC16]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Connect Google Calendar</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Authorise CallTechAI to read your calendar and create events on your behalf.
              </p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Connect / Reconnect */}
            <Button
              asChild
              className={calendarConnected
                ? "border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10"
                : "bg-[#84CC16] hover:bg-[#65A30D] text-black font-semibold shadow-lg shadow-[#84CC16]/25"}
              variant={calendarConnected ? "outline" : "default"}
            >
              <a href="/api/calendar/connect">
                <Calendar className="mr-2 h-4 w-4" />
                {calendarConnected ? "Reconnect Google Calendar" : "Connect Google Calendar"}
                <ExternalLink className="ml-2 h-3.5 w-3.5 opacity-60" />
              </a>
            </Button>

            {/* Disconnect — only shown when connected */}
            {calendarConnected && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isDisconnecting}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                  >
                    {isDisconnecting ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Unlink className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Disconnect
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Disconnect Google Calendar?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will unlink your Google Calendar, remove the booking tools from your VAPI assistant, and delete your stored calendar credentials. Your existing booked appointments will not be affected.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDisconnect}
                      className="bg-red-500 hover:bg-red-600 text-white"
                    >
                      Yes, disconnect
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {/* Refresh status */}
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchCalendarStatus}
              disabled={calendarLoading}
              className="text-gray-500 dark:text-gray-400"
            >
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${calendarLoading ? "animate-spin" : ""}`} />
              Refresh status
            </Button>
          </div>

          {/* Not connected — how it works */}
          {!calendarConnected && !calendarLoading && (
            <div className="rounded-xl border border-dashed border-gray-200 dark:border-white/10 p-5 text-sm text-gray-500 dark:text-gray-400 space-y-3">
              <p className="font-semibold text-gray-800 dark:text-gray-200">How it works</p>
              <ol className="space-y-2 list-decimal list-inside">
                <li>Connect your Google Calendar with one click above.</li>
                {/* <li>
                  Also connect Google Calendar in your{" "}
                  <a
                    href="https://dashboard.vapi.ai/integrations"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 text-[#84CC16] hover:opacity-80"
                  >
                    VAPI dashboard
                  </a>{" "}
                  (Integrations → Tools Provider → Google Calendar) so VAPI can call the API on your behalf.
                </li> */}
                <li>Define your availability windows below.</li>
                {/* <li>
                  <code className="text-xs bg-gray-100 dark:bg-white/10 px-1 py-0.5 rounded font-mono">google_calendar_tool</code>{" "}
                  and{" "}
                  <code className="text-xs bg-gray-100 dark:bg-white/10 px-1 py-0.5 rounded font-mono">google_calendar_check_availability</code>{" "}
                  are automatically created and assigned to your assistant.
                </li> */}
                <li>Appointments are booked directly into your calendar during live calls.</li>
              </ol>
            </div>
          )}

          {/* Connected — status banner */}
          {calendarConnected && (
            <div className="space-y-3">
              <div className="flex items-center gap-2.5 rounded-xl bg-[#84CC16]/5 border border-[#84CC16]/20 px-4 py-3 text-sm">
                <CheckCircle2 className="h-4 w-4 text-[#84CC16] shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-gray-700 dark:text-gray-300">
                    Google Calendar connected.
                  </span>
                  {calendarId && (
                    <span className="ml-2 text-gray-500 dark:text-gray-400">
                      Calendar ID:{" "}
                      <code className="bg-[#84CC16]/10 text-[#84CC16] px-1.5 py-0.5 rounded text-xs font-mono">
                        {calendarId}
                      </code>
                    </span>
                  )}
                </div>
              </div>
           
            </div>
          )}
        </div>
      </div>

      {/* ── Step 2: Availability Windows ────────────────────── */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#84CC16]/10">
              <Clock className="h-5 w-5 text-[#84CC16]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Availability Windows</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Define when customers can book appointments through your AI assistant.
                {!calendarConnected && (
                  <span className="ml-1.5 text-amber-600 dark:text-amber-400 font-medium">(Connect calendar first to activate)</span>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Days of week */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Available Days</Label>
            <div className="flex flex-wrap gap-2">
              {WEEK_DAYS.map((day) => {
                const isChecked = availability.days.includes(day)
                return (
                  <label
                    key={day}
                    className={`flex items-center gap-2 cursor-pointer select-none rounded-lg border px-3 py-2 text-sm transition-all duration-150 ${
                      isChecked
                        ? "border-[#84CC16]/50 bg-[#84CC16]/10 text-[#84CC16] dark:border-[#84CC16]/40 dark:text-[#84CC16]"
                        : "border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-50 dark:hover:bg-white/5"
                    }`}
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => toggleDay(day)}
                      className="h-3.5 w-3.5"
                    />
                    {day}
                  </label>
                )
              })}
            </div>
          </div>

          <div className="h-px bg-gray-100 dark:bg-white/5" />

          {/* Time + duration grid */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500 dark:text-gray-400 font-medium">Start time</Label>
              <Select
                value={String(availability.startHour)}
                onValueChange={(v) => setAvailability((p) => ({ ...p, startHour: Number(v) }))}
              >
                <SelectTrigger className="h-9 border-gray-200 dark:border-white/10 bg-white dark:bg-white/5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOUR_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500 dark:text-gray-400 font-medium">End time</Label>
              <Select
                value={String(availability.endHour)}
                onValueChange={(v) => setAvailability((p) => ({ ...p, endHour: Number(v) }))}
              >
                <SelectTrigger className="h-9 border-gray-200 dark:border-white/10 bg-white dark:bg-white/5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOUR_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500 dark:text-gray-400 font-medium">Appointment length</Label>
              <Select
                value={String(availability.appointmentDuration)}
                onValueChange={(v) => setAvailability((p) => ({ ...p, appointmentDuration: Number(v) }))}
              >
                <SelectTrigger className="h-9 border-gray-200 dark:border-white/10 bg-white dark:bg-white/5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[15, 20, 30, 45, 60, 90, 120].map((m) => (
                    <SelectItem key={m} value={String(m)}>{m} min</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500 dark:text-gray-400 font-medium">Buffer between slots</Label>
              <Select
                value={String(availability.bufferTime)}
                onValueChange={(v) => setAvailability((p) => ({ ...p, bufferTime: Number(v) }))}
              >
                <SelectTrigger className="h-9 border-gray-200 dark:border-white/10 bg-white dark:bg-white/5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[0, 5, 10, 15, 20, 30].map((m) => (
                    <SelectItem key={m} value={String(m)}>{m === 0 ? "No buffer" : `${m} min`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Summary */}
          <div className="rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
            <span className="font-semibold text-gray-700 dark:text-gray-300">Summary: </span>
            {summaryLabel}
          </div>

          <Button
            onClick={handleSaveAvailability}
            disabled={isSavingAvailability || availability.days.length === 0}
            className="bg-[#84CC16] hover:bg-[#65A30D] text-black font-semibold shadow-lg shadow-[#84CC16]/25 hover:shadow-[#84CC16]/40 transition-all"
          >
            {isSavingAvailability ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</>
            ) : (
              <><Save className="mr-2 h-4 w-4" />Save Availability</>
            )}
          </Button>
        </div>
      </div>

      {/* ── Booked Appointments ──────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-white/5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#84CC16]/10">
                <CalendarCheck className="h-5 w-5 text-[#84CC16]" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">Booked Appointments</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Appointments created by your AI assistant during calls.</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAppointments}
              disabled={appointmentsLoading}
              className="border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${appointmentsLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
        <div className="p-6">
          {appointmentsError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{appointmentsError}</AlertDescription>
            </Alert>
          )}

          {appointmentsLoading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-gray-400 dark:text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading appointments…</span>
            </div>
          ) : appointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400 dark:text-gray-500">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-white/5">
                <Globe className="h-7 w-7" />
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">No appointments yet</p>
              <p className="text-xs text-center max-w-xs text-gray-400 dark:text-gray-500">
                Once your AI assistant books its first appointment, it will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-100 dark:border-white/5">
                    <TableHead className="text-gray-500 dark:text-gray-400 font-medium">Summary</TableHead>
                    <TableHead className="text-gray-500 dark:text-gray-400 font-medium">Customer</TableHead>
                    <TableHead className="text-gray-500 dark:text-gray-400 font-medium">Date &amp; Time</TableHead>
                    <TableHead className="text-gray-500 dark:text-gray-400 font-medium">Duration</TableHead>
                    <TableHead className="text-gray-500 dark:text-gray-400 font-medium">Booked via Call</TableHead>
                    <TableHead className="text-gray-500 dark:text-gray-400 font-medium">Calendar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.map((appt) => {
                    const startMs = new Date(appt.start_at).getTime()
                    const endMs = new Date(appt.end_at).getTime()
                    const durationMin = Math.round((endMs - startMs) / 60000)
                    const calUrl = googleCalendarDayUrl(appt.start_at)
                    return (
                      <TableRow key={appt.id} className="border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                        <TableCell className="font-medium text-gray-900 dark:text-white">{appt.summary}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            {appt.customer_name && (
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{appt.customer_name}</span>
                            )}
                            {appt.customer_email && (
                              <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                <Mail className="h-3 w-3 shrink-0" />
                                {appt.customer_email}
                              </span>
                            )}
                            {appt.customer_phone && (
                              <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 font-mono">
                                <Phone className="h-3 w-3 shrink-0" />
                                {appt.customer_phone}
                              </span>
                            )}
                            {!appt.customer_name && !appt.customer_email && !appt.customer_phone && (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                            <span className="text-sm text-gray-700 dark:text-gray-300">{formatDateTime(appt.start_at)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                            <span className="text-sm text-gray-700 dark:text-gray-300">{durationMin} min</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {appt.call_id ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#84CC16]/10 text-[#84CC16] border border-[#84CC16]/20">
                              <CalendarCheck className="h-3 w-3" />
                              Yes
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">Manual</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <a
                            href={calUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#84CC16] hover:text-[#65A30D] hover:underline transition-colors"
                          >
                            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                            View Calendar
                          </a>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      <Toaster />
    </div>
  )
}
