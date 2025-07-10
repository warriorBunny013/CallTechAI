"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import VapiWidget from "@/components/vapi-widget"
import { Intent } from "@/lib/supabase"

export default function DemoPage() {
  const [intents, setIntents] = useState<Intent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>("")
  const [apiKeyStatus, setApiKeyStatus] = useState<string>("")
  const [assistantId, setAssistantId] = useState<string>("")
  const [isCreatingAssistant, setIsCreatingAssistant] = useState(false)

  // Check API key status
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_VAPI_API_KEY
    if (!apiKey || apiKey === 'your_vapi_api_key_here') {
      setApiKeyStatus("⚠️ Vapi API key not configured")
    } else {
      setApiKeyStatus("✅ Vapi API key configured")
    }
  }, [])

  // Fetch intents from Supabase
  useEffect(() => {
    fetchIntents()
  }, [])

  const fetchIntents = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/intents')
      if (!response.ok) {
        throw new Error('Failed to fetch intents')
      }
      const data = await response.json()
      setIntents(data.intents || [])
    } catch (error) {
      console.error('Error fetching intents:', error)
      setError('Failed to load intents')
    } finally {
      setIsLoading(false)
    }
  }

  const createAssistant = async () => {
    try {
      setIsCreatingAssistant(true)
      setError("")
      
      const response = await fetch('/api/create-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ intents }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create assistant')
      }

      const data = await response.json()
      setAssistantId(data.assistantId)
      return data.assistantId
    } catch (error) {
      console.error('Error creating assistant:', error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      setError(`Failed to create assistant: ${errorMessage}`)
      throw error
    } finally {
      setIsCreatingAssistant(false)
    }
  }

  const handleStartCall = async () => {
    console.log('handleStartCall called, assistantId:', assistantId)
    if (!assistantId) {
      console.log('Creating assistant...')
      try {
        await createAssistant()
        console.log('Assistant created successfully')
      } catch (error) {
        console.error('Error creating assistant:', error)
        // Error already set in createAssistant
        return
      }
    } else {
      console.log('Assistant already exists:', assistantId)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading intents...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Voice AI Demo</h1>
        <p className="text-muted-foreground">
          Test your AI voice assistant with the intents from your database
        </p>
      </div>

      {/* API Key Status */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="text-sm">{apiKeyStatus}</span>
            </div>
            {apiKeyStatus.includes("not configured") && (
              <div className="text-sm text-amber-600 dark:text-amber-400">
                <p>To use the voice demo, you need to:</p>
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li>Get a Vapi API key from <a href="https://vapi.ai" target="_blank" rel="noopener noreferrer" className="underline">vapi.ai</a></li>
                  <li>Update the <code className="bg-muted px-1 rounded">NEXT_PUBLIC_VAPI_API_KEY</code> and <code className="bg-muted px-1 rounded">VAPI_API_KEY</code> in your <code className="bg-muted px-1 rounded">.env.local</code> file</li>
                  <li>Restart your development server</li>
                </ol>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Assistant Status */}
      <Card>
        <CardHeader>
          <CardTitle>Assistant Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {assistantId ? (
              <div className="flex items-center space-x-2">
                <Badge variant="default">✅ Assistant Created</Badge>
                <span className="text-sm text-muted-foreground">ID: {assistantId}</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">⏳ No Assistant</Badge>
                <span className="text-sm text-muted-foreground">
                  Assistant will be created when you start your first call
                </span>
              </div>
            )}
            {isCreatingAssistant && (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Creating assistant...</span>
              </div>
            )}
            {error && (
              <div className="text-red-500 text-sm">
                {error}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Available Intents */}
      <Card>
        <CardHeader>
          <CardTitle>Available Intents ({intents.length})</CardTitle>
          <CardDescription>
            These intents will be used by the AI assistant during the call
          </CardDescription>
        </CardHeader>
        <CardContent>
          {intents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No intents available</p>
              <p className="text-sm mt-2">
                Create some intents in the dashboard to test the voice assistant
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {intents.map((intent) => (
                <div key={intent.id} className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">{intent.intent_name}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <h5 className="font-medium text-muted-foreground mb-1">
                        Example Phrases:
                      </h5>
                      <ul className="space-y-1">
                        {intent.example_user_phrases.slice(0, 3).map((phrase, index) => (
                          <li key={index} className="text-muted-foreground">
                            • {phrase}
                          </li>
                        ))}
                        {intent.example_user_phrases.length > 3 && (
                          <li className="text-muted-foreground">
                            • ... and {intent.example_user_phrases.length - 3} more
                          </li>
                        )}
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium text-muted-foreground mb-1">
                        Responses:
                      </h5>
                      <div className="space-y-2">
                        <div>
                          <span className="text-xs text-muted-foreground">English:</span>
                          <p className="text-sm">{intent.english_responses[0]}</p>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">Russian:</span>
                          <p className="text-sm">{intent.russian_responses[0]}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Configure your Vapi API keys in the .env.local file</li>
            <li>Create some intents in the dashboard</li>
            <li>Click the voice widget button in the bottom-right corner</li>
            <li>Ask questions that match your defined intents</li>
            <li>The AI will respond based on your configured responses</li>
            <li>Watch the live transcript to see the conversation</li>
          </ol>
        </CardContent>
      </Card>

      {/* Vapi Widget */}
      {apiKeyStatus.includes("configured") && intents.length > 0 && (
        <>
          <div className="text-sm text-muted-foreground mb-2">
            Debug: API Key configured: {apiKeyStatus.includes("configured") ? "Yes" : "No"}, 
            Intents count: {intents.length}, 
            Assistant ID: {assistantId || "None"}
          </div>
          <VapiWidget
            apiKey={process.env.NEXT_PUBLIC_VAPI_API_KEY!}
            assistantId={assistantId}
            config={{}}
            onStartCall={handleStartCall}
          />
        </>
      )}
    </div>
  )
} 