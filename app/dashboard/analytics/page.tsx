"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from "@/components/ui/chart"
import { useAnalytics } from "@/hooks/use-analytics"
import {
  Loader2, TrendingUp, Phone, Clock, MessageSquare, AlertCircle, RefreshCw,
  CheckCircle2, XCircle, BarChart2,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const CHART_COLORS = {
  lime: "#84CC16",
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
  iconBg,
  iconColor,
}: {
  title: string
  value: string | number
  sub?: string
  icon: React.ElementType
  loading: boolean
  iconBg?: string
  iconColor?: string
}) {
  return (
    <div className="group p-6 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-[#84CC16]/50 dark:hover:border-[#84CC16]/50 hover:shadow-lg hover:shadow-[#84CC16]/5 transition-all duration-300">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl ${iconBg ?? "bg-gray-100 dark:bg-white/10"} group-hover:scale-110 transition-transform duration-300`}>
          <Icon className={`h-5 w-5 ${iconColor ?? "text-gray-500 dark:text-gray-400"}`} />
        </div>
      </div>
      {loading ? (
        <div className="space-y-2">
          <div className="h-8 w-20 bg-gray-200 dark:bg-white/10 animate-pulse rounded" />
          <div className="h-3 w-28 bg-gray-200 dark:bg-white/10 animate-pulse rounded" />
        </div>
      ) : (
        <>
          <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{value}</div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          {sub && <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{sub}</p>}
        </>
      )}
    </div>
  )
}

function AreaMetricCard({
  title,
  total,
  data,
  dataKey,
  color,
  loading,
}: {
  title: string
  total: string | number
  data: Record<string, string | number>[]
  dataKey: string
  color: string
  loading: boolean
}) {
  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 overflow-hidden">
      <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">{title}</p>
      {loading ? (
        <div className="h-8 w-32 bg-gray-200 dark:bg-white/10 animate-pulse rounded mb-4" />
      ) : (
        <p className="text-3xl font-bold text-gray-900 dark:text-white mb-4">{total}</p>
      )}
      <div className="h-[120px]">
        {loading ? (
          <div className="h-full bg-gray-100 dark:bg-white/5 animate-pulse rounded-xl" />
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
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
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
    </div>
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
      <>
        <style jsx global>{`
          @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
          * { font-family: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        `}</style>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-[#0A0A0A] dark:via-black dark:to-[#0A0A0A] p-4 md:p-6 lg:p-8">
          <div className="max-w-[1600px] mx-auto space-y-6">
            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-white dark:via-gray-100 dark:to-white bg-clip-text text-transparent">
                Analytics
              </h1>
              <p className="text-base md:text-lg text-gray-600 dark:text-gray-400">Monitor call activity and performance metrics.</p>
            </div>
            <div className="rounded-2xl border-2 border-red-500/20 bg-red-50 dark:bg-red-950/20 p-5 flex items-start gap-4">
              <div className="p-2 rounded-lg bg-red-500/10 shrink-0">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <p className="text-sm font-medium text-red-700 dark:text-red-300">Error loading analytics: {error}</p>
            </div>
          </div>
        </div>
      </>
    )
  }

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
                Analytics
              </h1>
              <p className="text-base md:text-lg text-gray-600 dark:text-gray-400 max-w-2xl">
                Monitor call activity and performance for your AI voice numbers.
              </p>
            </div>
            <div className="flex items-center gap-3 self-start">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-[160px] rounded-xl border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 font-semibold">
                  <SelectValue placeholder="Time range" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-gray-200 dark:border-white/10">
                  <SelectItem value="24h">Last 24 Hours</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="90d">Last 90 Days</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => window.location.reload()}
                disabled={loading}
                className="rounded-xl border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 shadow-sm"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-[#84CC16]" : ""}`} />
              </Button>
            </div>
          </div>

          {/* Area chart overview */}
          <div className="grid gap-4 md:grid-cols-2">
            <AreaMetricCard
              title="Total Call Minutes"
              total={loading ? "—" : data.totalMinutes.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              data={data.timeSeriesData as unknown as Record<string, string | number>[]}
              dataKey="minutes"
              color={CHART_COLORS.blue}
              loading={loading}
            />
            <AreaMetricCard
              title="Number of Calls"
              total={loading ? "—" : data.totalCalls.toLocaleString()}
              data={data.timeSeriesData as unknown as Record<string, string | number>[]}
              dataKey="calls"
              color={CHART_COLORS.lime}
              loading={loading}
            />
          </div>

          {/* KPI cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <StatCard
              title="Total Calls"
              value={data.totalCalls}
              sub="In selected period"
              icon={Phone}
              loading={loading}
              iconBg="bg-[#84CC16]/10"
              iconColor="text-[#84CC16]"
            />
            <StatCard
              title="Avg. Duration"
              value={loading ? "—" : formatDuration(data.averageDuration)}
              sub="Average call length"
              icon={Clock}
              loading={loading}
              iconBg="bg-blue-500/10"
              iconColor="text-blue-500"
            />
            <StatCard
              title="Completed Rate"
              value={loading ? "—" : `${data.successRate}%`}
              sub="Calls handled successfully"
              icon={CheckCircle2}
              loading={loading}
              iconBg="bg-green-500/10"
              iconColor="text-green-500"
            />
          </div>

          {/* Tabs */}
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-1">
              <TabsTrigger value="overview" className="rounded-lg font-semibold">Overview</TabsTrigger>
              <TabsTrigger value="activity" className="rounded-lg font-semibold">Call Activity</TabsTrigger>
              <TabsTrigger value="numbers" className="rounded-lg font-semibold">By Phone Number</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Call Outcomes */}
                <div className="p-6 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Call Outcomes</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Completed vs. escalated breakdown</p>
                  {loading ? (
                    <div className="h-[280px] flex items-center justify-center">
                      <div className="p-3 rounded-xl bg-[#84CC16]/10">
                        <Loader2 className="h-6 w-6 animate-spin text-[#84CC16]" />
                      </div>
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
                                fill={[CHART_COLORS.lime, CHART_COLORS.rose, CHART_COLORS.blue, CHART_COLORS.amber, CHART_COLORS.purple][index % 5]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[280px] flex flex-col items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
                      <div className="p-4 rounded-full bg-gray-100 dark:bg-white/5">
                        <BarChart2 className="h-8 w-8 text-gray-400 dark:text-gray-600" />
                      </div>
                      <p className="text-sm font-medium">No call data available</p>
                    </div>
                  )}
                </div>

                {/* Performance Metrics */}
                <div className="p-6 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Performance Metrics</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Key performance indicators at a glance</p>
                  <div className="space-y-3 pt-1">
                    {loading ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-12 bg-gray-100 dark:bg-white/5 animate-pulse rounded-xl" />
                      ))
                    ) : (
                      <>
                        {[
                          { label: "Completed Rate", value: `${data.successRate}%`, color: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" },
                          { label: "Escalated Rate", value: `${data.fallbackRate}%`, color: "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400" },
                          { label: "Total Minutes", value: `${data.totalMinutes.toFixed(1)} min`, color: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" },
                          { label: "Avg Duration", value: formatDuration(data.averageDuration), color: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" },
                        ].map(({ label, value, color }) => (
                          <div key={label} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{label}</span>
                            <span className={`px-3 py-1 rounded-lg text-xs font-bold ${color}`}>{value}</span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Full time-series area chart */}
              <div className="p-6 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Call Volume Over Time</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Daily calls and minutes for the selected period</p>
                {loading ? (
                  <div className="h-[300px] flex items-center justify-center">
                    <div className="p-3 rounded-xl bg-[#84CC16]/10">
                      <Loader2 className="h-6 w-6 animate-spin text-[#84CC16]" />
                    </div>
                  </div>
                ) : (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.timeSeriesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="grad-calls-full" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={CHART_COLORS.lime} stopOpacity={0.25} />
                            <stop offset="95%" stopColor={CHART_COLORS.lime} stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="grad-minutes-full" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={CHART_COLORS.blue} stopOpacity={0.25} />
                            <stop offset="95%" stopColor={CHART_COLORS.blue} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} interval="preserveStartEnd" />
                        <YAxis tick={{ fontSize: 11 }} tickLine={false} />
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                        <Legend />
                        <Area type="monotone" dataKey="calls" name="Calls" stroke={CHART_COLORS.lime} strokeWidth={2} fill="url(#grad-calls-full)" dot={false} activeDot={{ r: 4 }} />
                        <Area type="monotone" dataKey="minutes" name="Minutes" stroke={CHART_COLORS.blue} strokeWidth={2} fill="url(#grad-minutes-full)" dot={false} activeDot={{ r: 4 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity" className="space-y-4">
              <div className="p-6 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Call Activity by Time</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {timeRange === "24h" ? "Hourly call volume for the past 24 hours"
                    : timeRange === "7d" ? "Daily call volume for the past 7 days"
                    : timeRange === "30d" ? "Weekly call volume for the past 30 days"
                    : "Monthly call volume for the past 90 days"}
                </p>
                {loading ? (
                  <div className="h-[350px] flex items-center justify-center">
                    <div className="p-3 rounded-xl bg-[#84CC16]/10">
                      <Loader2 className="h-6 w-6 animate-spin text-[#84CC16]" />
                    </div>
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
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                        <Bar dataKey="calls" name="Calls" fill={CHART_COLORS.lime} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {[
                  {
                    title: "Peak Hours",
                    desc: "Top 5 busiest hours of the day",
                    data: loading ? [] : data.hourlyDistribution.slice().sort((a, b) => b.calls - a.calls).slice(0, 5),
                    xKey: "hour",
                    color: CHART_COLORS.purple,
                  },
                  {
                    title: "Day of Week",
                    desc: "Call volume by day of the week",
                    data: loading ? [] : data.dailyDistribution,
                    xKey: "day",
                    color: CHART_COLORS.amber,
                  },
                ].map(({ title, desc, data: chartData, xKey, color }) => (
                  <div key={title} className="p-6 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{desc}</p>
                    {loading ? (
                      <div className="h-[260px] flex items-center justify-center">
                        <div className="p-3 rounded-xl bg-[#84CC16]/10">
                          <Loader2 className="h-5 w-5 animate-spin text-[#84CC16]" />
                        </div>
                      </div>
                    ) : (
                      <div className="h-[260px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey={xKey} tick={{ fontSize: 11 }} tickLine={false} />
                            <YAxis tick={{ fontSize: 11 }} tickLine={false} />
                            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                            <Bar dataKey="calls" fill={color} radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* By Phone Number Tab */}
            <TabsContent value="numbers" className="space-y-4">
              <div className="p-6 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Calls by Phone Number</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Breakdown of activity per configured number</p>
                {loading ? (
                  <div className="h-[300px] flex items-center justify-center">
                    <div className="p-3 rounded-xl bg-[#84CC16]/10">
                      <Loader2 className="h-6 w-6 animate-spin text-[#84CC16]" />
                    </div>
                  </div>
                ) : data.callsByPhoneNumber.length > 0 ? (
                  <>
                    <div className="h-[260px] mb-6">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.callsByPhoneNumber} margin={{ top: 10, right: 10, left: -10, bottom: 30 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="phoneNumber" tick={{ fontSize: 10 }} tickLine={false} angle={-20} textAnchor="end" />
                          <YAxis tick={{ fontSize: 11 }} tickLine={false} />
                          <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                          <Bar dataKey="calls" name="Calls" fill={CHART_COLORS.blue} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-2">
                      {data.callsByPhoneNumber.map((item) => (
                        <div key={item.phoneNumber} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 hover:border-[#84CC16]/30 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-[#84CC16]/10">
                              <Phone className="h-4 w-4 text-[#84CC16]" />
                            </div>
                            <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{item.phoneNumber}</span>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="font-semibold text-gray-700 dark:text-gray-300">{item.calls} calls</span>
                            <Badge className="bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400 border-0 font-medium">
                              {item.minutes.toFixed(1)} min
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[200px] gap-3">
                    <div className="p-4 rounded-full bg-gray-100 dark:bg-white/5">
                      <Phone className="h-8 w-8 text-gray-400 dark:text-gray-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">No phone number data for the selected period</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  )
}
