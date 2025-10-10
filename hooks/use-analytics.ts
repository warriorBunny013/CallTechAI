import { useState, useEffect } from 'react'

export interface AnalyticsData {
  totalCalls: number
  averageDuration: number
  callDistribution: any[]
  durationDistribution: any[]
  callOutcomes: any[]
  hourlyDistribution: any[]
  dailyDistribution: any[]
  weeklyDistribution: any[]
  monthlyDistribution: any[]
  fallbackRate: number
  successRate: number
  transferRate: number
  dropRate: number
  popularIntents: any[]
}

export function useAnalytics(timeRange: string = '7d') {
  const [data, setData] = useState<AnalyticsData>({
    totalCalls: 0,
    averageDuration: 0,
    callDistribution: [],
    durationDistribution: [],
    callOutcomes: [],
    hourlyDistribution: [],
    dailyDistribution: [],
    weeklyDistribution: [],
    monthlyDistribution: [],
    fallbackRate: 0,
    successRate: 0,
    transferRate: 0,
    dropRate: 0,
    popularIntents: []
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch(`/api/analytics?timeRange=${timeRange}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch analytics data')
        }
        
        const analyticsData = await response.json()
        setData(analyticsData)
      } catch (err) {
        console.error('Error fetching analytics:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch analytics')
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [timeRange])

  return { data, loading, error }
}

