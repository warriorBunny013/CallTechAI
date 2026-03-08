import { useState, useEffect } from 'react'

export interface TimeSeriesPoint {
  date: string
  label: string
  calls: number
  minutes: number
}

export interface PhoneNumberStat {
  phoneNumber: string
  calls: number
  minutes: number
}

export interface AnalyticsData {
  totalCalls: number
  totalMinutes: number
  averageDuration: number
  callDistribution: { duration: string; count: number }[]
  durationDistribution: { duration: string; count: number }[]
  callOutcomes: { outcome: string; count: number }[]
  hourlyDistribution: { hour: string; calls: number }[]
  dailyDistribution: { day: string; calls: number }[]
  weeklyDistribution: { week: string; calls: number }[]
  monthlyDistribution: { month: string; calls: number }[]
  timeSeriesData: TimeSeriesPoint[]
  callsByPhoneNumber: PhoneNumberStat[]
  fallbackRate: number
  successRate: number
  transferRate: number
  dropRate: number
  popularIntents: { name: string; count: number }[]
  appointmentsBooked: number
}

const defaultData: AnalyticsData = {
  totalCalls: 0,
  totalMinutes: 0,
  averageDuration: 0,
  callDistribution: [],
  durationDistribution: [],
  callOutcomes: [],
  hourlyDistribution: [],
  dailyDistribution: [],
  weeklyDistribution: [],
  monthlyDistribution: [],
  timeSeriesData: [],
  callsByPhoneNumber: [],
  fallbackRate: 0,
  successRate: 0,
  transferRate: 0,
  dropRate: 0,
  popularIntents: [],
  appointmentsBooked: 0,
}

export function useAnalytics(timeRange: string = '7d') {
  const [data, setData] = useState<AnalyticsData>(defaultData)
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
        setData({ ...defaultData, ...analyticsData })
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
