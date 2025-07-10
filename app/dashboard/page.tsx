"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight, Phone, MessageSquare, Clock, Play } from "lucide-react"
import Link from "next/link"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useState } from "react"

export default function DashboardPage() {
  const [assistantActive, setAssistantActive] = useState(true)

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to your CallTechAI dashboard. Manage and monitor your AI voice assistant.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2">
            <Switch id="assistant-status" defaultChecked onChange={(checked) => setAssistantActive(checked)} />
            <Label htmlFor="assistant-status">Assistant Active</Label>
          </div>
          {assistantActive ? (
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

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">127</div>
            <p className="text-xs text-muted-foreground">+14% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Call Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3m 24s</div>
            <p className="text-xs text-muted-foreground">-12s from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Intents</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">+2 from last month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Setup</CardTitle>
            <CardDescription>Configure your AI voice assistant in minutes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900">
                    <span className="text-sm font-bold text-rose-700 dark:text-rose-300">1</span>
                  </div>
                  <span>Configure basic settings</span>
                </div>
                <div className="text-sm text-muted-foreground">Done</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900">
                    <span className="text-sm font-bold text-rose-700 dark:text-rose-300">2</span>
                  </div>
                  <span>Set up intents</span>
                </div>
                <div className="text-sm text-muted-foreground">In progress</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900">
                    <span className="text-sm font-bold text-rose-700 dark:text-rose-300">3</span>
                  </div>
                  <span>Configure working hours</span>
                </div>
                <div className="text-sm text-muted-foreground">Pending</div>
              </div>
            </div>
            <div className="flex flex-col space-y-2 sm:flex-row sm:space-x-2 sm:space-y-0">
              <Button asChild className="w-full bg-rose-500 hover:bg-rose-600">
                <Link href="/dashboard/customization">
                  Continue Setup <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" className="w-full">
                <Play className="mr-2 h-4 w-4 text-rose-500" />
                Try Demo Call
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent Calls</CardTitle>
            <CardDescription>Your most recent customer interactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { number: "+1 (555) 123-4567", time: "Today, 10:23 AM", duration: "2m 15s" },
                { number: "+1 (555) 987-6543", time: "Today, 9:45 AM", duration: "4m 32s" },
                { number: "+1 (555) 234-5678", time: "Yesterday, 3:12 PM", duration: "1m 47s" },
                { number: "+1 (555) 876-5432", time: "Yesterday, 11:30 AM", duration: "5m 03s" },
              ].map((call, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">{call.number}</p>
                    <p className="text-sm text-muted-foreground">{call.time}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">{call.duration}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Play className="h-4 w-4 text-rose-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="mt-4 w-full">
              <Link href="/dashboard/recordings" className="flex w-full items-center justify-center">
                View All Calls
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
