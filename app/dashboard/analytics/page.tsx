"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell, Line, LineChart } from "@/components/ui/chart"
import { useAnalytics } from "@/hooks/use-analytics"
import { Loader2, TrendingUp, TrendingDown, Phone, Clock, MessageSquare, AlertCircle, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState("7d")
  const { data, loading, error } = useAnalytics(timeRange)

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Monitor call activity and performance metrics for your AI voice assistant.
          </p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-sm font-medium text-red-800 dark:text-red-200">
              Error loading analytics: {error}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          Monitor call activity and performance metrics for your AI voice assistant.
        </p>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <div className="h-8 w-16 bg-muted animate-pulse rounded"></div>
                <div className="h-3 w-24 bg-muted animate-pulse rounded"></div>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{data.totalCalls}</div>
                <p className="text-xs text-muted-foreground">
                  Calls in selected period
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <div className="h-8 w-16 bg-muted animate-pulse rounded"></div>
                <div className="h-3 w-24 bg-muted animate-pulse rounded"></div>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{formatDuration(data.averageDuration)}</div>
                <p className="text-xs text-muted-foreground">
                  Average call length
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <div className="h-8 w-16 bg-muted animate-pulse rounded"></div>
                <div className="h-3 w-24 bg-muted animate-pulse rounded"></div>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{data.successRate}%</div>
                <p className="text-xs text-muted-foreground">
                  Intent matched successfully
                </p>
                <div className="flex items-center space-x-1 mt-1">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <span className="text-xs text-green-600 dark:text-green-400">
                    +2.1% from last period
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fallback Rate</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <div className="h-8 w-16 bg-muted animate-pulse rounded"></div>
                <div className="h-3 w-24 bg-muted animate-pulse rounded"></div>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{data.fallbackRate}%</div>
                <p className="text-xs text-muted-foreground">
                  Bot couldn't understand
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>



      <div className="flex flex-col space-y-4 md:flex-row md:items-end md:justify-between md:space-y-0">
        <div className="flex flex-col space-y-2 md:flex-row md:space-x-2 md:space-y-0">
          <div className="flex flex-col space-y-1">
            {/* <Label htmlFor="time-range">Time Range</Label> */}
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
        <div className="flex items-center space-x-2">
          <button
            onClick={() => window.location.reload()}
            disabled={loading}
            className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Call Activity</TabsTrigger>
          <TabsTrigger value="intents">Popular Intents</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Call Outcomes Distribution</CardTitle>
                <CardDescription>Breakdown of call results</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-[300px] flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.callOutcomes}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ outcome, percent }) => `${outcome} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {data.callOutcomes.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'][index % 5]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>Key performance indicators</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-12 bg-muted animate-pulse rounded"></div>
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Success Rate</span>
                      <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                        {data.successRate}%
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Fallback Rate</span>
                      <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">
                        {data.fallbackRate}%
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Transfer Rate</span>
                      <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                        {data.transferRate}%
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Drop Rate</span>
                      <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
                        {data.dropRate}%
                      </Badge>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

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
                {loading ? (
                  <div className="h-[400px] flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={
                          timeRange === "24h"
                            ? data.hourlyDistribution
                            : timeRange === "7d"
                              ? data.dailyDistribution
                              : timeRange === "30d"
                                ? data.weeklyDistribution
                                : data.monthlyDistribution
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
                )}
              </CardContent>
            </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Busiest Hours</CardTitle>
                <CardDescription>Hours with the highest call volume</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-[300px] flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.hourlyDistribution
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
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Day of Week Comparison</CardTitle>
                <CardDescription>Call volume by day of the week</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-[300px] flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.dailyDistribution} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="day" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="calls" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="intents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Popular Intents</CardTitle>
              <CardDescription>Most frequently used intents and questions</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[400px] flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : data.popularIntents.length > 0 ? (
                <div className="space-y-4">
                  {data.popularIntents
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 10)
                    .map((intent, index) => (
                      <div key={intent.name} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900">
                            <span className="text-sm font-bold text-rose-700 dark:text-rose-300">
                              {index + 1}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{intent.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {intent.count} times used
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline">
                          {Math.round((intent.count / data.totalCalls) * 100)}% of calls
                        </Badge>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No intent data available</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Start creating intents to see usage analytics
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}