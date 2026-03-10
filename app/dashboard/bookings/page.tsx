"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import {
  Calendar, CalendarDays, CheckCircle2, ExternalLink, Save, RefreshCw,
  Loader2, Phone, Clock, CalendarCheck, AlertCircle, Globe,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

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
  call_id: string | null
  created_at: string
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
  const [calendarLoading, setCalendarLoading] = useState(true)
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

  // Handle ?calendar= redirect param from OAuth flow (run once on mount)
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
          "Redirect URI mismatch — make sure http://localhost:3000/api/calendar/callback is added as an Authorized Redirect URI in your Google Cloud Console OAuth credentials.",
        invalid_client:
          "Invalid Google credentials — double-check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env.local.",
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
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Bookings &amp; Appointments</h1>
          <p className="text-muted-foreground">
            Connect Google Calendar and define your availability so your AI assistant can book appointments in real time.
          </p>
        </div>
        {!calendarLoading && (
          calendarConnected ? (
            <Badge variant="outline" className="gap-1.5 border-green-300 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/40 dark:text-green-400 shrink-0 mt-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Calendar Connected
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1.5 text-muted-foreground shrink-0 mt-1">
              Not Connected
            </Badge>
          )
        )}
      </div>

      {/* ── Step 1: Connect Google Calendar ─────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-lime-500/10">
              <CalendarDays className="h-5 w-5 text-lime-600 dark:text-lime-400" />
            </div>
            <div>
              <CardTitle>Step 1 — Connect Google Calendar</CardTitle>
              <CardDescription>
                Authorise CallTechAI to read your calendar and create events on your behalf.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              asChild
              variant={calendarConnected ? "outline" : "default"}
              className={calendarConnected ? "" : "bg-lime-500 hover:bg-lime-600 text-black font-semibold"}
            >
              <a href="/api/calendar/connect">
                <Calendar className="mr-2 h-4 w-4" />
                {calendarConnected ? "Reconnect Google Calendar" : "Connect Google Calendar"}
                <ExternalLink className="ml-2 h-3.5 w-3.5 opacity-60" />
              </a>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchCalendarStatus}
              disabled={calendarLoading}
              className="text-muted-foreground"
            >
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${calendarLoading ? "animate-spin" : ""}`} />
              Refresh status
            </Button>
          </div>

          {!calendarConnected && !calendarLoading && (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground space-y-2 mt-2">
              <p className="font-medium text-foreground">How it works</p>
              <ol className="space-y-1.5 list-decimal list-inside">
                <li>Connect your Google Calendar with one click above.</li>
                <li>Define your availability windows in Step 2.</li>
                <li>Your AI assistant checks free slots in real time during calls.</li>
                <li>Appointments are booked directly into your calendar — a confirmation is sent to the customer via SMS/email.</li>
              </ol>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Step 2: Availability Windows ────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-lime-500/10">
              <Clock className="h-5 w-5 text-lime-600 dark:text-lime-400" />
            </div>
            <div>
              <CardTitle>Step 2 — Availability Windows</CardTitle>
              <CardDescription>
                Define when customers can book appointments through your AI assistant.
                {!calendarConnected && (
                  <span className="ml-2 text-amber-600 dark:text-amber-400">(Connect calendar first to activate)</span>
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Days of week */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Available Days</Label>
            <div className="flex flex-wrap gap-2">
              {WEEK_DAYS.map((day) => {
                const isChecked = availability.days.includes(day)
                return (
                  <label
                    key={day}
                    className={`flex items-center gap-2 cursor-pointer select-none rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted ${
                      isChecked
                        ? "border-lime-500 bg-lime-50 text-lime-800 dark:bg-lime-950/40 dark:text-lime-300 dark:border-lime-600"
                        : "text-muted-foreground"
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

          <Separator />

          {/* Time + duration grid */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Start time</Label>
              <Select
                value={String(availability.startHour)}
                onValueChange={(v) => setAvailability((p) => ({ ...p, startHour: Number(v) }))}
              >
                <SelectTrigger className="h-9">
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
              <Label className="text-xs text-muted-foreground">End time</Label>
              <Select
                value={String(availability.endHour)}
                onValueChange={(v) => setAvailability((p) => ({ ...p, endHour: Number(v) }))}
              >
                <SelectTrigger className="h-9">
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
              <Label className="text-xs text-muted-foreground">Appointment length</Label>
              <Select
                value={String(availability.appointmentDuration)}
                onValueChange={(v) => setAvailability((p) => ({ ...p, appointmentDuration: Number(v) }))}
              >
                <SelectTrigger className="h-9">
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
              <Label className="text-xs text-muted-foreground">Buffer between slots</Label>
              <Select
                value={String(availability.bufferTime)}
                onValueChange={(v) => setAvailability((p) => ({ ...p, bufferTime: Number(v) }))}
              >
                <SelectTrigger className="h-9">
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
          <div className="rounded-md bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Summary: </span>
            {summaryLabel}
          </div>
        </CardContent>

        <CardFooter>
          <Button
            onClick={handleSaveAvailability}
            disabled={isSavingAvailability || availability.days.length === 0}
            className="bg-lime-500 hover:bg-lime-600 text-black font-semibold"
          >
            {isSavingAvailability ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</>
            ) : (
              <><Save className="mr-2 h-4 w-4" />Save Availability</>
            )}
          </Button>
        </CardFooter>
      </Card>

      {/* ── Booked Appointments ──────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-lime-500/10">
                <CalendarCheck className="h-5 w-5 text-lime-600 dark:text-lime-400" />
              </div>
              <div>
                <CardTitle>Booked Appointments</CardTitle>
                <CardDescription>Appointments created by your AI assistant during calls.</CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={fetchAppointments} disabled={appointmentsLoading}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${appointmentsLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {appointmentsError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{appointmentsError}</AlertDescription>
            </Alert>
          )}

          {appointmentsLoading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading appointments…</span>
            </div>
          ) : appointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
              <Globe className="h-10 w-10" />
              <p className="text-sm font-medium">No appointments yet</p>
              <p className="text-xs text-center max-w-xs">
                Once your AI assistant books its first appointment, it will appear here.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Summary</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date &amp; Time</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Booked from call</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.map((appt) => {
                  const startMs = new Date(appt.start_at).getTime()
                  const endMs = new Date(appt.end_at).getTime()
                  const durationMin = Math.round((endMs - startMs) / 60000)
                  return (
                    <TableRow key={appt.id}>
                      <TableCell className="font-medium">{appt.summary}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          {appt.customer_name && (
                            <span className="text-sm">{appt.customer_name}</span>
                          )}
                          {appt.customer_phone && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                              <Phone className="h-3 w-3" />
                              {appt.customer_phone}
                            </span>
                          )}
                          {!appt.customer_name && !appt.customer_phone && (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-sm">{formatDateTime(appt.start_at)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-sm">{durationMin} min</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {appt.call_id ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-lime-100 text-lime-800 dark:bg-lime-900/40 dark:text-lime-400">
                            <CalendarCheck className="h-3 w-3" />
                            Yes
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Manual</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Toaster />
    </div>
  )
}
