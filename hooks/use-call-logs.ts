import { useState, useEffect } from 'react'

export interface CallLog {
  id: string
  phoneNumber: string
  isWebCall: boolean
  date: string
  time: string
  duration: string
  status: string
  recordingUrl: string | null
  analysis: string
  createdAt: string
}

export function useCallLogs() {
  const [calls, setCalls] = useState<CallLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCallLogs = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('Fetching call logs from Vapi...')
      const response = await fetch('/api/call-logs')
      console.log('Response status:', response.status)
      console.log('Response headers:', Object.fromEntries(response.headers.entries()))
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('API error response:', errorText)
        throw new Error(`Failed to fetch call logs: ${response.status} ${errorText}`)
      }
      
      const data = await response.json()
      console.log('Call logs data received:', data)
      console.log('Number of calls:', data.length)
      
      // Debug: Check the structure of analysis data
      if (data.length > 0) {
        console.log('First call analysis:', data[0].analysis)
        console.log('Analysis type:', typeof data[0].analysis)
        if (typeof data[0].analysis === 'object') {
          console.log('Analysis object keys:', Object.keys(data[0].analysis))
        }
      }
      
      setCalls(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching call logs:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCallLogs()
  }, [])

  const refreshCallLogs = () => {
    fetchCallLogs()
  }

  return {
    calls,
    loading,
    error,
    refreshCallLogs
  }
}
