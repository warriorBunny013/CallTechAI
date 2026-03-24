"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Phone, MessageSquare, Clock, Play, Loader2, RefreshCw, ArrowUpRight, TrendingUp, Activity } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { useState, useEffect, Suspense } from "react"
import { useDashboardStats } from "@/hooks/use-dashboard-stats"
import { useCallLogs } from "@/hooks/use-call-logs"
import { useSubscription } from "@/hooks/use-subscription"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { useSearchParams } from "next/navigation"
import { SetupWizard } from "@/components/setup-wizard"

function formatDuration(seconds: number): string {
  if (!seconds) return "0m 0s"
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m === 0 ? `${s}s` : `${m}m ${String(s).padStart(2, "0")}s`
}

function DashboardContent() {
  const { stats, loading, error, refetch } = useDashboardStats()
  const { calls, loading: callsLoading, refreshCallLogs } = useCallLogs()
  const { hasActiveSubscription, subscription } = useSubscription()
  const searchParams = useSearchParams()
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [showWizard, setShowWizard] = useState(true)

  const totalCalls = calls.length
  const callsWithDuration = calls.filter((c) => (c.durationSeconds ?? 0) > 0)
  const totalSeconds = callsWithDuration.reduce((sum, c) => sum + (c.durationSeconds ?? 0), 0)
  const avgDurationSeconds = callsWithDuration.length > 0 ? Math.floor(totalSeconds / callsWithDuration.length) : 0
  const avgDuration = formatDuration(avgDurationSeconds)
  const recentCalls = calls.slice(0, 5)

  // Calculate successful calls percentage
  const successfulCalls = calls.filter(c => c.status === 'pass' || c.status === 'completed').length
  const successRate = totalCalls > 0 ? Math.round((successfulCalls / totalCalls) * 100) : 0

  const handleRefresh = () => {
    refetch()
    refreshCallLogs()
  }

  // Show success message if we just completed payment verification
  useEffect(() => {
    const sessionId = searchParams.get('session_id')
    if (sessionId && hasActiveSubscription) {
      setShowSuccessMessage(true)
      toast({
        title: "Payment Successful!",
        description: "Your subscription has been activated successfully.",
      })
      const timer = setTimeout(() => setShowSuccessMessage(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [searchParams, hasActiveSubscription])

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
        
        * {
          font-family: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
      `}</style>
      
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-[#0A0A0A] dark:via-black dark:to-[#0A0A0A] p-4 md:p-6 lg:p-8">
        <div className="max-w-[1600px] mx-auto space-y-6 md:space-y-8">
          {/* Header */}
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-white dark:via-gray-100 dark:to-white bg-clip-text text-transparent">
                  Dashboard
                </h1>
                {showSuccessMessage && (
                  <Badge className="bg-[#84CC16] text-black border-0 font-semibold animate-in fade-in slide-in-from-top-2">
                    Payment Successful!
                  </Badge>
                )}
              </div>
              <p className="text-base md:text-lg text-gray-600 dark:text-gray-400 max-w-2xl">
                Monitor your AI voice assistant performance and manage your account
              </p>
              {hasActiveSubscription && subscription && (
                <div className="flex items-center gap-2 flex-wrap pt-2">
                  <Badge className="bg-[#84CC16]/10 text-[#84CC16] border border-[#84CC16]/20 font-semibold">
                    {subscription.plan_type.charAt(0).toUpperCase() + subscription.plan_type.slice(1)} Plan
                  </Badge>
                  <Badge variant="outline" className="border-gray-300 dark:border-gray-700 font-medium">
                    {subscription.billing_cycle.charAt(0).toUpperCase() + subscription.billing_cycle.slice(1)}
                  </Badge>
                </div>
              )}
            </div>
            <Button
              onClick={handleRefresh}
              disabled={loading || callsLoading}
              className="bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 shadow-sm font-semibold self-start"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading || callsLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {/* Total Calls */}
            <div className="group relative p-6 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-[#84CC16]/50 dark:hover:border-[#84CC16]/50 hover:shadow-lg hover:shadow-[#84CC16]/5 transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-xl bg-[#84CC16]/10 dark:bg-[#84CC16]/10 group-hover:scale-110 transition-transform duration-300">
                  <Phone className="h-5 w-5 text-[#84CC16]" />
                </div>
                <TrendingUp className="h-4 w-4 text-gray-400 dark:text-gray-600" />
              </div>
              {callsLoading ? (
                <div className="space-y-2">
                  <div className="h-8 w-20 bg-gray-200 dark:bg-white/10 animate-pulse rounded"></div>
                  <div className="h-3 w-24 bg-gray-200 dark:bg-white/10 animate-pulse rounded"></div>
                </div>
              ) : (
                <>
                  <div className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-1">
                    {totalCalls}
                  </div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Calls
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {error ? 'Error loading' : 'All time'}
                  </p>
                </>
              )}
            </div>

            {/* Avg Duration */}
            <div className="group relative p-6 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-[#84CC16]/50 dark:hover:border-[#84CC16]/50 hover:shadow-lg hover:shadow-[#84CC16]/5 transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-xl bg-blue-500/10 dark:bg-blue-500/10 group-hover:scale-110 transition-transform duration-300">
                  <Clock className="h-5 w-5 text-blue-500" />
                </div>
                <Activity className="h-4 w-4 text-gray-400 dark:text-gray-600" />
              </div>
              {callsLoading ? (
                <div className="space-y-2">
                  <div className="h-8 w-20 bg-gray-200 dark:bg-white/10 animate-pulse rounded"></div>
                  <div className="h-3 w-24 bg-gray-200 dark:bg-white/10 animate-pulse rounded"></div>
                </div>
              ) : (
                <>
                  <div className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-1">
                    {avgDuration}
                  </div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Avg. Call Duration
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {error ? 'Error loading' : `From ${callsWithDuration.length} calls`}
                  </p>
                </>
              )}
            </div>

            {/* Success Rate */}
            <div className="group relative p-6 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-[#84CC16]/50 dark:hover:border-[#84CC16]/50 hover:shadow-lg hover:shadow-[#84CC16]/5 transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-xl bg-green-500/10 dark:bg-green-500/10 group-hover:scale-110 transition-transform duration-300">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </div>
                <div className="text-xs font-bold text-green-600 dark:text-green-400">
                  {successRate > 80 ? '🔥' : ''}
                </div>
              </div>
              {callsLoading ? (
                <div className="space-y-2">
                  <div className="h-8 w-20 bg-gray-200 dark:bg-white/10 animate-pulse rounded"></div>
                  <div className="h-3 w-24 bg-gray-200 dark:bg-white/10 animate-pulse rounded"></div>
                </div>
              ) : (
                <>
                  <div className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-1">
                    {successRate}%
                  </div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Success Rate
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {successfulCalls} of {totalCalls} calls
                  </p>
                </>
              )}
            </div>

            {/* Assistant Status */}
            <div className="group relative p-6 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-[#84CC16]/50 dark:hover:border-[#84CC16]/50 hover:shadow-lg hover:shadow-[#84CC16]/5 transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-xl bg-purple-500/10 dark:bg-purple-500/10 group-hover:scale-110 transition-transform duration-300">
                  <MessageSquare className="h-5 w-5 text-purple-500" />
                </div>
                <div className={`h-2.5 w-2.5 rounded-full ${stats.assistantActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              </div>
              {loading ? (
                <div className="space-y-2">
                  <div className="h-8 w-20 bg-gray-200 dark:bg-white/10 animate-pulse rounded"></div>
                  <div className="h-3 w-24 bg-gray-200 dark:bg-white/10 animate-pulse rounded"></div>
                </div>
              ) : (
                <>
                  <div className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-1">
                    {stats.assistantActive ? 'Live' : 'Setup'}
                  </div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Assistant Status
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {stats.assistantActive ? `${stats.intentsCount} intents active` : 'Complete setup'}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="rounded-2xl border-2 border-red-500/20 bg-red-50 dark:bg-red-950/20 p-6 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <div className="h-5 w-5 rounded-full bg-red-500"></div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-900 dark:text-red-100 mb-1">
                    Error loading dashboard data
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    {error}. Please check your VAPI API key in settings and try refreshing.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            {/* Setup Wizard or Completion Card */}
            <div className="lg:col-span-2">
              {showWizard ? (
                <SetupWizard onComplete={() => {
                  setShowWizard(false)
                  handleRefresh()
                }} />
              ) : (
                <div className="p-8 rounded-2xl bg-gradient-to-br from-[#84CC16]/10 via-[#84CC16]/5 to-transparent border border-[#84CC16]/20 dark:border-[#84CC16]/20">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="p-3 rounded-xl bg-[#84CC16] shadow-lg shadow-[#84CC16]/25">
                      <svg className="h-6 w-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Setup Complete!
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        Your AI assistant is configured and ready to handle calls
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Button 
                      className="bg-[#84CC16] hover:bg-[#65A30D] text-black font-semibold h-12 rounded-xl shadow-lg shadow-[#84CC16]/25 hover:shadow-[#84CC16]/40 transition-all" 
                      asChild
                    >
                      <Link href="/dashboard/phone-numbers">
                        Manage Phone Numbers
                        <ArrowUpRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    <Button 
                      variant="outline"
                      className="border-2 border-gray-300 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 font-semibold h-12 rounded-xl"
                      asChild
                    >
                      <Link href="/dashboard/intents">
                        View Intents
                        <ArrowUpRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Recent Calls */}
            <div className="lg:col-span-1">
              <div className="p-6 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      Recent Calls
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Latest customer interactions
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[#84CC16] hover:text-[#65A30D] hover:bg-[#84CC16]/10 font-semibold"
                    asChild
                  >
                    <Link href="/dashboard/recordings">
                      View all
                      <ArrowUpRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </div>

                <div className="space-y-3">
                  {callsLoading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <div key={index} className="p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                        <div className="flex items-center justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="h-4 w-28 bg-gray-200 dark:bg-white/10 animate-pulse rounded"></div>
                            <div className="h-3 w-20 bg-gray-200 dark:bg-white/10 animate-pulse rounded"></div>
                          </div>
                          <div className="h-8 w-8 bg-gray-200 dark:bg-white/10 animate-pulse rounded-full"></div>
                        </div>
                      </div>
                    ))
                  ) : recentCalls.length > 0 ? (
                    recentCalls.map((call, index) => (
                      <div 
                        key={call.id || index} 
                        className="group p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-[#84CC16]/50 hover:bg-[#84CC16]/5 dark:hover:bg-[#84CC16]/10 transition-all duration-300"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-white truncate mb-1">
                              {call.isWebCall ? '🌐 Web Call' : `📞 ${call.phoneNumber || 'Unknown'}`}
                            </p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs text-gray-600 dark:text-gray-400">
                                {call.time}
                              </span>
                              <span className="text-xs text-gray-400 dark:text-gray-500">•</span>
                              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                {call.duration}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={`px-2 py-1 rounded-full text-xs font-bold ${
                              call.status === 'pass' || call.status === 'completed'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                            }`}>
                              {call.status === 'pass' || call.status === 'completed' ? '✓' : '✗'}
                            </div>
                            {call.recordingUrl && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 hover:bg-[#84CC16]/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" 
                                asChild
                              >
                                <Link href={call.recordingUrl} target="_blank" rel="noopener noreferrer">
                                  <Play className="h-4 w-4 text-[#84CC16]" />
                                </Link>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : error ? (
                    <div className="text-center py-12">
                      <div className="inline-flex p-4 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
                        <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Error loading calls</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Check your VAPI API key</p>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="inline-flex p-4 rounded-full bg-gray-100 dark:bg-white/5 mb-4">
                        <Phone className="h-6 w-6 text-gray-400 dark:text-gray-600" />
                      </div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">No calls yet</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Calls will appear here once received</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Toaster />
    </>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-[#0A0A0A] dark:via-black dark:to-[#0A0A0A] p-4 md:p-6 lg:p-8">
        <div className="max-w-[1600px] mx-auto space-y-6 md:gap-8">
          <div className="flex flex-col space-y-2">
            <div className="h-12 w-64 bg-gray-200 dark:bg-white/10 animate-pulse rounded-xl"></div>
            <div className="h-6 w-96 bg-gray-200 dark:bg-white/10 animate-pulse rounded-lg"></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-6 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10">
                <div className="space-y-4">
                  <div className="h-12 w-12 bg-gray-200 dark:bg-white/10 animate-pulse rounded-xl"></div>
                  <div className="h-10 w-20 bg-gray-200 dark:bg-white/10 animate-pulse rounded"></div>
                  <div className="h-4 w-32 bg-gray-200 dark:bg-white/10 animate-pulse rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}