"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight, Phone, MessageSquare, Clock, Play, Loader2, RefreshCw } from "lucide-react"
import Link from "next/link"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useState, useEffect, Suspense } from "react"
import { useDashboardStats } from "@/hooks/use-dashboard-stats"
import { useAssistantStatus } from "@/hooks/use-assistant-status"
import { useSubscription } from "@/hooks/use-subscription"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { useSearchParams } from "next/navigation"
import { SetupWizard } from "@/components/setup-wizard"

function DashboardContent() {
  const { stats, loading, error, refetch } = useDashboardStats()
  const { status, loading: statusLoading, error: statusError, updateStatus } = useAssistantStatus()
  const { hasActiveSubscription, subscription } = useSubscription()
  const searchParams = useSearchParams()
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [showWizard, setShowWizard] = useState(true)

  // Show success message if we just completed payment verification
  useEffect(() => {
    const sessionId = searchParams.get('session_id')
    if (sessionId && hasActiveSubscription) {
      setShowSuccessMessage(true)
      toast({
        title: "Payment Successful!",
        description: "Your subscription has been activated successfully.",
      })
      // Clear the success message after showing it
      const timer = setTimeout(() => setShowSuccessMessage(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [searchParams, hasActiveSubscription])

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to your CallTechAI dashboard. Manage and monitor your AI voice assistant.
          </p>
          {hasActiveSubscription && subscription && (
            <div className="mt-2 flex items-center space-x-2">
              <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                {subscription.plan_type.charAt(0).toUpperCase() + subscription.plan_type.slice(1)} Plan
              </Badge>
              <Badge variant="outline">
                {subscription.billing_cycle.charAt(0).toUpperCase() + subscription.billing_cycle.slice(1)}
              </Badge>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {showSuccessMessage && (
            <div className="flex items-center space-x-2 text-sm text-green-600 dark:text-green-400">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <span>Payment successful!</span>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
            disabled={loading}
            className="mr-2"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <div className="flex items-center space-x-2">
            <Switch 
              id="assistant-status" 
              checked={status.isActive} 
              onCheckedChange={async (checked) => {
                try {
                  await updateStatus(checked)
                  toast({
                    title: `Assistant ${checked ? 'Activated' : 'Deactivated'}`,
                    description: `Your AI voice assistant is now ${checked ? 'active and ready to answer calls' : 'inactive and will not answer calls'}.`,
                  })
                } catch (error) {
                  console.error('Failed to update assistant status:', error)
                  toast({
                    title: "Error",
                    description: "Failed to update assistant status. Please try again.",
                    variant: "destructive",
                  })
                }
              }}
              disabled={statusLoading}
            />
            {statusLoading && (
              <Loader2 className="h-4 w-4 animate-spin ml-2" />
            )}
            <Label htmlFor="assistant-status">Assistant Active</Label>
          </div>
          {statusLoading ? (
            <div className="ml-2 h-6 w-16 bg-muted animate-pulse rounded"></div>
          ) : status.isActive ? (
            <Badge variant="outline" className="ml-2 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
              Online
            </Badge>
          ) : (
            <Badge variant="outline" className="ml-2 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
              Offline
            </Badge>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
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
                <div className="text-2xl font-bold">{stats.totalCalls}</div>
                <p className="text-xs text-muted-foreground">
                  {error ? 'Error loading data' : 'Live data from VAPI'}
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Call Duration</CardTitle>
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
                <div className="text-2xl font-bold">{stats.avgDuration}</div>
                <p className="text-xs text-muted-foreground">
                  {error ? 'Error loading data' : 'Live data from VAPI'}
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Intents</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <div className="h-8 w-16 bg-muted animate-pulse rounded"></div>
                <div className="h-3 w-24 bg-muted animate-pulse rounded"></div>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.intentsCount}</div>
                <p className="text-xs text-muted-foreground">
                  {error ? 'Error loading data' : 'Live data from Supabase'}
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assistant Status</CardTitle>
            <div className={`h-2 w-2 rounded-full ${stats.assistantActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <div className="h-8 w-16 bg-muted animate-pulse rounded"></div>
                <div className="h-3 w-24 bg-muted animate-pulse rounded"></div>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.assistantActive ? 'Active' : 'Inactive'}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.assistantActive ? 'Ready to answer calls' : 'Not answering calls'}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
          <div className="flex items-center space-x-2">
            <div className="h-2 w-2 rounded-full bg-red-500"></div>
            <p className="text-sm font-medium text-red-800 dark:text-red-200">
              Error loading dashboard data: {error}
            </p>
          </div>
          <p className="mt-2 text-sm text-red-700 dark:text-red-300">
            Some data may not be displayed correctly. Please check your VAPI API key and try refreshing.
          </p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {showWizard ? (
          <SetupWizard onComplete={() => {
            setShowWizard(false)
            refetch()
          }} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Setup Complete</CardTitle>
              <CardDescription>Your assistant is configured and ready to use</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 p-4">
                  <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    <span className="text-sm font-medium">All setup steps completed!</span>
                  </div>
                </div>
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/dashboard/phone-numbers">
                    Manage Phone Numbers
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader>
            <CardTitle>Recent Calls</CardTitle>
            <CardDescription>Your most recent customer interactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                // Loading skeleton for recent calls
                Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="h-4 w-24 bg-muted animate-pulse rounded"></div>
                      <div className="h-3 w-20 bg-muted animate-pulse rounded"></div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="h-4 w-12 bg-muted animate-pulse rounded"></div>
                      <div className="h-8 w-8 bg-muted animate-pulse rounded"></div>
                    </div>
                  </div>
                ))
              ) : stats.recentCalls.length > 0 ? (
                stats.recentCalls.map((call, index) => (
                  <div key={call.id || index} className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">
                        {call.isWebCall ? 'Web Call' : call.phoneNumber || 'Unknown Number'}
                      </p>
                      <p className="text-sm text-muted-foreground">{call.time}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">{call.duration}</span>
                      <div className={`px-2 py-1 rounded-full text-xs ${
                        call.status === 'completed' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' 
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
                      }`}>
                        {call.status === 'completed' ? '✓' : '✗'}
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Play className="h-4 w-4 text-rose-500" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : error ? (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">Error loading calls</p>
                  <p className="text-xs text-muted-foreground mt-1">Check your VAPI API key</p>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">No recent calls found</p>
                  <p className="text-xs text-muted-foreground mt-1">Start making calls to see them here</p>
                </div>
              )}
            </div>
                          <Button variant="outline" className="mt-4 w-full" asChild>
                <Link href="/dashboard/recordings" className="flex w-full items-center justify-center">
                  View All Calls
                </Link>
              </Button>
          </CardContent>
        </Card>
      </div>
      <Toaster />
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to your CallTechAI dashboard. Manage and monitor your AI voice assistant.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-24 bg-muted animate-pulse rounded"></div>
                <div className="h-4 w-4 bg-muted animate-pulse rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-8 w-16 bg-muted animate-pulse rounded"></div>
                  <div className="h-3 w-24 bg-muted animate-pulse rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}
