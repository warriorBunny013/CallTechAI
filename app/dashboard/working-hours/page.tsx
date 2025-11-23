"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { Clock, Save, Loader2, CheckCircle2 } from "lucide-react"

interface WorkingHours {
  id?: string
  user_id: string
  is_enabled: boolean
  timezone: string
  monday_enabled: boolean
  monday_start_time: string | null
  monday_end_time: string | null
  tuesday_enabled: boolean
  tuesday_start_time: string | null
  tuesday_end_time: string | null
  wednesday_enabled: boolean
  wednesday_start_time: string | null
  wednesday_end_time: string | null
  thursday_enabled: boolean
  thursday_start_time: string | null
  thursday_end_time: string | null
  friday_enabled: boolean
  friday_start_time: string | null
  friday_end_time: string | null
  saturday_enabled: boolean
  saturday_start_time: string | null
  saturday_end_time: string | null
  sunday_enabled: boolean
  sunday_start_time: string | null
  sunday_end_time: string | null
  outside_hours_message: string
}

const DAYS = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' }
]

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Phoenix', label: 'Arizona Time (MST)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
  { value: 'UTC', label: 'UTC' }
]

export default function WorkingHoursPage() {
  const [workingHours, setWorkingHours] = useState<WorkingHours | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetchWorkingHours()
  }, [])

  const fetchWorkingHours = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/working-hours')
      if (!response.ok) {
        throw new Error('Failed to fetch working hours')
      }
      const data = await response.json()
      if (data.workingHours) {
        setWorkingHours(data.workingHours)
      } else {
        // Initialize with default values
        setWorkingHours({
          user_id: '',
          is_enabled: false,
          timezone: 'America/New_York',
          monday_enabled: false,
          monday_start_time: null,
          monday_end_time: null,
          tuesday_enabled: false,
          tuesday_start_time: null,
          tuesday_end_time: null,
          wednesday_enabled: false,
          wednesday_start_time: null,
          wednesday_end_time: null,
          thursday_enabled: false,
          thursday_start_time: null,
          thursday_end_time: null,
          friday_enabled: false,
          friday_start_time: null,
          friday_end_time: null,
          saturday_enabled: false,
          saturday_start_time: null,
          saturday_end_time: null,
          sunday_enabled: false,
          sunday_start_time: null,
          sunday_end_time: null,
          outside_hours_message: 'Sorry, we are currently closed. Please call back during our business hours.'
        })
      }
    } catch (error) {
      console.error('Error fetching working hours:', error)
      toast({
        title: "Error",
        description: "Failed to load working hours. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!workingHours) return

    try {
      setIsSaving(true)
      const response = await fetch('/api/working-hours', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(workingHours),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save working hours')
      }

      toast({
        title: "Success!",
        description: "Working hours saved successfully.",
      })

      setWorkingHours(data.workingHours)
    } catch (error: any) {
      console.error('Error saving working hours:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to save working hours. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const updateDay = (day: string, field: string, value: any) => {
    if (!workingHours) return
    setWorkingHours({
      ...workingHours,
      [`${day}_${field}`]: value
    })
  }

  const toggleDay = (day: string) => {
    if (!workingHours) return
    const enabled = workingHours[`${day}_enabled` as keyof WorkingHours] as boolean
    updateDay(day, 'enabled', !enabled)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!workingHours) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Working Hours</h1>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">Failed to load working hours</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Toaster />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Working Hours</h1>
          <p className="text-muted-foreground mt-2">
            Configure when your assistant should be available to answer calls
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-rose-500 hover:bg-rose-600"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* Enable/Disable Working Hours */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Enable Working Hours</CardTitle>
              <CardDescription>
                When enabled, your assistant will only be active during the specified hours
              </CardDescription>
            </div>
            <Switch
              checked={workingHours.is_enabled}
              onCheckedChange={(checked) =>
                setWorkingHours({ ...workingHours, is_enabled: checked })
              }
            />
          </div>
        </CardHeader>
        {workingHours.is_enabled && (
          <CardContent className="space-y-4">
            <div>
              <Label>Timezone</Label>
              <Select
                value={workingHours.timezone}
                onValueChange={(value) =>
                  setWorkingHours({ ...workingHours, timezone: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Days Configuration */}
      {workingHours.is_enabled && (
        <Card>
          <CardHeader>
            <CardTitle>Daily Schedule</CardTitle>
            <CardDescription>
              Set working hours for each day of the week
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {DAYS.map((day) => {
              const enabled = workingHours[`${day.key}_enabled` as keyof WorkingHours] as boolean
              const startTime = workingHours[`${day.key}_start_time` as keyof WorkingHours] as string | null
              const endTime = workingHours[`${day.key}_end_time` as keyof WorkingHours] as string | null

              return (
                <div
                  key={day.key}
                  className="flex items-center gap-4 p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Switch
                      checked={enabled}
                      onCheckedChange={() => toggleDay(day.key)}
                    />
                    <Label className="font-medium w-24">{day.label}</Label>
                    {enabled && (
                      <div className="flex items-center gap-2 flex-1">
                        <div className="flex-1">
                          <Label className="text-xs text-muted-foreground">Start Time</Label>
                          <Input
                            type="time"
                            value={startTime || ''}
                            onChange={(e) =>
                              updateDay(day.key, 'start_time', e.target.value || null)
                            }
                            className="mt-1"
                          />
                        </div>
                        <span className="pt-6">-</span>
                        <div className="flex-1">
                          <Label className="text-xs text-muted-foreground">End Time</Label>
                          <Input
                            type="time"
                            value={endTime || ''}
                            onChange={(e) =>
                              updateDay(day.key, 'end_time', e.target.value || null)
                            }
                            className="mt-1"
                          />
                        </div>
                      </div>
                    )}
                    {!enabled && (
                      <Badge variant="secondary" className="ml-auto">
                        Closed
                      </Badge>
                    )}
                    {enabled && startTime && endTime && (
                      <Badge variant="outline" className="ml-auto bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-100">
                        {startTime} - {endTime}
                      </Badge>
                    )}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Outside Hours Message */}
      {workingHours.is_enabled && (
        <Card>
          <CardHeader>
            <CardTitle>Outside Hours Message</CardTitle>
            <CardDescription>
              Message to play when someone calls outside of working hours
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={workingHours.outside_hours_message}
              onChange={(e) =>
                setWorkingHours({
                  ...workingHours,
                  outside_hours_message: e.target.value
                })
              }
              placeholder="Enter message for outside working hours..."
              rows={4}
            />
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      {!workingHours.is_enabled && (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Working Hours Disabled
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                  Your assistant is currently available 24/7. Enable working hours to restrict availability to specific times.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Card */}
      {workingHours.is_enabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Working Hours Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {DAYS.map((day) => {
                const enabled = workingHours[`${day.key}_enabled` as keyof WorkingHours] as boolean
                const startTime = workingHours[`${day.key}_start_time` as keyof WorkingHours] as string | null
                const endTime = workingHours[`${day.key}_end_time` as keyof WorkingHours] as string | null

                if (!enabled) return null

                return (
                  <div key={day.key} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{day.label}</span>
                    <span className="text-muted-foreground">
                      {startTime && endTime ? `${startTime} - ${endTime}` : 'Not set'}
                    </span>
                  </div>
                )
              })}
              {DAYS.every((day) => !workingHours[`${day.key}_enabled` as keyof WorkingHours]) && (
                <p className="text-sm text-muted-foreground">No days configured</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

