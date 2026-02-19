"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Play, Download, Search, Calendar, Phone, Globe, RefreshCw, AlertCircle, ChevronLeft, ChevronRight, Clock } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"
import { useCallLogs, CallLog } from "@/hooks/use-call-logs"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function RecordingsPage() {
  const { calls, loading, error, refreshCallLogs } = useCallLogs()
  const [searchQuery, setSearchQuery] = useState("")
  const [dateFilter, setDateFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null)

  const [isPlayerOpen, setIsPlayerOpen] = useState(false)
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false)
  const [selectedCall, setSelectedCall] = useState<CallLog | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(100)
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null)

  // Date range helpers for filter
  const today = new Date().toISOString().split("T")[0]
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  const startOfWeek = (() => {
    const d = new Date()
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday as start
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

  // Filter calls based on search query and filters
  const filteredCalls = calls.filter((call) => {
    const searchLower = searchQuery.toLowerCase()
    const phoneNumberStr = call.phoneNumber || ""
    const statusStr = call.status || ""
    const analysisStr = call.analysis || ""

    const matchesSearch =
      phoneNumberStr.toLowerCase().includes(searchLower) ||
      statusStr.toLowerCase().includes(searchLower) ||
      analysisStr.toLowerCase().includes(searchLower)
    const matchesDate = matchesDateFilter(call.date)
    const matchesStatus = statusFilter === "all" || call.status === statusFilter

    return matchesSearch && matchesDate && matchesStatus
  })

  const paginatedCalls = filteredCalls.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.ceil(filteredCalls.length / PAGE_SIZE)

  // Avg duration for filtered calls (in seconds)
  const avgDurationSeconds =
    filteredCalls.length > 0
      ? filteredCalls.reduce((sum, c) => sum + (c.durationSeconds ?? 0), 0) / filteredCalls.length
      : 0
  const formatAvgDuration = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return m === 0 ? `${s}s` : `${m}m ${String(s).padStart(2, "0")}s`
  }

  const handlePlayRecording = (call: CallLog) => {
    setSelectedCall(call)
    setIsPlayerOpen(true)
    setIsPlaying(false)
    setCurrentTime(0)
    
    // Create audio element for playback
    if (call.recordingUrl) {
      const audio = new Audio(call.recordingUrl)
      audio.addEventListener('loadedmetadata', () => {
        setDuration(Math.floor(audio.duration))
      })
      audio.addEventListener('timeupdate', () => {
        setCurrentTime(Math.floor(audio.currentTime))
      })
      audio.addEventListener('ended', () => {
        setIsPlaying(false)
        setCurrentTime(0)
      })
      setAudioElement(audio)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Call Recordings</h1>
        <p className="text-muted-foreground">
          Listen to and analyze past customer interactions with your AI assistant.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              type="search"
              placeholder="Search by phone number, status, or analysis..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Label htmlFor="date-filter" className="text-sm">
              Date:
            </Label>
            <Select value={dateFilter} onValueChange={(v) => { setDateFilter(v); setPage(1) }}>
              <SelectTrigger id="date-filter" className="w-[140px]">
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
          </div>
          <div className="flex items-center space-x-2">
            <Label htmlFor="status-filter" className="text-sm">
              Status:
            </Label>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
              <SelectTrigger id="status-filter" className="w-[140px]">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pass">✅ Pass</SelectItem>
                <SelectItem value="fail">❌ Fail</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={refreshCallLogs}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="sr-only">Refresh call logs</span>
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

      {!loading && !error && calls.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Total Calls</p>
                  <p className="text-2xl font-bold">{filteredCalls.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Play className="h-4 w-4 text-rose-500" />
                <div>
                  <p className="text-sm font-medium">With Recordings</p>
                  <p className="text-2xl font-bold text-rose-600">
                    {filteredCalls.filter((call) => call.recordingUrl).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Avg Duration</p>
                  <p className="text-2xl font-bold">{formatAvgDuration(avgDurationSeconds)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : !loading && !error && calls.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Call Data Available</h3>
             
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Call History</CardTitle>
          <CardDescription>
            Browse and listen to your past call recordings
            {loading && <span className="ml-2 text-muted-foreground">(Loading...)</span>}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Phone number</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Analysis</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                              {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex items-center justify-center space-x-2">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Loading call recordings...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredCalls.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                    <div className="text-center">
                      <Globe className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">No call recordings found matching your filters.</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {calls.length === 0 ? "No calls have been made yet" : "Try adjusting your search or filters."}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedCalls.map((call) => (
                  <TableRow key={call.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center">
                        <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
                        {call.phoneNumber || (call.isWebCall ? "Web" : "—")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span>
                          {call.date === new Date().toISOString().split('T')[0] ? "Today" : 
                           call.date === new Date(Date.now() - 24*60*60*1000).toISOString().split('T')[0] ? "Yesterday" : 
                           new Date(call.date).toLocaleDateString()}{" "}
                          at {call.time}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{call.duration}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        call.status === 'pass' ? 'bg-green-100 text-green-800' :
                        call.status === 'fail' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {call.status === 'pass' ? '✅ Pass' :
                         call.status === 'fail' ? '❌ Fail' :
                         '❓ Unknown'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs">
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {call.analysis}
                        </p>
                        {call.analysis.length > 100 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedCall(call)
                              setIsAnalysisOpen(true)
                            }}
                            className="text-blue-600 hover:text-blue-800 mt-1"
                          >
                            View Full Analysis
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handlePlayRecording(call)}
                          disabled={currentlyPlaying === call.id}
                        >
                          <Play className="h-4 w-4 text-rose-500" />
                          <span className="sr-only">Play recording</span>
                        </Button>
                        {call.recordingUrl && (
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => window.open(call.recordingUrl, '_blank')}
                          >
                            <Download className="h-4 w-4" />
                            <span className="sr-only">Download recording</span>
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
            <div className="flex items-center justify-between px-2 py-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredCalls.length)} of {filteredCalls.length}
              </p>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm font-medium">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <Dialog open={isPlayerOpen} onOpenChange={(open) => {
        setIsPlayerOpen(open)
        if (!open) {
          // Clean up audio when dialog closes
          if (audioElement) {
            audioElement.pause()
            audioElement.currentTime = 0
            setAudioElement(null)
          }
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
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <div className="font-medium">
                      {selectedCall.isWebCall ? "Web Call" : selectedCall.phoneNumber}
                    </div>
                    <div>{selectedCall.duration}</div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {selectedCall.date === new Date().toISOString().split('T')[0]
                      ? "Today"
                      : selectedCall.date === new Date(Date.now() - 24*60*60*1000).toISOString().split('T')[0]
                        ? "Yesterday"
                        : new Date(selectedCall.date).toLocaleDateString()}{" "}
                    at {selectedCall.time}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Status: {selectedCall.status === 'pass' ? '✅ Pass' : selectedCall.status === 'fail' ? '❌ Fail' : '❓ Unknown'}
                  </div>
                
                </div>
                
                {!selectedCall.recordingUrl ? (
                  <div className="text-center py-8">
                    <Play className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No recording available for this call</p>
                  </div>
                ) : (

              <div className="space-y-2">
                <div className="flex items-center justify-center gap-4">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => {
                      if (audioElement) {
                        if (isPlaying) {
                          audioElement.pause()
                          setIsPlaying(false)
                        } else {
                          audioElement.play()
                          setIsPlaying(true)
                        }
                      }
                    }}
                    disabled={!selectedCall?.recordingUrl}
                  >
                    {isPlaying ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-6 w-6"
                      >
                        <rect x="6" y="4" width="4" height="16" />
                        <rect x="14" y="4" width="4" height="16" />
                      </svg>
                    ) : (
                      <Play className="h-6 w-6" />
                    )}
                  </Button>
                </div>

                <div className="space-y-1">
                  <Slider
                    value={[currentTime]}
                    max={duration}
                    step={1}
                    onValueChange={(value) => {
                      const newTime = value[0]
                      setCurrentTime(newTime)
                      if (audioElement) {
                        audioElement.currentTime = newTime
                      }
                    }}
                    disabled={!selectedCall?.recordingUrl}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <div>
                      {Math.floor(currentTime / 60)}:{(currentTime % 60).toString().padStart(2, "0")}
                    </div>
                    <div>
                      {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, "0")}
                    </div>
                  </div>
                                  </div>
                </div>
                )}
              </div>
            )}
                    </DialogContent>
        </Dialog>
        
        {/* Analysis Popup */}
        <Dialog open={isAnalysisOpen} onOpenChange={setIsAnalysisOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Call Analysis</DialogTitle>
            </DialogHeader>
            {selectedCall && (
              <div className="space-y-4">
              
                
                <div className="border-t pt-4">
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {selectedCall.analysis}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    )
  }
