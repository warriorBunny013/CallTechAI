"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"

export default function TestVapiPage() {
  const [isTesting, setIsTesting] = useState(false)
  const [result, setResult] = useState<string>("")
  const [error, setError] = useState<string>("")

  const testVapiConnection = async () => {
    try {
      setIsTesting(true)
      setError("")
      setResult("")

      // Test API key configuration
      const apiKey = process.env.NEXT_PUBLIC_VAPI_API_KEY
      if (!apiKey || apiKey === 'your_vapi_api_key_here') {
        setError("Vapi API key not configured")
        return
      }

      // Test assistant creation
      const testIntents = [
        {
          intent_name: "Test Intent",
          example_user_phrases: ["Hello", "Hi there"],
          english_responses: ["Hello! How can I help you?"],
          russian_responses: ["Привет! Как я могу помочь?"]
        }
      ]

      const response = await fetch('/api/create-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ intents: testIntents }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create assistant')
      }

      const data = await response.json()
      setResult(`✅ Assistant created successfully!\nAssistant ID: ${data.assistantId}`)

    } catch (error) {
      console.error('Test error:', error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      setError(`Test failed: ${errorMessage}`)
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Vapi Integration Test</h1>
        <p className="text-muted-foreground">
          Test your Vapi configuration and assistant creation
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuration Test</CardTitle>
          <CardDescription>
            Test your Vapi API key and assistant creation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="text-sm">
                {process.env.NEXT_PUBLIC_VAPI_API_KEY && 
                 process.env.NEXT_PUBLIC_VAPI_API_KEY !== 'your_vapi_api_key_here' 
                  ? "✅ API Key Configured" 
                  : "❌ API Key Not Configured"}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm">
                {process.env.VAPI_API_KEY && 
                 process.env.VAPI_API_KEY !== 'your_vapi_api_key_here' 
                  ? "✅ Server API Key Configured" 
                  : "❌ Server API Key Not Configured"}
              </span>
            </div>
          </div>

          <Button 
            onClick={testVapiConnection} 
            disabled={isTesting}
            className="w-full"
          >
            {isTesting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              "Test Vapi Integration"
            )}
          </Button>

          {result && (
            <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <pre className="text-sm whitespace-pre-wrap">{result}</pre>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Environment Variables</CardTitle>
          <CardDescription>
            Required environment variables for Vapi integration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div>
              <code className="bg-muted px-2 py-1 rounded">NEXT_PUBLIC_VAPI_API_KEY</code>
              <p className="text-muted-foreground mt-1">
                Your Vapi public API key for client-side calls
              </p>
            </div>
            <div>
              <code className="bg-muted px-2 py-1 rounded">VAPI_API_KEY</code>
              <p className="text-muted-foreground mt-1">
                Your Vapi server API key for assistant creation
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 