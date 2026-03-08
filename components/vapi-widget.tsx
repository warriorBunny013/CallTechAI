"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, PhoneOff, VolumeX } from 'lucide-react'
import { getVapi } from '@/lib/vapi'

/** Transient assistant config (CallTechAI intents + voice) - overrides assistantId when provided */
export interface AssistantConfig {
  name: string
  firstMessage: string
  model: { provider: string; model: string; temperature: number; messages: { role: string; content: string }[] }
  voice: { provider: string; voiceId: string }
}

interface VapiWidgetProps {
  apiKey: string
  assistantId?: string
  assistantConfig?: AssistantConfig | null
  config?: Record<string, unknown>
  className?: string
  onStartCall?: () => Promise<string | void>
  onTranscriptUpdate?: (transcript: Array<{ role: string; text: string }>) => void
  onConnectionChange?: (connected: boolean) => void
  inline?: boolean
}

const VapiWidget: React.FC<VapiWidgetProps> = ({ 
  apiKey, 
  assistantId = "", 
  assistantConfig = null,
  config = {},
  className = "",
  onStartCall,
  onTranscriptUpdate,
  onConnectionChange,
  inline = false
}) => {
  const [vapi, setVapi] = useState<any>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [transcript, setTranscript] = useState<Array<{role: string, text: string}>>([])
  const [error, setError] = useState<string>("")
  const transcriptEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript])

  useEffect(() => {
    const initializeVapi = async () => {
      try {
        const vapiInstance = await getVapi()
        setVapi(vapiInstance)

        // Event listeners
        vapiInstance.on('call-start', () => {
          console.log('Call started')
          setTranscript([])
          setIsConnected(true)
          setError("")
          onConnectionChange?.(true)
        })

        vapiInstance.on('call-end', () => {
          console.log('Call ended')
          setIsConnected(false)
          setIsSpeaking(false)
          onConnectionChange?.(false)
        })

        vapiInstance.on('speech-start', () => {
          console.log('Assistant started speaking')
          setIsSpeaking(true)
        })

        vapiInstance.on('speech-end', () => {
          console.log('Assistant stopped speaking')
          setIsSpeaking(false)
        })

        vapiInstance.on('message', (message: any) => {
          if (message.type === 'transcript' && message.transcript?.trim()) {
            // Only add final transcripts — Vapi sends partial updates that cause duplicates
            if (message.transcriptType === 'partial') return
            setTranscript(prev => {
              const last = prev[prev.length - 1]
              if (last?.role === message.role && last?.text === message.transcript) return prev
              const next = [...prev, { role: message.role, text: message.transcript }]
              onTranscriptUpdate?.(next)
              return next
            })
          }
        })

        vapiInstance.on('error', (error: any) => {
          console.error('Vapi error:', error)
          const errorMessage = error?.message || error?.toString() || 'Unknown error'
          setError(`Call error: ${errorMessage}`)
          setIsConnected(false)
        })

        return () => {
          vapiInstance?.stop()
        }
      } catch (error) {
        console.error('Error initializing Vapi:', error)
        setError(`Failed to initialize: ${error}`)
      }
    }

    if (apiKey) {
      initializeVapi()
    }
  }, [apiKey])

  const startCall = async () => {
    try {
      console.log('Start call clicked')
      setError("")
      
      if (!vapi) {
        setError("Vapi not initialized yet. Please wait.")
        return
      }
      
      // Prefer CallTechAI dashboard intents + voice (assistantConfig) over VAPI assistant ID
      if (assistantConfig && Object.keys(assistantConfig).length > 0) {
        console.log('Starting call with CallTechAI assistant config (dashboard intents + voice)')
        await vapi.start(assistantConfig as Parameters<typeof vapi.start>[0])
        return
      }
      
      if (!assistantId) {
        console.log('No assistant ID or config, calling onStartCall')
        if (onStartCall) {
          const result = await onStartCall()
          if (result && vapi) {
            if (typeof result === 'string') {
              await vapi.start(result)
            } else if (typeof result === 'object' && result !== null) {
              await vapi.start(result as Parameters<typeof vapi.start>[0])
            }
          }
          return
        } else {
          setError("Assistant not configured. Add intents and select a voice in the dashboard.")
          return
        }
      }
      
      console.log('Starting call with assistant ID:', assistantId)
      await vapi.start(assistantId)
    } catch (error) {
      console.error('Error starting call:', error)
      setError(`Failed to start call: ${error}`)
    }
  }

  const endCall = async () => {
    try {
      if (vapi) {
        await vapi.stop()
      }
      setIsConnected(false)
    } catch (error) {
      console.error('Error ending call:', error)
      setError(`Failed to end call: ${error}`)
    }
  }

  const toggleMute = () => {
    if (vapi) {
      const newMutedState = !isMuted
      vapi.setMuted(newMutedState)
      setIsMuted(newMutedState)
    }
  }

  if (!apiKey) {
    return null
  }

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    if (inline) {
      return <div className={className}>{children}</div>
    }
    return <div className={`fixed bottom-6 right-6 z-50 font-sans ${className}`}>{children}</div>
  }

  return (
    <Wrapper>
      {!isConnected ? (
        <Button
          onClick={startCall}
          className="bg-lime-500 hover:bg-lime-600 text-black border-none rounded-full px-6 py-4 text-base font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
          disabled={!vapi}
        >
          <Mic className="mr-2 h-5 w-5" />
          Start Voice Demo
        </Button>
      ) : (
        <div className="bg-background rounded-2xl p-5 w-80 shadow-lg border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${
                isSpeaking ? 'bg-lime-400 animate-pulse' : 'bg-lime-500'
              }`} />
              <span className="text-sm font-medium">
                {isSpeaking ? 'Speaking...' : 'Listening'}
              </span>
            </div>
            <Button onClick={endCall} variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
              <PhoneOff className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="max-h-48 overflow-y-auto mb-3 space-y-2 p-2 bg-muted/30 rounded-xl min-h-[80px]">
            {transcript.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">
                Speak to see the conversation here
              </p>
            ) : (
              <>
                {transcript.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                        msg.role === 'user'
                          ? 'bg-lime-500 text-black rounded-br-md'
                          : 'bg-muted text-foreground rounded-bl-md'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                <div ref={transcriptEndRef} />
              </>
            )}
          </div>

          {isConnected && (
            <Button 
              onClick={toggleMute} 
              variant={isMuted ? "destructive" : "outline"}
              size="sm"
              className="w-full"
            >
              {isMuted ? (
                <>
                  <VolumeX className="mr-2 h-4 w-4" />
                  Unmute
                </>
              ) : (
                <>
                  <Mic className="mr-2 h-4 w-4" />
                  Mute
                </>
              )}
            </Button>
          )}

          {error && (
            <div className="text-red-500 text-xs mt-2">
              {error}
            </div>
          )}
        </div>
      )}
    </Wrapper>
  )
}

export default VapiWidget 