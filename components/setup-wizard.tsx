"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Circle, Phone, MessageSquare, Bot, Rocket, Loader2, ArrowRight } from "lucide-react"
import Link from "next/link"
import { toast } from "@/components/ui/use-toast"

interface SetupStatus {
  hasPhoneNumber: boolean
  hasIntents: boolean
  hasSelectedVoiceAgent: boolean
  hasAssistant: boolean
  isLaunched: boolean
}

interface SetupWizardProps {
  onComplete?: () => void
}

export function SetupWizard({ onComplete }: SetupWizardProps) {
  const [status, setStatus] = useState<SetupStatus>({
    hasPhoneNumber: false,
    hasIntents: false,
    hasSelectedVoiceAgent: false,
    hasAssistant: false,
    isLaunched: false
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isLaunching, setIsLaunching] = useState(false)

  useEffect(() => {
    checkSetupStatus()
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

      // Check assistants
      const assistantsRes = await fetch('/api/assistants')
      const assistantsData = assistantsRes.ok ? await assistantsRes.json() : { assistants: [] }
      const hasAssistant = assistantsData.assistants?.length > 0
      
      // Check if voice agent is selected (assistant has voiceAgentId in config)
      const hasSelectedVoiceAgent = hasAssistant && assistantsData.assistants?.some((a: any) => 
        a.config?.voiceAgentId || a.config?.personality
      )

      // Check if assistant is launched (phone number linked to assistant)
      let isLaunched = false
      if (hasPhoneNumber && hasAssistant) {
        const phoneNumber = phoneData.phoneNumbers[0]
        isLaunched = !!phoneNumber.vapi_assistant_id
      }

      setStatus({
        hasPhoneNumber,
        hasIntents,
        hasSelectedVoiceAgent: hasSelectedVoiceAgent || hasAssistant, // If assistant exists, consider voice agent selected
        hasAssistant,
        isLaunched
      })
    } catch (error) {
      console.error('Error checking setup status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLaunch = async () => {
    try {
      setIsLaunching(true)
      
      // Get phone number and assistant
      const phoneRes = await fetch('/api/phone-numbers')
      const phoneData = await phoneRes.json()
      const phoneNumber = phoneData.phoneNumbers[0]

      const assistantsRes = await fetch('/api/assistants')
      const assistantsData = await assistantsRes.json()
      const assistant = assistantsData.assistants[0]

      if (!phoneNumber || !assistant) {
        throw new Error('Phone number or assistant not found')
      }

      const response = await fetch('/api/assistants/launch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phoneNumberId: phoneNumber.id,
          assistantId: assistant.id
        })
      })

      if (!response.ok) {
        throw new Error('Failed to launch assistant')
      }

      toast({
        title: "🎉 Assistant Launched!",
        description: "Your phone number is now active and ready to receive calls!",
      })

      await checkSetupStatus()
      
      if (onComplete) {
        onComplete()
      }
    } catch (error) {
      console.error('Error launching assistant:', error)
      toast({
        title: "Error",
        description: "Failed to launch assistant. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLaunching(false)
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

  const allComplete = status.hasPhoneNumber && status.hasIntents && status.hasSelectedVoiceAgent && status.hasAssistant && status.isLaunched

  if (allComplete) {
    return null // Don't show wizard if everything is complete
  }

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
    },
    {
      id: 'launch',
      title: 'Launch Assistant',
      description: 'Link your phone number to your assistant and activate it',
      icon: Rocket,
      completed: status.isLaunched,
      action: handleLaunch,
      loading: isLaunching,
      disabled: !status.hasPhoneNumber || !status.hasAssistant
    }
  ]

  return (
    <Card className="border-2 border-rose-500/20 bg-gradient-to-br from-rose-50/50 to-pink-50/50 dark:from-rose-950/20 dark:to-pink-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rocket className="h-5 w-5 text-rose-500" />
          Setup Your Assistant
        </CardTitle>
        <CardDescription>
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
              className={`flex items-start gap-4 p-4 rounded-lg border transition-all ${
                step.completed
                  ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                  : isActive
                  ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800'
                  : 'bg-muted border-border opacity-60'
              }`}
            >
              <div className={`flex-shrink-0 mt-1 ${
                step.completed ? 'text-green-600 dark:text-green-400' : 
                isActive ? 'text-rose-600 dark:text-rose-400' : 
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
                    <h3 className={`font-semibold flex items-center gap-2 ${
                      step.completed ? 'text-green-900 dark:text-green-100' :
                      isActive ? 'text-rose-900 dark:text-rose-100' :
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
                    <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                      Complete
                    </Badge>
                  )}
                </div>
                
                {!step.completed && isActive && (
                  <div className="mt-3">
                    {step.link ? (
                      <Button asChild size="sm" className="bg-rose-500 hover:bg-rose-600">
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
                        className="bg-rose-500 hover:bg-rose-600"
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

