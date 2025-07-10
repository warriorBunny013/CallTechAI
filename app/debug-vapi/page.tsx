"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function DebugVapiPage() {
  const [logs, setLogs] = useState<string[]>([])
  const [isTesting, setIsTesting] = useState(false)

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const testVapiStepByStep = async () => {
    setIsTesting(true)
    setLogs([])

    try {
      // Step 1: Check environment variables
      addLog("Step 1: Checking environment variables...")
      const apiKey = process.env.NEXT_PUBLIC_VAPI_API_KEY
      if (!apiKey) {
        throw new Error("NEXT_PUBLIC_VAPI_API_KEY not found")
      }
      addLog(`✅ API key found: ${apiKey.substring(0, 10)}...`)

      // Step 2: Test dynamic import
      addLog("Step 2: Testing dynamic import...")
      const VapiModule = await import('@vapi-ai/web')
      addLog("✅ Dynamic import successful")
      
      const Vapi = VapiModule.default
      addLog("✅ Default export found")

      // Step 3: Create Vapi instance
      addLog("Step 3: Creating Vapi instance...")
      const vapi = new Vapi(apiKey)
      addLog("✅ Vapi instance created")

      // Step 4: Test event listeners
      addLog("Step 4: Setting up event listeners...")
      
      vapi.on('call-start', () => {
        addLog("✅ Call started event triggered")
      })

      vapi.on('call-end', () => {
        addLog("✅ Call ended event triggered")
      })

      vapi.on('error', (error: any) => {
        addLog(`❌ Error event: ${error?.message || error}`)
      })

      vapi.on('message', (message: any) => {
        addLog(`✅ Message event: ${message.type}`)
      })

      addLog("✅ Event listeners set up successfully")

      // Step 5: Test assistant creation
      addLog("Step 5: Testing assistant creation...")
      const response = await fetch('/api/create-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          intents: [{
            intent_name: "Test Intent",
            example_user_phrases: ["Hello"],
            english_responses: ["Hi there!"],
            russian_responses: ["Привет!"]
          }]
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create assistant')
      }

      const data = await response.json()
      addLog(`✅ Assistant created: ${data.assistantId}`)

      // Step 6: Test starting a call
      addLog("Step 6: Testing call start...")
      try {
        await vapi.start(data.assistantId)
        addLog("✅ Call started successfully")
        
        // Stop the call after 2 seconds
        setTimeout(() => {
          vapi.stop()
          addLog("✅ Call stopped")
        }, 2000)
        
      } catch (error) {
        addLog(`❌ Call start failed: ${error}`)
      }

    } catch (error) {
      console.error('Debug error:', error)
      addLog(`❌ Error: ${error}`)
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Vapi Debug</h1>
        <p className="text-muted-foreground">
          Step-by-step debugging of Vapi integration
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Debug Test</CardTitle>
          <CardDescription>
            Run comprehensive tests to identify issues
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={testVapiStepByStep} 
            disabled={isTesting}
            className="w-full"
          >
            {isTesting ? "Running Tests..." : "Run Debug Tests"}
          </Button>

          {logs.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium">Debug Logs:</h3>
              <div className="max-h-96 overflow-y-auto bg-gray-100 dark:bg-gray-900 p-4 rounded-lg">
                {logs.map((log, index) => (
                  <div key={index} className="text-sm font-mono">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Environment Check</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Badge variant={process.env.NEXT_PUBLIC_VAPI_API_KEY ? "default" : "destructive"}>
                {process.env.NEXT_PUBLIC_VAPI_API_KEY ? "✅" : "❌"} Client API Key
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={process.env.VAPI_API_KEY ? "default" : "destructive"}>
                {process.env.VAPI_API_KEY ? "✅" : "❌"} Server API Key
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 