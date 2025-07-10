"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX } from 'lucide-react'
import { getVapi } from '@/lib/vapi'

interface VapiWidgetProps {
  apiKey: string
  assistantId: string
  config?: Record<string, unknown>
  className?: string
  onStartCall?: () => Promise<void>
}

const VapiWidget: React.FC<VapiWidgetProps> = ({ 
  apiKey, 
  assistantId, 
  config = {},
  className = "",
  onStartCall
}) => {
  const [vapi, setVapi] = useState<any>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [transcript, setTranscript] = useState<Array<{role: string, text: string}>>([])
  const [error, setError] = useState<string>("")

  useEffect(() => {
    const initializeVapi = async () => {
      try {
        const vapiInstance = await getVapi()
        setVapi(vapiInstance)

        // Event listeners
        vapiInstance.on('call-start', () => {
          console.log('Call started')
          setIsConnected(true)
          setError("")
        })

        vapiInstance.on('call-end', () => {
          console.log('Call ended')
          setIsConnected(false)
          setIsSpeaking(false)
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
          if (message.type === 'transcript') {
            setTranscript(prev => [...prev, {
              role: message.role,
              text: message.transcript
            }])
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
  }, [apiKey, assistantId])

  const startCall = async () => {
    try {
      console.log('Start call clicked')
      setError("")
      
      if (!vapi) {
        setError("Vapi not initialized yet. Please wait.")
        return
      }
      
      if (!assistantId) {
        console.log('No assistant ID, calling onStartCall')
        if (onStartCall) {
          await onStartCall()
          return
        } else {
          setError("Assistant not created yet. Please wait for assistant creation.")
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

  return (
    <div className={`fixed bottom-6 right-6 z-50 font-sans ${className}`}>
      {!isConnected ? (
        <Button
          onClick={startCall}
          className="bg-rose-500 hover:bg-rose-600 text-white border-none rounded-full px-6 py-4 text-base font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
          disabled={!vapi}
        >
          <Mic className="mr-2 h-5 w-5" />
          Talk to Assistant
        </Button>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 w-80 shadow-2xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                isSpeaking ? 'bg-red-500 animate-pulse' : 'bg-rose-500'
              }`}></div>
              <span className="font-bold text-gray-900 dark:text-gray-100">
                {isSpeaking ? 'Assistant Speaking...' : 'Listening...'}
              </span>
            </div>
            <Button
              onClick={endCall}
              variant="destructive"
              size="sm"
            >
              <PhoneOff className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="max-h-48 overflow-y-auto mb-3 p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
            {transcript.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Conversation will appear here...
              </p>
            ) : (
              transcript.map((msg, i) => (
                <div
                  key={i}
                  className={`mb-2 text-right ${msg.role === 'user' ? 'text-right' : 'text-left'}`}
                >
                  <span className={`inline-block p-2 rounded-lg text-sm max-w-[80%] ${
                    msg.role === 'user' 
                      ? 'bg-rose-500 text-white' 
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                  }`}>
                    {msg.text}
                  </span>
                </div>
              ))
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
    </div>
  )
}

export default VapiWidget 