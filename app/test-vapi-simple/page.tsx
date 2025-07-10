"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function TestVapiSimplePage() {
  const [status, setStatus] = useState<string>("")
  const [error, setError] = useState<string>("")

  const testVapiSDK = async () => {
    try {
      setStatus("Testing Vapi SDK...")
      setError("")

      // Test if Vapi is available
      const Vapi = (await import('@vapi-ai/web')).default
      setStatus("✅ Vapi SDK imported successfully")

      // Test creating Vapi instance
      const apiKey = process.env.NEXT_PUBLIC_VAPI_API_KEY
      if (!apiKey) {
        throw new Error("API key not found")
      }

      const vapi = new Vapi(apiKey)
      setStatus("✅ Vapi instance created successfully")

      // Test event listeners
      vapi.on('call-start', () => {
        console.log('Call started')
        setStatus("✅ Call started event working")
      })

      vapi.on('error', (error: any) => {
        console.error('Vapi error:', error)
        setError(`Error: ${error?.message || error}`)
      })

      setStatus("✅ Vapi SDK is working correctly")

    } catch (error) {
      console.error('Test error:', error)
      setError(`Test failed: ${error}`)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Simple Vapi Test</h1>
        <p className="text-muted-foreground">
          Test basic Vapi SDK functionality
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vapi SDK Test</CardTitle>
          <CardDescription>
            Test if the Vapi web SDK is working correctly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={testVapiSDK} className="w-full">
            Test Vapi SDK
          </Button>

          {status && (
            <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <p className="text-sm">{status}</p>
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
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div>
              <strong>NEXT_PUBLIC_VAPI_API_KEY:</strong>
              <p className="text-muted-foreground">
                {process.env.NEXT_PUBLIC_VAPI_API_KEY ? 
                  `${process.env.NEXT_PUBLIC_VAPI_API_KEY.substring(0, 10)}...` : 
                  "Not set"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 