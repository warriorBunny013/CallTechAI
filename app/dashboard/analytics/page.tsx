"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "@/components/ui/chart"

// Sample data for charts
const hourlyData = [
  { hour: "12 AM", calls: 2 },
  { hour: "1 AM", calls: 1 },
  { hour: "2 AM", calls: 0 },
  { hour: "3 AM", calls: 0 },
  { hour: "4 AM", calls: 0 },
  { hour: "5 AM", calls: 0 },
  { hour: "6 AM", calls: 1 },
  { hour: "7 AM", calls: 3 },
  { hour: "8 AM", calls: 8 },
  { hour: "9 AM", calls: 12 },
  { hour: "10 AM", calls: 18 },
  { hour: "11 AM", calls: 15 },
  { hour: "12 PM", calls: 13 },
  { hour: "1 PM", calls: 11 },
  { hour: "2 PM", calls: 14 },
  { hour: "3 PM", calls: 16 },
  { hour: "4 PM", calls: 12 },
  { hour: "5 PM", calls: 8 },
  { hour: "6 PM", calls: 5 },
  { hour: "7 PM", calls: 3 },
  { hour: "8 PM", calls: 2 },
  { hour: "9 PM", calls: 1 },
  { hour: "10 PM", calls: 0 },
  { hour: "11 PM", calls: 0 },
]

const dailyData = [
  { day: "Mon", calls: 45 },
  { day: "Tue", calls: 52 },
  { day: "Wed", calls: 49 },
  { day: "Thu", calls: 63 },
  { day: "Fri", calls: 58 },
  { day: "Sat", calls: 32 },
  { day: "Sun", calls: 18 },
]

const weeklyData = [
  { week: "Week 1", calls: 245 },
  { week: "Week 2", calls: 267 },
  { week: "Week 3", calls: 298 },
  { week: "Week 4", calls: 317 },
]

const monthlyData = [
  { month: "Jan", calls: 980 },
  { month: "Feb", calls: 1120 },
  { month: "Mar", calls: 1340 },
  { month: "Apr", calls: 1490 },
  { month: "May", calls: 1580 },
]

// Sample data for call duration
const callDurationData = [
  { duration: "<1 min", count: 45 },
  { duration: "1-2 min", count: 78 },
  { duration: "2-3 min", count: 103 },
  { duration: "3-5 min", count: 87 },
  { duration: "5-10 min", count: 43 },
  { duration: ">10 min", count: 12 },
]

// Sample data for call outcomes
const callOutcomeData = [
  { outcome: "Intent Matched", count: 245 },
  { outcome: "Fallback", count: 32 },
  { outcome: "Transferred", count: 18 },
  { outcome: "Ended by Caller", count: 15 },
]

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState("7d")

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          Monitor call activity and performance metrics for your AI voice assistant.
        </p>
      </div>

      <div className="flex flex-col space-y-4 md:flex-row md:items-end md:justify-between md:space-y-0">
        <div className="flex flex-col space-y-2 md:flex-row md:space-x-2 md:space-y-0">
          <div className="flex flex-col space-y-1">
            <Label htmlFor="time-range">Time Range</Label>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger id="time-range" className="w-[180px]">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Tabs defaultValue="activity" className="space-y-4">
        <TabsList>
          <TabsTrigger value="activity">Call Activity</TabsTrigger>
          <TabsTrigger value="duration">Call Duration</TabsTrigger>
          <TabsTrigger value="outcomes">Call Outcomes</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Call Activity by Time</CardTitle>
              <CardDescription>
                {timeRange === "24h"
                  ? "Hourly call volume for the past 24 hours"
                  : timeRange === "7d"
                    ? "Daily call volume for the past 7 days"
                    : timeRange === "30d"
                      ? "Weekly call volume for the past 30 days"
                      : "Monthly call volume for the past 90 days"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={
                      timeRange === "24h"
                        ? hourlyData
                        : timeRange === "7d"
                          ? dailyData
                          : timeRange === "30d"
                            ? weeklyData
                            : monthlyData
                    }
                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey={
                        timeRange === "24h"
                          ? "hour"
                          : timeRange === "7d"
                            ? "day"
                            : timeRange === "30d"
                              ? "week"
                              : "month"
                      }
                    />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="calls" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Busiest Hours</CardTitle>
                <CardDescription>Hours with the highest call volume</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={hourlyData
                        .slice()
                        .sort((a, b) => b.calls - a.calls)
                        .slice(0, 5)}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="calls" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Day of Week Comparison</CardTitle>
                <CardDescription>Call volume by day of the week</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="calls" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="duration" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Call Duration Distribution</CardTitle>
              <CardDescription>Breakdown of calls by duration</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={callDurationData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="duration" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="outcomes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Call Outcomes</CardTitle>
              <CardDescription>Breakdown of call results</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={callOutcomeData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="outcome" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}