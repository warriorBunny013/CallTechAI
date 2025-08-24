import { useState, useEffect } from 'react'

interface DashboardStats {
  totalCalls: number
  avgDuration: string
  intentsCount: number
  recentCalls: any[]
  assistantActive: boolean
  error?: string
}

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats>({
    totalCalls: 0,
    avgDuration: '0m 0s',
    intentsCount: 0,
    recentCalls: [],
    assistantActive: true
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/dashboard-stats')
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard stats')
      }
      
      const data = await response.json()
      setStats(data)
      setError(null)
    } catch (err) {
      console.error('Error fetching dashboard stats:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch stats')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const refetch = () => {
    fetchStats()
  }

  return { stats, loading, error, refetch }
}
