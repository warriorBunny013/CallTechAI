"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Play, Download, Search, Calendar, Phone, Globe, RefreshCw, AlertCircle, ChevronLeft, ChevronRight, Clock, Filter, CheckCircle2, XCircle, HelpCircle, CalendarCheck } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useCallLogs, CallLog } from "@/hooks/use-call-logs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

function StatusBadge({ status }: { status: string }) {
  if (status === "pass") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400">
        <CheckCircle2 className="h-3 w-3" />
        Completed
      </span>
    )
  }
  if (status === "fail") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-400">
        <XCircle className="h-3 w-3" />
        Escalated
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
      <HelpCircle className="h-3 w-3" />
      Unknown
    </span>
  )
}

function formatDateLabel(dateStr: string): string {
  const today = new Date().toISOString().split("T")[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0]
  if (dateStr === today) return "Today"
  if (dateStr === yesterday) return "Yesterday"
  return new Date(dateStr).toLocaleDateString()
}

export default function RecordingsPage() {
  const { calls, loading, error, refreshCallLogs } = useCallLogs()

  const [searchQuery, setSearchQuery] = useState("")
  const [intentSearch, setIntentSearch] = useState("")
  const [dateFilter, setDateFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedPhoneNumbers, setSelectedPhoneNumbers] = useState<string[]>([])
  const [phoneFilterOpen, setPhoneFilterOpen] = useState(false)
  const [bookingFilter, setBookingFilter] = useState(false)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  const [isPlayerOpen, setIsPlayerOpen] = useState(false)
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false)
  const [selectedCall, setSelectedCall] = useState<CallLog | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(100)
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null)

  // Unique configured phone numbers from calls (the dashboard phone numbers)
  const uniquePhoneNumbers = useMemo(() => {
    const set = new Set<string>()
    for (const c of calls) {
      const num = c.configuredPhoneNumber || c.phoneNumber
      if (num) set.add(num)
    }
    return Array.from(set).sort()
  }, [calls])

  // Date range helpers
  const today = new Date().toISOString().split("T")[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0]
  const startOfWeek = (() => {
    const d = new Date()
    const diff = d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1)
    return new Date(d.getFullYear(), d.getMonth(), diff).toISOString().split("T")[0]
  })()
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]

  const matchesDateFilter = (callDate: string) => {
    if (dateFilter === "all") return true
    if (dateFilter === "today") return callDate === today
    if (dateFilter === "yesterday") return callDate === yesterday
    if (dateFilter === "week") return callDate >= startOfWeek && callDate <= today
    if (dateFilter === "month") return callDate >= startOfMonth && callDate <= today
    return true
  }

  const filteredCalls = useMemo(() => {
    return calls.filter((call) => {
      const searchLower = searchQuery.toLowerCase()
      const phoneMatch = (call.phoneNumber || "").toLowerCase().includes(searchLower)
      const analysisMatch = (call.analysis || "").toLowerCase().includes(searchLower)
      const matchesSearch = !searchQuery || phoneMatch || analysisMatch

      // Intent search — looks for intent keywords in analysis
      const matchesIntent = !intentSearch || (call.analysis || "").toLowerCase().includes(intentSearch.toLowerCase())

      // Phone number filter (by configured dashboard number)
      const callPhone = call.configuredPhoneNumber || call.phoneNumber
      const matchesPhone = selectedPhoneNumbers.length === 0 || selectedPhoneNumbers.includes(callPhone)

      const matchesDate = matchesDateFilter(call.date)
      const matchesStatus = statusFilter === "all" || call.status === statusFilter
      const matchesBooking = !bookingFilter || call.hasBooking === true

      return matchesSearch && matchesIntent && matchesPhone && matchesDate && matchesStatus && matchesBooking
    })
  }, [calls, searchQuery, intentSearch, selectedPhoneNumbers, dateFilter, statusFilter, bookingFilter])

  const paginatedCalls = filteredCalls.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.ceil(filteredCalls.length / PAGE_SIZE)

  const avgDurationSeconds =
    filteredCalls.length > 0
      ? filteredCalls.reduce((sum, c) => sum + (c.durationSeconds ?? 0), 0) / filteredCalls.length
      : 0

  const formatAvgDuration = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return m === 0 ? `${s}s` : `${m}m ${String(s).padStart(2, "0")}s`
  }

  const togglePhone = (phone: string) => {
    setSelectedPhoneNumbers((prev) =>
      prev.includes(phone) ? prev.filter((p) => p !== phone) : [...prev, phone]
    )
    setPage(1)
  }

  const handlePlayRecording = (call: CallLog) => {
    setSelectedCall(call)
    setIsPlayerOpen(true)
    setIsPlaying(false)
    setCurrentTime(0)
    if (call.recordingUrl) {
      const audio = new Audio(call.recordingUrl)
      audio.addEventListener("loadedmetadata", () => setDuration(Math.floor(audio.duration)))
      audio.addEventListener("timeupdate", () => setCurrentTime(Math.floor(audio.currentTime)))
      audio.addEventListener("ended", () => { setIsPlaying(false); setCurrentTime(0) })
      setAudioElement(audio)
    }
  }

  const completedCount = filteredCalls.filter((c) => c.status === "pass").length
  const escalatedCount = filteredCalls.filter((c) => c.status === "fail").length
  const bookedCount = filteredCalls.filter((c) => c.hasBooking).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Call Recordings</h1>
        <p className="text-muted-foreground">
          Listen to, search, and analyze past customer interactions with your AI assistant.
        </p>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* General search */}
        <div className="relative flex-1 min-w-[220px] max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search phone, analysis..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
          />
        </div>

        {/* Intent search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Filter className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by intent triggered..."
            className="pl-8"
            value={intentSearch}
            onChange={(e) => { setIntentSearch(e.target.value); setPage(1) }}
          />
        </div>

        {/* Phone number multi-select */}
        <Popover open={phoneFilterOpen} onOpenChange={setPhoneFilterOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Phone className="h-4 w-4" />
              Phone Numbers
              {selectedPhoneNumbers.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {selectedPhoneNumbers.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3" align="start">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground mb-2">Filter by configured number</p>
              {uniquePhoneNumbers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No phone numbers found</p>
              ) : (
                <>
                  {uniquePhoneNumbers.map((phone) => (
                    <label
                      key={phone}
                      className="flex items-center gap-2.5 py-1.5 px-2 rounded hover:bg-muted cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedPhoneNumbers.includes(phone)}
                        onCheckedChange={() => togglePhone(phone)}
                      />
                      <span className="font-mono text-sm">{phone}</span>
                    </label>
                  ))}
                  {selectedPhoneNumbers.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-2 text-xs"
                      onClick={() => { setSelectedPhoneNumbers([]); setPage(1) }}
                    >
                      Clear selection
                    </Button>
                  )}
                </>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Date filter */}
        <Select value={dateFilter} onValueChange={(v) => { setDateFilter(v); setPage(1) }}>
          <SelectTrigger className="w-[135px]">
            <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="All dates" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All dates</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="yesterday">Yesterday</SelectItem>
            <SelectItem value="week">This week</SelectItem>
            <SelectItem value="month">This month</SelectItem>
          </SelectContent>
        </Select>

        {/* Status filter */}
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
          <SelectTrigger className="w-[145px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pass">✅ Completed</SelectItem>
            <SelectItem value="fail">⚠️ Escalated</SelectItem>
          </SelectContent>
        </Select>

        {/* Booking filter toggle */}
        {/* <Button
          variant={bookingFilter ? "default" : "outline"}
          size="sm"
          className={bookingFilter ? "bg-lime-500 hover:bg-lime-600 text-black font-medium" : ""}
          onClick={() => { setBookingFilter((v) => !v); setPage(1) }}
        >
          <CalendarCheck className="h-4 w-4 mr-1.5" />
          Booked
          {bookingFilter && <span className="ml-1.5 opacity-70">✓</span>}
        </Button> */}

        <Button variant="outline" size="icon" onClick={refreshCallLogs} disabled={loading} className="shrink-0">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          <span className="sr-only">Refresh</span>
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}. Please check your Vapi configuration and try again.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary cards */}
      {!loading && !error && calls.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Total Calls</p>
                  <p className="text-2xl font-bold">{filteredCalls.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{completedCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Avg Duration</p>
                  <p className="text-2xl font-bold">{formatAvgDuration(avgDurationSeconds)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={bookedCount > 0 ? "border-lime-300 dark:border-lime-800" : ""}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CalendarCheck className={`h-4 w-4 shrink-0 ${bookedCount > 0 ? "text-lime-600 dark:text-lime-400" : "text-muted-foreground"}`} />
                <div>
                  <p className="text-xs text-muted-foreground">Appointments Booked</p>
                  <p className={`text-2xl font-bold ${bookedCount > 0 ? "text-lime-700 dark:text-lime-400" : ""}`}>{bookedCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!loading && !error && calls.length === 0 && (
        <Card>
          <CardContent className="p-10 text-center">
            <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-1">No Call Data Available</h3>
            <p className="text-sm text-muted-foreground">Calls will appear here once your phone numbers start receiving traffic.</p>
          </CardContent>
        </Card>
      )}

      {/* Call table */}
      <Card>
        <CardHeader>
          <CardTitle>Call History</CardTitle>
          <CardDescription>
            Browse and listen to your past call recordings
            {loading && <span className="ml-2 text-muted-foreground animate-pulse">(Loading...)</span>}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Phone Number</TableHead>
                <TableHead>Date &amp; Time</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Booking</TableHead>
                <TableHead>AI Analysis</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Loading call recordings...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredCalls.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10">
                    <Globe className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">
                      {calls.length === 0 ? "No calls have been made yet" : "No recordings match your filters."}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedCalls.map((call) => (
                  <TableRow key={call.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="font-mono text-sm">{call.phoneNumber || (call.isWebCall ? "Web" : "—")}</span>
                        </div>
                        {call.configuredPhoneNumber && call.configuredPhoneNumber !== call.phoneNumber && (
                          <span className="text-xs text-muted-foreground pl-5">via {call.configuredPhoneNumber}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-sm">
                          {formatDateLabel(call.date)} at {call.time}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{call.duration}</span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={call.status} />
                    </TableCell>
                    <TableCell>
                      {call.hasBooking ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-lime-100 text-lime-800 dark:bg-lime-900/40 dark:text-lime-400 whitespace-nowrap">
                          <CalendarCheck className="h-3 w-3" />
                          Booked
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs">
                        <p className="text-sm text-muted-foreground line-clamp-2">{call.analysis}</p>
                        {call.analysis && call.analysis.length > 100 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setSelectedCall(call); setIsAnalysisOpen(true) }}
                            className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 mt-0.5 h-auto px-0 py-0"
                          >
                            View full analysis →
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handlePlayRecording(call)}>
                          <Play className="h-4 w-4 text-rose-500" />
                          <span className="sr-only">Play</span>
                        </Button>
                        {call.recordingUrl && (
                          <Button variant="ghost" size="icon" onClick={() => window.open(call.recordingUrl!, "_blank")}>
                            <Download className="h-4 w-4" />
                            <span className="sr-only">Download</span>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {filteredCalls.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-2 py-4 border-t mt-2">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredCalls.length)} of {filteredCalls.length}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm font-medium">Page {page} of {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audio player dialog */}
      <Dialog open={isPlayerOpen} onOpenChange={(open) => {
        setIsPlayerOpen(open)
        if (!open) {
          audioElement?.pause()
          setAudioElement(null)
          setIsPlaying(false)
          setCurrentTime(0)
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Call Recording</DialogTitle>
          </DialogHeader>
          {selectedCall && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">
                    {selectedCall.isWebCall ? "Web Call" : selectedCall.phoneNumber}
                  </span>
                  <span className="text-sm text-muted-foreground">{selectedCall.duration}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDateLabel(selectedCall.date)} at {selectedCall.time}
                </p>
                <StatusBadge status={selectedCall.status} />
              </div>

              {!selectedCall.recordingUrl ? (
                <div className="text-center py-8">
                  <Play className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No recording available for this call</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-12 w-12"
                      onClick={() => {
                        if (audioElement) {
                          if (isPlaying) { audioElement.pause(); setIsPlaying(false) }
                          else { audioElement.play(); setIsPlaying(true) }
                        }
                      }}
                    >
                      {isPlaying ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-7 w-7">
                          <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
                        </svg>
                      ) : (
                        <Play className="h-7 w-7" />
                      )}
                    </Button>
                  </div>
                  <div className="space-y-1">
                    <Slider
                      value={[currentTime]}
                      max={duration}
                      step={1}
                      onValueChange={([v]) => { setCurrentTime(v); if (audioElement) audioElement.currentTime = v }}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{Math.floor(currentTime / 60)}:{String(currentTime % 60).padStart(2, "0")}</span>
                      <span>{Math.floor(duration / 60)}:{String(duration % 60).padStart(2, "0")}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Full analysis dialog */}
      <Dialog open={isAnalysisOpen} onOpenChange={setIsAnalysisOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AI Call Analysis</DialogTitle>
          </DialogHeader>
          {selectedCall && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>{formatDateLabel(selectedCall.date)} at {selectedCall.time}</span>
                <span>·</span>
                <span>{selectedCall.duration}</span>
                <span>·</span>
                <StatusBadge status={selectedCall.status} />
              </div>
              <div className="border-t pt-4">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{selectedCall.analysis}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
