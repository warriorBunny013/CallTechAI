"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Circle, Phone, MessageSquare, Bot, Loader2, ArrowRight } from "lucide-react"
import Link from "next/link"

interface SetupStatus {
  hasPhoneNumber: boolean
  hasIntents: boolean
  hasSelectedVoiceAgent: boolean
  hasAssistant: boolean
}

interface SetupWizardProps {
  onComplete?: () => void
}

export function SetupWizard({ onComplete }: SetupWizardProps) {
  const [status, setStatus] = useState<SetupStatus>({
    hasPhoneNumber: false,
    hasIntents: false,
    hasSelectedVoiceAgent: false,
    hasAssistant: false
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkSetupStatus()
  }, [])

  // Refetch when page becomes visible (e.g. user returns from Assistants page after saving)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkSetupStatus()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  const checkSetupStatus = async () => {
    try {
      setIsLoading(true)
      
      // Check phone numbers
      const phoneRes = await fetch('/api/phone-numbers')
      const phoneData = phoneRes.ok ? await phoneRes.json() : { phoneNumbers: [] }
      const hasPhoneNumber = phoneData.phoneNumbers?.length > 0

      // Check intents
      const intentsRes = await fetch('/api/intents')
      const intentsData = intentsRes.ok ? await intentsRes.json() : { intents: [] }
      const hasIntents = intentsData.intents?.length > 0

      // Check organisation's selected voice agent (saved in Assistants page)
      const orgRes = await fetch('/api/organisation')
      const orgData = orgRes.ok ? await orgRes.json() : { organisation: null }
      const selectedVoiceAgentId = orgData.organisation?.selected_voice_agent_id ?? null
      const hasSelectedVoiceAgent = !!selectedVoiceAgentId
      const hasAssistant = hasSelectedVoiceAgent

      setStatus({
        hasPhoneNumber,
        hasIntents,
        hasSelectedVoiceAgent,
        hasAssistant
      })
    } catch (error) {
      console.error('Error checking setup status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  const allComplete = status.hasPhoneNumber && status.hasIntents && status.hasSelectedVoiceAgent && status.hasAssistant

  const steps = [
    {
      id: 'phone',
      title: 'Add Phone Number',
      description: 'Create or import a phone number for your assistant',
      icon: Phone,
      completed: status.hasPhoneNumber,
      link: '/dashboard/phone-numbers'
    },
    {
      id: 'intents',
      title: 'Create Intents',
      description: 'Define how your assistant responds to different questions',
      icon: MessageSquare,
      completed: status.hasIntents,
      link: '/dashboard/intents'
    },
    {
      id: 'assistant',
      title: 'Choose & Create Assistant',
      description: 'Select a voice agent personality and create your assistant',
      icon: Bot,
      completed: status.hasAssistant,
      link: '/dashboard/assistants'
    }
  ]

  return (
    <Card className="border-2 border-lime-500/20 bg-gradient-to-br from-lime-50/50 to-lime-100/30 dark:from-lime-950/20 dark:to-lime-900/10 shadow-xl rounded-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Bot className="h-5 w-5 text-lime-500" />
          Setup Your Assistant
        </CardTitle>
        <CardDescription className="text-base">
          Follow these steps to get your AI voice assistant up and running
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {steps.map((step, index) => {
          const Icon = step.icon
          const isActive = !step.completed && steps.slice(0, index).every(s => s.completed)
          
          return (
            <div
              key={step.id}
              className={`flex items-start gap-4 p-5 rounded-xl border-2 transition-all duration-300 ${
                step.completed
                  ? 'bg-green-50 dark:bg-green-950/20 border-green-300 dark:border-green-700 shadow-md'
                  : isActive
                  ? 'bg-lime-50 dark:bg-lime-950/20 border-lime-300 dark:border-lime-700 shadow-lg'
                  : 'bg-muted border-border opacity-60'
              }`}
            >
              <div className={`flex-shrink-0 mt-1 ${
                step.completed ? 'text-green-600 dark:text-green-400' : 
                isActive ? 'text-lime-600 dark:text-lime-400' : 
                'text-muted-foreground'
              }`}>
                {step.completed ? (
                  <CheckCircle2 className="h-6 w-6" />
                ) : (
                  <Circle className="h-6 w-6" />
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className={`font-bold flex items-center gap-2 text-base ${
                      step.completed ? 'text-green-900 dark:text-green-100' :
                      isActive ? 'text-lime-900 dark:text-lime-100' :
                      'text-muted-foreground'
                    }`}>
                      <Icon className="h-4 w-4" />
                      {step.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {step.description}
                    </p>
                  </div>
                  
                  {step.completed && (
                    <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 border-green-300 dark:border-green-700">
                      Complete
                    </Badge>
                  )}
                </div>
                
                {!step.completed && isActive && (
                  <div className="mt-3">
                    {step.link ? (
                      <Button asChild size="sm" className="bg-lime-500 hover:bg-lime-600 text-black font-semibold shadow-md hover:shadow-lg transition-all duration-200">
                        <Link href={step.link}>
                          Go to {step.title}
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Link>
                      </Button>
                    ) : step.action ? (
                      <Button
                        size="sm"
                        onClick={step.action}
                        disabled={step.disabled || step.loading}
                        className="bg-lime-500 hover:bg-lime-600 text-black font-semibold shadow-md hover:shadow-lg transition-all duration-200"
                      >
                        {step.loading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            {step.title}
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </>
                        )}
                      </Button>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          )
        })}
        
        {allComplete && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-semibold">Setup Complete!</span>
            </div>
            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
              Your assistant is now live and ready to receive calls!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

