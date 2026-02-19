import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserAndOrg } from '@/lib/org'

export async function GET(request: NextRequest) {
  try {
    const userAndOrg = await getCurrentUserAndOrg()
    if (!userAndOrg) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('timeRange') || '7d'
    
    // Calculate date range
    const now = new Date()
    let startDate: Date
    
    switch (timeRange) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    }

    // Fetch calls from Supabase (organisation-scoped)
    const supabase = await createClient()
    const { data: callsRows } = await supabase
      .from('calls')
      .select('id, call_status, duration_seconds, started_at, created_at, analysis')
      .eq('organisation_id', userAndOrg.organisationId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', now.toISOString())
      .order('created_at', { ascending: false })

    const filteredCalls = (callsRows ?? []).map((row: Record<string, unknown>) => ({
      id: row.id,
      status: row.call_status === 'completed' || row.call_status === 'success' ? 'pass' : 'fail',
      duration: row.duration_seconds,
      createdAt: row.started_at ?? row.created_at,
      created_at: row.created_at,
      startTime: row.started_at,
      start: row.started_at,
      analysis: row.analysis,
    }))

    console.log(`Filtered to ${filteredCalls.length} calls in selected time range`)

    // Process analytics data
    console.log(`About to process ${filteredCalls.length} calls`)
    console.log('Sample call data:', filteredCalls[0])
    
    // Temporary simple processing to debug the issue
    const analytics = {
      totalCalls: filteredCalls.length,
      averageDuration: 0,
      callDistribution: [],
      durationDistribution: [],
      callOutcomes: [],
      hourlyDistribution: [],
      dailyDistribution: [],
      monthlyDistribution: [],
      fallbackRate: 0,
      successRate: 0,
      transferRate: 0,
      dropRate: 0,
      popularIntents: []
    }
    
    // Try to calculate basic metrics
    if (filteredCalls.length > 0) {
      console.log('Processing calls for basic metrics...')
      
      // Count calls by status
      console.log('All call statuses:', filteredCalls.map(call => call.status))
      
      const statusCounts = filteredCalls.reduce((acc, call) => {
        const status = call.status || 'unknown'
        acc[status] = (acc[status] || 0) + 1
        return acc
      }, {})
      
      console.log('Status counts:', statusCounts)
      
      // Set success rate based on status
      if (statusCounts.pass > 0) {
        analytics.successRate = Math.round((statusCounts.pass / filteredCalls.length) * 100)
        analytics.fallbackRate = Math.round(((filteredCalls.length - statusCounts.pass) / filteredCalls.length) * 100)
      } else {
        // If no pass calls, set fallback rate to 100%
        analytics.fallbackRate = 100
      }
    }
    
    // const analytics = processAnalyticsData(filteredCalls, timeRange, startDate, now)

    // Fetch popular intents from Supabase for this organisation
    const { data: intents } = await supabase
      .from('intents')
      .select('intent_name')
      .eq('organisation_id', userAndOrg.organisationId)
      .order('created_at', { ascending: false })

    // Add intent data to analytics
    analytics.popularIntents = intents?.map(intent => ({
      name: intent.intent_name,
      count: Math.floor(Math.random() * 50) + 10 // Placeholder - in real implementation, track intent usage
    })) || []

    return NextResponse.json(analytics)
  } catch (error) {
    console.error('Error in analytics API:', error)
    return NextResponse.json(
      { error: 'Internal server error. Please try again later.' },
      { status: 500 }
    )
  }
}

function processAnalyticsData(calls: any[], timeRange: string, startDate: Date, endDate: Date) {
  console.log('processAnalyticsData called with:', { callsLength: calls.length, timeRange, startDate, endDate })
  
  // Initialize analytics object
  const analytics = {
    totalCalls: calls.length,
    averageDuration: 0,
    callDistribution: [] as any[],
    durationDistribution: [] as any[],
    callOutcomes: [] as any[],
    hourlyDistribution: [] as any[],
    dailyDistribution: [] as any[],
    monthlyDistribution: [] as any[],
    fallbackRate: 0,
    successRate: 0,
    transferRate: 0,
    dropRate: 0
  }

  if (calls.length === 0) {
    console.log('No calls to process, returning default analytics')
    return analytics
  }

  // Calculate call duration statistics
  let totalDuration = 0
  let callsWithDuration = 0
  const durationBuckets = {
    '<1 min': 0,
    '1-2 min': 0,
    '2-3 min': 0,
    '3-5 min': 0,
    '5-10 min': 0,
    '>10 min': 0
  }

  // Process call outcomes
  const outcomes = {
    'Intent Matched': 0,
    'Fallback': 0,
    'Transferred': 0,
    'Ended by Caller': 0,
    'Failed': 0
  }

  calls.forEach((call: any, index: number) => {
    console.log(`Processing call ${index + 1}:`, {
      id: call.id,
      duration: call.duration,
      status: call.status,
      analysis: call.analysis
    })
    
    // Calculate duration from various possible fields
    let durationSeconds = 0
    
    if (call.duration) {
      // Handle duration in string format like "1m 30s" or "0s"
      if (typeof call.duration === 'string') {
        const durationStr = call.duration.toLowerCase()
        if (durationStr.includes('m') && durationStr.includes('s')) {
          // Format: "1m 30s"
          const match = durationStr.match(/(\d+)m\s*(\d+)s/)
          if (match) {
            const minutes = parseInt(match[1])
            const seconds = parseInt(match[2])
            durationSeconds = minutes * 60 + seconds
          }
        } else if (durationStr.includes('m')) {
          // Format: "2m"
          const match = durationStr.match(/(\d+)m/)
          if (match) {
            const minutes = parseInt(match[1])
            durationSeconds = minutes * 60
          }
        } else if (durationStr.includes('s')) {
          // Format: "30s"
          const match = durationStr.match(/(\d+)s/)
          if (match) {
            durationSeconds = parseInt(match[1])
          }
        }
      } else {
        // If duration is already in seconds
        durationSeconds = call.duration
      }
    } else if (call.durationMs) {
      durationSeconds = Math.floor(call.durationMs / 1000)
    } else if (call.startTime && call.endTime) {
      const start = new Date(call.startTime).getTime()
      const end = new Date(call.endTime).getTime()
      durationSeconds = Math.floor((end - start) / 1000)
    } else if (call.start && call.end) {
      const start = new Date(call.start).getTime()
      const end = new Date(call.end).getTime()
      durationSeconds = Math.floor((end - start) / 1000)
    }

    console.log(`Call ${index + 1} duration calculated: ${durationSeconds} seconds`)

    if (durationSeconds > 0) {
      totalDuration += durationSeconds
      callsWithDuration++

      // Categorize duration
      if (durationSeconds < 60) durationBuckets['<1 min']++
      else if (durationSeconds < 120) durationBuckets['1-2 min']++
      else if (durationSeconds < 180) durationBuckets['2-3 min']++
      else if (durationSeconds < 300) durationBuckets['3-5 min']++
      else if (durationSeconds < 600) durationBuckets['5-10 min']++
      else durationBuckets['>10 min']++
    }

    // Determine call outcome based on Vapi AI data structure
    let callStatus = call.status
    let callAnalysis = call.analysis
    
    // Handle different analysis structures based on Vapi AI documentation
    if (callAnalysis && typeof callAnalysis === 'object') {
      // Check successEvaluation first (true/false from documentation)
      if (callAnalysis.successEvaluation === 'true' || callAnalysis.successEvaluation === true) {
        outcomes['Intent Matched']++
      } else if (callAnalysis.successEvaluation === 'false' || callAnalysis.successEvaluation === false) {
        outcomes['Fallback']++
      } else if (callAnalysis.summary) {
        // Check summary for keywords if successEvaluation is not available
        const summary = callAnalysis.summary.toLowerCase()
        if (summary.includes('fallback') || summary.includes('could not understand')) {
          outcomes['Fallback']++
        } else if (summary.includes('transfer') || summary.includes('transferred')) {
          outcomes['Transferred']++
        } else if (callStatus === 'completed' || callStatus === 'success' || callStatus === 'pass') {
          outcomes['Intent Matched']++
        } else if (callStatus === 'failed' || callStatus === 'error' || callStatus === 'fail') {
          outcomes['Failed']++
        } else {
          outcomes['Ended by Caller']++
        }
      } else if (callStatus === 'completed' || callStatus === 'success' || callStatus === 'pass') {
        outcomes['Intent Matched']++
      } else if (callStatus === 'failed' || callStatus === 'error' || callStatus === 'fail') {
        outcomes['Failed']++
      } else {
        outcomes['Ended by Caller']++
      }
    } else if (typeof callAnalysis === 'string') {
      // Handle string analysis (like what we see in the call data)
      const analysis = callAnalysis.toLowerCase()
      if (analysis.includes('fallback') || analysis.includes('could not understand')) {
        outcomes['Fallback']++
      } else if (analysis.includes('transfer') || analysis.includes('transferred')) {
        outcomes['Transferred']++
      } else if (callStatus === 'completed' || callStatus === 'success' || callStatus === 'pass') {
        outcomes['Intent Matched']++
      } else if (callStatus === 'failed' || callStatus === 'error' || callStatus === 'fail') {
        outcomes['Failed']++
      } else {
        outcomes['Ended by Caller']++
      }
    } else if (callStatus === 'completed' || callStatus === 'success' || callStatus === 'pass') {
      outcomes['Intent Matched']++
    } else if (callStatus === 'failed' || callStatus === 'error' || callStatus === 'fail') {
      outcomes['Failed']++
    } else {
      outcomes['Ended by Caller']++
    }
  })

  console.log('Duration calculation summary:', {
    totalCalls: calls.length,
    callsWithDuration,
    totalDuration,
    averageDuration: callsWithDuration > 0 ? Math.floor(totalDuration / callsWithDuration) : 0
  })

  console.log('Outcomes summary:', outcomes)

  // Calculate averages and rates
  analytics.averageDuration = callsWithDuration > 0 ? Math.floor(totalDuration / callsWithDuration) : 0
  
  const totalOutcomes = Object.values(outcomes).reduce((a, b) => a + b, 0)
  analytics.fallbackRate = totalOutcomes > 0 ? Math.round((outcomes['Fallback'] / totalOutcomes) * 100) : 0
  analytics.successRate = totalOutcomes > 0 ? Math.round((outcomes['Intent Matched'] / totalOutcomes) * 100) : 0
  analytics.transferRate = totalOutcomes > 0 ? Math.round((outcomes['Transferred'] / totalOutcomes) * 100) : 0
  analytics.dropRate = totalOutcomes > 0 ? Math.round((outcomes['Ended by Caller'] / totalOutcomes) * 100) : 0

  // Convert to arrays for charts
  analytics.durationDistribution = Object.entries(durationBuckets).map(([duration, count]) => ({
    duration,
    count
  }))

  analytics.callOutcomes = Object.entries(outcomes).map(([outcome, count]) => ({
    outcome,
    count
  }))

  // Generate time-based distributions
  analytics.hourlyDistribution = generateHourlyDistribution(calls, startDate, endDate)
  analytics.dailyDistribution = generateDailyDistribution(calls, startDate, endDate)
  analytics.weeklyDistribution = generateWeeklyDistribution(calls, startDate, endDate)
  analytics.monthlyDistribution = generateMonthlyDistribution(calls, startDate, endDate)

  return analytics
}

function generateHourlyDistribution(calls: any[], startDate: Date, endDate: Date) {
  const hourlyData = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i.toString().padStart(2, '0')}:00`,
    calls: 0
  }))

  calls.forEach((call: any) => {
    const callDate = new Date(call.createdAt || call.created_at || call.startTime || call.start || 0)
    const hour = callDate.getHours()
    hourlyData[hour].calls++
  })

  return hourlyData
}

function generateDailyDistribution(calls: any[], startDate: Date, endDate: Date) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const dailyData = days.map(day => ({ day, calls: 0 }))

  calls.forEach((call: any) => {
    const callDate = new Date(call.createdAt || call.created_at || call.startTime || call.start || 0)
    const dayIndex = callDate.getDay()
    dailyData[dayIndex].calls++
  })

  return dailyData
}

function generateWeeklyDistribution(calls: any[], startDate: Date, endDate: Date) {
  const weeks = []
  let currentDate = new Date(startDate)
  
  while (currentDate <= endDate) {
    const weekStart = new Date(currentDate)
    const weekEnd = new Date(currentDate.getTime() + 6 * 24 * 60 * 60 * 1000)
    
    const weekCalls = calls.filter((call: any) => {
      const callDate = new Date(call.createdAt || call.created_at || call.startTime || call.start || 0)
      return callDate >= weekStart && callDate <= weekEnd
    }).length

    weeks.push({
      week: `Week ${weeks.length + 1}`,
      calls: weekCalls
    })

    currentDate = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000)
  }

  return weeks
}

function generateMonthlyDistribution(calls: any[], startDate: Date, endDate: Date) {
  const months = []
  let currentDate = new Date(startDate)
  
  while (currentDate <= endDate) {
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
    
    const monthCalls = calls.filter((call: any) => {
      const callDate = new Date(call.createdAt || call.created_at || call.startTime || call.start || 0)
      return callDate >= monthStart && callDate <= monthEnd
    }).length

    months.push({
      month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
      calls: monthCalls
    })

    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
  }

  return months
}

// Generate sample data for testing when Vapi API is not available
function generateSampleCalls(startDate: Date, endDate: Date, timeRange: string) {
  const calls = []
  const now = new Date()
  
  // Generate different number of calls based on time range
  let numCalls = 0
  switch (timeRange) {
    case '24h':
      numCalls = Math.floor(Math.random() * 50) + 20
      break
    case '7d':
      numCalls = Math.floor(Math.random() * 200) + 100
      break
    case '30d':
      numCalls = Math.floor(Math.random() * 800) + 400
      break
    case '90d':
      numCalls = Math.floor(Math.random() * 2000) + 1000
      break
    default:
      numCalls = Math.floor(Math.random() * 200) + 100
  }

  for (let i = 0; i < numCalls; i++) {
    const callDate = new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()))
    const duration = Math.floor(Math.random() * 600) + 30 // 30 seconds to 10.5 minutes
    const status = Math.random() > 0.2 ? 'completed' : 'failed'
    
    calls.push({
      id: `sample-${i}`,
      createdAt: callDate.toISOString(),
      duration: duration,
      status: status,
      analysis: status === 'completed' ? 'intent_matched' : 'fallback'
    })
  }
  
  return calls
}
