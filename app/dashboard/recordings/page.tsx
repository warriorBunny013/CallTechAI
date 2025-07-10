"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Play, Download, Search, Calendar, Phone } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"

// Sample call data
const callData = [
  {
    id: "1",
    phoneNumber: "+1 (555) 123-4567",
    date: "2025-05-17",
    time: "10:23 AM",
    duration: "2m 15s",
    status: "completed",
    intent: "Business Hours",
  },
  {
    id: "2",
    phoneNumber: "+1 (555) 987-6543",
    date: "2025-05-17",
    time: "9:45 AM",
    duration: "4m 32s",
    status: "completed",
    intent: "Location",
  },
  {
    id: "3",
    phoneNumber: "+1 (555) 234-5678",
    date: "2025-05-16",
    time: "3:12 PM",
    duration: "1m 47s",
    status: "completed",
    intent: "Pricing",
  },
  {
    id: "4",
    phoneNumber: "+1 (555) 876-5432",
    date: "2025-05-16",
    time: "11:30 AM",
    duration: "5m 03s",
    status: "completed",
    intent: "Business Hours",
  },
  {
    id: "5",
    phoneNumber: "+1 (555) 345-6789",
    date: "2025-05-15",
    time: "2:45 PM",
    duration: "3m 21s",
    status: "completed",
    intent: "Product Information",
  },
  {
    id: "6",
    phoneNumber: "+1 (555) 654-3210",
    date: "2025-05-15",
    time: "10:15 AM",
    duration: "2m 38s",
    status: "completed",
    intent: "Support",
  },
  {
    id: "7",
    phoneNumber: "+1 (555) 789-0123",
    date: "2025-05-14",
    time: "4:30 PM",
    duration: "6m 12s",
    status: "completed",
    intent: "Appointment",
  },
  {
    id: "8",
    phoneNumber: "+1 (555) 321-0987",
    date: "2025-05-14",
    time: "9:20 AM",
    duration: "1m 45s",
    status: "completed",
    intent: "Location",
  },
]

export default function RecordingsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [dateFilter, setDateFilter] = useState("all")
  const [intentFilter, setIntentFilter] = useState("all")
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null)

  const [isPlayerOpen, setIsPlayerOpen] = useState(false)
  const [selectedCall, setSelectedCall] = useState<(typeof callData)[0] | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(100) // This would be set from the actual audio file

  // Filter calls based on search query and filters
  const filteredCalls = callData.filter((call) => {
    const matchesSearch = call.phoneNumber.includes(searchQuery)
    const matchesDate = dateFilter === "all" || call.date === dateFilter

    return matchesSearch && matchesDate
  })

  const handlePlayRecording = (call: (typeof callData)[0]) => {
    setSelectedCall(call)
    setIsPlayerOpen(true)
    setIsPlaying(true)
    setCurrentTime(0)
    // In a real implementation, this would load the actual recording
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
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="search"
            type="search"
            placeholder="Search by phone number..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center">
          <Label htmlFor="date-filter" className="mr-2">
            Date:
          </Label>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger id="date-filter" className="w-[180px]">
              <SelectValue placeholder="All dates" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All dates</SelectItem>
              <SelectItem value="2025-05-17">Today</SelectItem>
              <SelectItem value="2025-05-16">Yesterday</SelectItem>
              <SelectItem value="2025-05-15">May 15, 2025</SelectItem>
              <SelectItem value="2025-05-14">May 14, 2025</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Call History</CardTitle>
          <CardDescription>Browse and listen to your past call recordings</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Phone Number</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCalls.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4">
                    No call recordings found matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCalls.map((call) => (
                  <TableRow key={call.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center">
                        <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
                        {call.phoneNumber}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span>
                          {call.date === "2025-05-17" ? "Today" : call.date === "2025-05-16" ? "Yesterday" : call.date}{" "}
                          at {call.time}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{call.duration}</TableCell>
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
                        <Button variant="ghost" size="icon">
                          <Download className="h-4 w-4" />
                          <span className="sr-only">Download recording</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={isPlayerOpen} onOpenChange={setIsPlayerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Call Recording</DialogTitle>
          </DialogHeader>
          {selectedCall && (
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <div className="font-medium">{selectedCall.phoneNumber}</div>
                  <div>{selectedCall.duration}</div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {selectedCall.date === "2025-05-17"
                    ? "Today"
                    : selectedCall.date === "2025-05-16"
                      ? "Yesterday"
                      : selectedCall.date}{" "}
                  at {selectedCall.time}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-center gap-4">
                  <Button variant="ghost" size="icon" onClick={() => setIsPlaying(!isPlaying)}>
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
                    onValueChange={(value) => setCurrentTime(value[0])}
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
