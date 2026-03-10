"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from "@/components/ui/chart"
import { useAnalytics } from "@/hooks/use-analytics"
import {
  Loader2, TrendingUp, Phone, Clock, MessageSquare, AlertCircle, RefreshCw,
  CheckCircle2, XCircle, BarChart2, CalendarCheck,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const CHART_COLORS = {
  blue: "#3b82f6",
  green: "#10b981",
  rose: "#f43f5e",
  amber: "#f59e0b",
  purple: "#8b5cf6",
}

function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  loading,
  accent,
}: {
  title: string
  value: string | number
  sub?: string
  icon: React.ElementType
  loading: boolean
  accent?: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${accent ?? "text-muted-foreground"}`} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <div className="h-8 w-20 bg-muted animate-pulse rounded" />
            <div className="h-3 w-28 bg-muted animate-pulse rounded" />
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </>
        )}
      </CardContent>
    </Card>
  )
}

function AreaMetricCard({
  title,
  total,
  data,
  dataKey,
  color,
  loading,
  formatValue,
}: {
  title: string
  total: string | number
  data: Record<string, string | number>[]
  dataKey: string
  color: string
  loading: boolean
  formatValue?: (v: number) => string
}) {
  return (
    <Card className="bg-card border-border overflow-hidden">
      <CardContent className="p-6">
        <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
        {loading ? (
          <div className="h-8 w-32 bg-muted animate-pulse rounded mb-4" />
        ) : (
          <p className="text-3xl font-bold mb-4">{total}</p>
        )}
        <div className="h-[120px]">
          {loading ? (
            <div className="h-full bg-muted/30 animate-pulse rounded" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                <defs>
                  <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "#6b7280" }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }}
                  labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                />
                <Area
                  type="monotone"
                  dataKey={dataKey}
                  stroke={color}
                  strokeWidth={2}
                  fill={`url(#grad-${dataKey})`}
                  dot={false}
                  activeDot={{ r: 4, fill: color }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState("7d")
  const { data, loading, error } = useAnalytics(timeRange)

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}m ${s}s`
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground mt-1">Monitor call activity and performance metrics.</p>
        </div>
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <p className="text-sm font-medium text-destructive">Error loading analytics: {error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Monitor call activity and performance for your AI voice numbers.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => window.location.reload()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Area chart overview — Total Call Minutes + Number of Calls */}
      <div className="grid gap-4 md:grid-cols-2">
        <AreaMetricCard
          title="Total Call Minutes"
          total={loading ? "—" : data.totalMinutes.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          data={data.timeSeriesData as unknown as Record<string, string | number>[]}
          dataKey="minutes"
          color={CHART_COLORS.blue}
          loading={loading}
          formatValue={(v) => `${v.toFixed(2)} min`}
        />
        <AreaMetricCard
          title="Number of Calls"
          total={loading ? "—" : data.totalCalls.toLocaleString()}
          data={data.timeSeriesData as unknown as Record<string, string | number>[]}
          dataKey="calls"
          color={CHART_COLORS.green}
          loading={loading}
        />
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Calls" value={data.totalCalls} sub="In selected period" icon={Phone} loading={loading} />
        <StatCard
          title="Avg. Duration"
          value={loading ? "—" : formatDuration(data.averageDuration)}
          sub="Average call length"
          icon={Clock}
          loading={loading}
        />
        <StatCard
          title="Completed Rate"
          value={loading ? "—" : `${data.successRate}%`}
          sub="Calls handled successfully"
          icon={CheckCircle2}
          loading={loading}
          accent="text-green-500"
        />
        {/* <StatCard
          title="Appointments Booked"
          value={loading ? "—" : data.appointmentsBooked}
          sub={loading || data.totalCalls === 0 ? "Via AI assistant" : `${Math.round((data.appointmentsBooked / data.totalCalls) * 100)}% booking rate`}
          icon={CalendarCheck}
          loading={loading}
          accent="text-lime-600"
        /> */}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Call Activity</TabsTrigger>
          <TabsTrigger value="numbers">By Phone Number</TabsTrigger>
          {/* <TabsTrigger value="intents">Intents</TabsTrigger> */}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Call Outcomes</CardTitle>
                <CardDescription>Completed vs. escalated breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-[280px] flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : data.callOutcomes.length > 0 && data.totalCalls > 0 ? (
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.callOutcomes}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ outcome, percent }: { outcome?: string; percent?: number }) => `${outcome ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`}
                          outerRadius={90}
                          dataKey="count"
                        >
                          {data.callOutcomes.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={[CHART_COLORS.green, CHART_COLORS.rose, CHART_COLORS.blue, CHART_COLORS.amber, CHART_COLORS.purple][index % 5]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[280px] flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <BarChart2 className="h-10 w-10" />
                    <p className="text-sm">No call data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>Key performance indicators at a glance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-10 bg-muted animate-pulse rounded" />
                  ))
                ) : (
                  <>
                    {[
                      { label: "Completed Rate", value: `${data.successRate}%`, color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" },
                      { label: "Escalated Rate", value: `${data.fallbackRate}%`, color: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-100" },
                      { label: "Total Minutes", value: `${data.totalMinutes.toFixed(1)} min`, color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100" },
                      { label: "Avg Duration", value: formatDuration(data.averageDuration), color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100" },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="flex items-center justify-between py-2 border-b last:border-0">
                        <span className="text-sm font-medium">{label}</span>
                        <Badge variant="outline" className={color}>{value}</Badge>
                      </div>
                    ))}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Full time-series area chart */}
          <Card>
            <CardHeader>
              <CardTitle>Call Volume Over Time</CardTitle>
              <CardDescription>Daily calls and minutes for the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.timeSeriesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="grad-calls-full" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_COLORS.green} stopOpacity={0.25} />
                          <stop offset="95%" stopColor={CHART_COLORS.green} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="grad-minutes-full" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_COLORS.blue} stopOpacity={0.25} />
                          <stop offset="95%" stopColor={CHART_COLORS.blue} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 11 }} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6 }}
                      />
                      <Legend />
                      <Area type="monotone" dataKey="calls" name="Calls" stroke={CHART_COLORS.green} strokeWidth={2} fill="url(#grad-calls-full)" dot={false} activeDot={{ r: 4 }} />
                      <Area type="monotone" dataKey="minutes" name="Minutes" stroke={CHART_COLORS.blue} strokeWidth={2} fill="url(#grad-minutes-full)" dot={false} activeDot={{ r: 4 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Call Activity by Time</CardTitle>
              <CardDescription>
                {timeRange === "24h" ? "Hourly call volume for the past 24 hours"
                  : timeRange === "7d" ? "Daily call volume for the past 7 days"
                  : timeRange === "30d" ? "Weekly call volume for the past 30 days"
                  : "Monthly call volume for the past 90 days"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[350px] flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={
                        timeRange === "24h" ? data.hourlyDistribution
                        : timeRange === "7d" ? data.dailyDistribution
                        : timeRange === "30d" ? data.weeklyDistribution
                        : data.monthlyDistribution
                      }
                      margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey={timeRange === "24h" ? "hour" : timeRange === "7d" ? "day" : timeRange === "30d" ? "week" : "month"}
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                      />
                      <YAxis tick={{ fontSize: 11 }} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6 }}
                      />
                      <Bar dataKey="calls" name="Calls" fill={CHART_COLORS.rose} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Peak Hours</CardTitle>
                <CardDescription>Top 5 busiest hours of the day</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-[260px] flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.hourlyDistribution.slice().sort((a, b) => b.calls - a.calls).slice(0, 5)}
                        margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="hour" tick={{ fontSize: 11 }} tickLine={false} />
                        <YAxis tick={{ fontSize: 11 }} tickLine={false} />
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6 }} />
                        <Bar dataKey="calls" fill={CHART_COLORS.purple} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Day of Week</CardTitle>
                <CardDescription>Call volume by day of the week</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-[260px] flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.dailyDistribution} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} />
                        <YAxis tick={{ fontSize: 11 }} tickLine={false} />
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6 }} />
                        <Bar dataKey="calls" fill={CHART_COLORS.amber} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* By Phone Number Tab */}
        <TabsContent value="numbers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Calls by Phone Number</CardTitle>
              <CardDescription>Breakdown of activity per configured number</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : data.callsByPhoneNumber.length > 0 ? (
                <>
                  <div className="h-[260px] mb-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.callsByPhoneNumber}
                        margin={{ top: 10, right: 10, left: -10, bottom: 30 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="phoneNumber" tick={{ fontSize: 10 }} tickLine={false} angle={-20} textAnchor="end" />
                        <YAxis tick={{ fontSize: 11 }} tickLine={false} />
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6 }} />
                        <Bar dataKey="calls" name="Calls" fill={CHART_COLORS.blue} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2">
                    {data.callsByPhoneNumber.map((item) => (
                      <div key={item.phoneNumber} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono text-sm">{item.phoneNumber}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{item.calls} calls</span>
                          <span>{item.minutes.toFixed(1)} min</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-[200px] gap-2 text-muted-foreground">
                  <Phone className="h-10 w-10" />
                  <p className="text-sm">No phone number data for the selected period</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Intents Tab */}
        {/* <TabsContent value="intents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Popular Intents</CardTitle>
              <CardDescription>Most frequently used intents in your AI assistant</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[350px] flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : data.popularIntents.length > 0 ? (
                <div className="space-y-3">
                  {data.popularIntents
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 10)
                    .map((intent, index) => (
                      <div key={intent.name} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/40 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900 shrink-0">
                            <span className="text-xs font-bold text-rose-700 dark:text-rose-300">{index + 1}</span>
                          </div>
                          <span className="font-medium text-sm">{intent.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">{intent.count} times</span>
                          {data.totalCalls > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {Math.round((intent.count / data.totalCalls) * 100)}% of calls
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[200px] gap-2 text-muted-foreground">
                  <MessageSquare className="h-10 w-10" />
                  <p className="text-sm">No intent data available</p>
                  <p className="text-xs">Create intents to see usage analytics here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent> */}
      </Tabs>
    </div>
  )
}
