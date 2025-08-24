import { useState, useEffect } from 'react'

interface AssistantStatus {
  isActive: boolean
  message: string
  timestamp?: string
}

export function useAssistantStatus() {
  const [status, setStatus] = useState<AssistantStatus>({
    isActive: true,
    message: 'Assistant is active'
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/assistant-status')
      
      if (!response.ok) {
        throw new Error('Failed to fetch assistant status')
      }
      
      const data = await response.json()
      setStatus(data)
      setError(null)
    } catch (err) {
      console.error('Error fetching assistant status:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch status')
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (isActive: boolean) => {
    try {
      setLoading(true)
      const response = await fetch('/api/assistant-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to update assistant status')
      }
      
      const data = await response.json()
      setStatus(data)
      setError(null)
      return data
    } catch (err) {
      console.error('Error updating assistant status:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to update status'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  return { 
    status, 
    loading, 
    error, 
    updateStatus,
    refetch: fetchStatus
  }
}
