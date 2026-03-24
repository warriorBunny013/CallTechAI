"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Play, Download, Search, Calendar, Phone, Globe, RefreshCw, AlertCircle,
  ChevronLeft, ChevronRight, Clock, Filter, CheckCircle2, XCircle, HelpCircle,
  CalendarCheck, Mic,
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useCallLogs, CallLog } from "@/hooks/use-call-logs"
import { Badge } from "@/components/ui/badge"

function StatusBadge({ status }: { status: string }) {
  if (status === "pass") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-[#84CC16]/10 text-[#84CC16] border border-[#84CC16]/20 font-semibold">
        <CheckCircle2 className="h-3 w-3" />
        Completed
      </span>
    )
  }
  if (status === "fail") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-400">
        <XCircle className="h-3 w-3" />
        Escalated
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
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

  const uniquePhoneNumbers = useMemo(() => {
    const set = new Set<string>()
    for (const c of calls) {
      const num = c.configuredPhoneNumber || c.phoneNumber
      if (num) set.add(num)
    }
    return Array.from(set).sort()
  }, [calls])

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
      const matchesIntent = !intentSearch || (call.analysis || "").toLowerCase().includes(intentSearch.toLowerCase())
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
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
        * { font-family: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-[#0A0A0A] dark:via-black dark:to-[#0A0A0A] p-4 md:p-6 lg:p-8">
        <div className="max-w-[1600px] mx-auto space-y-6 md:space-y-8">

          {/* Header */}
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-white dark:via-gray-100 dark:to-white bg-clip-text text-transparent">
                Call Recordings
              </h1>
              <p className="text-base md:text-lg text-gray-600 dark:text-gray-400 max-w-2xl">
                Listen to, search, and analyze past customer interactions with your AI assistant.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={refreshCallLogs}
              disabled={loading}
              className="bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 shadow-sm font-semibold self-start rounded-xl"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-2xl border-2 border-red-500/20 bg-red-50 dark:bg-red-950/20 p-5 flex items-start gap-4">
              <div className="p-2 rounded-lg bg-red-500/10 shrink-0">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <p className="text-sm font-medium text-red-700 dark:text-red-300">
                {error}. Please check your Vapi configuration and try again.
              </p>
            </div>
          )}

          {/* Summary Stats */}
          {!loading && !error && calls.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total Calls", value: filteredCalls.length, icon: Phone, color: "text-[#84CC16]", bg: "bg-[#84CC16]/10" },
                { label: "Completed", value: completedCount, icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10" },
                { label: "Avg Duration", value: formatAvgDuration(avgDurationSeconds), icon: Clock, color: "text-blue-500", bg: "bg-blue-500/10" },
                { label: "Appointments", value: bookedCount, icon: CalendarCheck, color: bookedCount > 0 ? "text-[#84CC16]" : "text-gray-400 dark:text-gray-600", bg: bookedCount > 0 ? "bg-[#84CC16]/10" : "bg-gray-100 dark:bg-white/5" },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className="group p-5 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-[#84CC16]/50 transition-all duration-300">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-2.5 rounded-xl ${bg} group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className={`h-4 w-4 ${color}`} />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Filters */}
          <div className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[220px] max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-600" />
                <Input
                  type="search"
                  placeholder="Search phone, analysis..."
                  className="pl-9 rounded-xl border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 focus:border-[#84CC16]"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
                />
              </div>

              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-600" />
                <Input
                  type="search"
                  placeholder="Search by intent triggered..."
                  className="pl-9 rounded-xl border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 focus:border-[#84CC16]"
                  value={intentSearch}
                  onChange={(e) => { setIntentSearch(e.target.value); setPage(1) }}
                />
              </div>

              <Popover open={phoneFilterOpen} onOpenChange={setPhoneFilterOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2 rounded-xl border-gray-200 dark:border-white/10 font-semibold hover:border-[#84CC16]/50">
                    <Phone className="h-4 w-4" />
                    Phone Numbers
                    {selectedPhoneNumbers.length > 0 && (
                      <Badge className="ml-1 h-5 px-1.5 text-xs bg-[#84CC16] text-black border-0">
                        {selectedPhoneNumbers.length}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-3 rounded-xl border-gray-200 dark:border-white/10" align="start">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Filter by configured number</p>
                    {uniquePhoneNumbers.length === 0 ? (
                      <p className="text-sm text-gray-500 py-2">No phone numbers found</p>
                    ) : (
                      <>
                        {uniquePhoneNumbers.map((phone) => (
                          <label
                            key={phone}
                            className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer"
                          >
                            <Checkbox
                              checked={selectedPhoneNumbers.includes(phone)}
                              onCheckedChange={() => togglePhone(phone)}
                            />
                            <span className="font-mono text-sm text-gray-900 dark:text-white">{phone}</span>
                          </label>
                        ))}
                        {selectedPhoneNumbers.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full mt-2 text-xs rounded-lg text-[#84CC16] hover:bg-[#84CC16]/10"
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

              <Select value={dateFilter} onValueChange={(v) => { setDateFilter(v); setPage(1) }}>
                <SelectTrigger className="w-[135px] rounded-xl border-gray-200 dark:border-white/10 font-semibold">
                  <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                  <SelectValue placeholder="All dates" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-gray-200 dark:border-white/10">
                  <SelectItem value="all">All dates</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="week">This week</SelectItem>
                  <SelectItem value="month">This month</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
                <SelectTrigger className="w-[145px] rounded-xl border-gray-200 dark:border-white/10 font-semibold">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-gray-200 dark:border-white/10">
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="pass">✅ Completed</SelectItem>
                  <SelectItem value="fail">⚠️ Escalated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Empty state */}
          {!loading && !error && calls.length === 0 && (
            <div className="p-12 rounded-2xl bg-white dark:bg-white/5 border-2 border-dashed border-gray-200 dark:border-white/10 flex flex-col items-center justify-center text-center">
              <div className="inline-flex p-4 rounded-full bg-gray-100 dark:bg-white/5 mb-4">
                <Globe className="h-8 w-8 text-gray-400 dark:text-gray-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No Call Data Available</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Calls will appear here once your phone numbers start receiving traffic.</p>
            </div>
          )}

          {/* Call table */}
          <div className="rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-white/5">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Call History</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Browse and listen to your past call recordings
                {loading && <span className="ml-2 text-[#84CC16] animate-pulse font-medium">(Loading...)</span>}
              </p>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-100 dark:border-white/5 hover:bg-transparent">
                    <TableHead className="font-semibold text-gray-600 dark:text-gray-400">Phone Number</TableHead>
                    <TableHead className="font-semibold text-gray-600 dark:text-gray-400">Date &amp; Time</TableHead>
                    <TableHead className="font-semibold text-gray-600 dark:text-gray-400">Duration</TableHead>
                    <TableHead className="font-semibold text-gray-600 dark:text-gray-400">Status</TableHead>
                    <TableHead className="font-semibold text-gray-600 dark:text-gray-400">Booking</TableHead>
                    <TableHead className="font-semibold text-gray-600 dark:text-gray-400">AI Analysis</TableHead>
                    <TableHead className="text-right font-semibold text-gray-600 dark:text-gray-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <div className="flex items-center justify-center gap-3">
                          <div className="p-2.5 rounded-xl bg-[#84CC16]/10">
                            <RefreshCw className="h-5 w-5 text-[#84CC16] animate-spin" />
                          </div>
                          <span className="font-semibold text-gray-600 dark:text-gray-400">Loading call recordings...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredCalls.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <div className="inline-flex p-4 rounded-full bg-gray-100 dark:bg-white/5 mb-3">
                          <Globe className="h-6 w-6 text-gray-400 dark:text-gray-600" />
                        </div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          {calls.length === 0 ? "No calls have been made yet" : "No recordings match your filters."}
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedCalls.map((call) => (
                      <TableRow key={call.id} className="border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        <TableCell className="font-medium">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5">
                              <Phone className="h-3.5 w-3.5 text-[#84CC16] shrink-0" />
                              <span className="font-mono text-sm text-gray-900 dark:text-white">{call.phoneNumber || (call.isWebCall ? "Web" : "—")}</span>
                            </div>
                            {call.configuredPhoneNumber && call.configuredPhoneNumber !== call.phoneNumber && (
                              <span className="text-xs text-gray-500 dark:text-gray-500 pl-5">via {call.configuredPhoneNumber}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {formatDateLabel(call.date)} at {call.time}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{call.duration}</span>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={call.status} />
                        </TableCell>
                        <TableCell>
                          {call.hasBooking ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#84CC16]/10 text-[#84CC16]">
                              <CalendarCheck className="h-3 w-3" />
                              Booked
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400 dark:text-gray-600">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{call.analysis}</p>
                            {call.analysis && call.analysis.length > 100 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { setSelectedCall(call); setIsAnalysisOpen(true) }}
                                className="text-xs text-[#84CC16] hover:text-[#65A30D] hover:bg-[#84CC16]/10 mt-0.5 h-auto px-0 py-0 font-semibold"
                              >
                                View full analysis →
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handlePlayRecording(call)}
                              className="h-8 w-8 rounded-lg hover:bg-[#84CC16]/10"
                            >
                              <Play className="h-4 w-4 text-[#84CC16]" />
                            </Button>
                            {call.recordingUrl && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => window.open(call.recordingUrl!, "_blank")}
                                className="h-8 w-8 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10"
                              >
                                <Download className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {filteredCalls.length > PAGE_SIZE && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-white/5">
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredCalls.length)} of {filteredCalls.length}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="rounded-xl border-gray-200 dark:border-white/10 font-semibold"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Page {page} of {totalPages}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="rounded-xl border-gray-200 dark:border-white/10 font-semibold"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

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
        <DialogContent className="sm:max-w-md rounded-2xl border-gray-200 dark:border-white/10">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Call Recording</DialogTitle>
          </DialogHeader>
          {selectedCall && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {selectedCall.isWebCall ? "Web Call" : selectedCall.phoneNumber}
                  </span>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{selectedCall.duration}</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  {formatDateLabel(selectedCall.date)} at {selectedCall.time}
                </p>
                <StatusBadge status={selectedCall.status} />
              </div>

              {!selectedCall.recordingUrl ? (
                <div className="text-center py-8">
                  <div className="inline-flex p-4 rounded-full bg-gray-100 dark:bg-white/5 mb-3">
                    <Mic className="h-8 w-8 text-gray-400 dark:text-gray-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">No recording available for this call</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-14 w-14 rounded-full bg-[#84CC16]/10 hover:bg-[#84CC16]/20 border border-[#84CC16]/20"
                      onClick={() => {
                        if (audioElement) {
                          if (isPlaying) { audioElement.pause(); setIsPlaying(false) }
                          else { audioElement.play(); setIsPlaying(true) }
                        }
                      }}
                    >
                      {isPlaying ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6 text-[#84CC16]">
                          <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
                        </svg>
                      ) : (
                        <Play className="h-6 w-6 text-[#84CC16]" />
                      )}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Slider
                      value={[currentTime]}
                      max={duration}
                      step={1}
                      onValueChange={([v]) => { setCurrentTime(v); if (audioElement) audioElement.currentTime = v }}
                      className="[&_[role=slider]]:bg-[#84CC16] [&_[role=slider]]:border-[#84CC16]"
                    />
                    <div className="flex justify-between text-xs font-medium text-gray-500 dark:text-gray-400">
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
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl border-gray-200 dark:border-white/10">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">AI Call Analysis</DialogTitle>
          </DialogHeader>
          {selectedCall && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 font-medium">
                <span>{formatDateLabel(selectedCall.date)} at {selectedCall.time}</span>
                <span className="text-gray-300 dark:text-gray-600">·</span>
                <span>{selectedCall.duration}</span>
                <span className="text-gray-300 dark:text-gray-600">·</span>
                <StatusBadge status={selectedCall.status} />
              </div>
              <div className="border-t border-gray-100 dark:border-white/5 pt-4">
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-gray-300">{selectedCall.analysis}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
