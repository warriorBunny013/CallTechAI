"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Mic, MicOff } from "lucide-react"

export default function TestMicrophonePage() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState<string>("")

  const testMicrophonePermission = async () => {
    try {
      setError("")
      
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError("getUserMedia is not supported in this browser")
        return
      }

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true,
        video: false 
      })
      
      setHasPermission(true)
      
      // Stop the stream
      stream.getTracks().forEach(track => track.stop())
      
    } catch (error) {
      console.error('Microphone permission error:', error)
      setHasPermission(false)
      setError(`Microphone permission denied: ${error}`)
    }
  }

  const startListening = async () => {
    try {
      setError("")
      setIsListening(true)
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true,
        video: false 
      })
      
      // Create audio context to visualize audio
      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      source.connect(analyser)
      
      // Stop after 5 seconds
      setTimeout(() => {
        stream.getTracks().forEach(track => track.stop())
        setIsListening(false)
      }, 5000)
      
    } catch (error) {
      console.error('Listening error:', error)
      setError(`Listening failed: ${error}`)
      setIsListening(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Microphone Test</h1>
        <p className="text-muted-foreground">
          Test microphone permissions and audio access
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Microphone Permission Test</CardTitle>
          <CardDescription>
            Check if your browser can access the microphone
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={testMicrophonePermission} className="w-full">
            Test Microphone Permission
          </Button>

          {hasPermission !== null && (
            <div className="flex items-center space-x-2">
              <Badge variant={hasPermission ? "default" : "destructive"}>
                {hasPermission ? "✅" : "❌"} Microphone Permission
              </Badge>
              <span className="text-sm">
                {hasPermission ? "Microphone access granted" : "Microphone access denied"}
              </span>
            </div>
          )}

          {hasPermission && (
            <Button 
              onClick={startListening} 
              disabled={isListening}
              className="w-full"
            >
              {isListening ? (
                <>
                  <MicOff className="mr-2 h-4 w-4" />
                  Listening... (5 seconds)
                </>
              ) : (
                <>
                  <Mic className="mr-2 h-4 w-4" />
                  Start Listening Test
                </>
              )}
            </Button>
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
          <CardTitle>Browser Compatibility</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Badge variant={typeof navigator !== 'undefined' ? "default" : "destructive"}>
                {typeof navigator !== 'undefined' ? "✅" : "❌"} Navigator API
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={typeof navigator !== 'undefined' && navigator.mediaDevices ? "default" : "destructive"}>
                {typeof navigator !== 'undefined' && navigator.mediaDevices ? "✅" : "❌"} MediaDevices API
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia ? "default" : "destructive"}>
                {typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia ? "✅" : "❌"} getUserMedia
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Troubleshooting</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>If microphone access is denied:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Check your browser's microphone permissions</li>
              <li>Make sure you're using HTTPS (required for microphone access)</li>
              <li>Try refreshing the page and granting permission again</li>
              <li>Check if your microphone is working in other applications</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 