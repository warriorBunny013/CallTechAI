import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserAndOrg } from '@/lib/org'
import { fetchVapiCallsForPhoneNumber, type VapiCall } from '@/lib/vapi-fetch-calls'

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' })
}

export async function GET(request: NextRequest) {
  try {
    const userAndOrg = await getCurrentUserAndOrg()
    if (!userAndOrg) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('timeRange') || '7d'

    const now = new Date()
    let startDate: Date
    switch (timeRange) {
      case '24h': startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); break
      case '7d': startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break
      case '30d': startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break
      case '90d': startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break
      default: startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    }

    const supabase = await createClient()
    const orgId = userAndOrg.organisationId
    const vapiApiKey = process.env.VAPI_API_KEY

    // Fetch phone numbers for this org
    const { data: orgPhones } = await supabase
      .from('phone_numbers')
      .select('phone_number, vapi_phone_number_id')
      .eq('organisation_id', orgId)

    const phoneRows = (orgPhones ?? []) as { phone_number: string; vapi_phone_number_id?: string }[]

    // Fetch calls from Vapi for each phone number
    type CallEntry = {
      id: string
      startedAt: string
      endedAt: string | null
      durationSeconds: number
      status: string
      phoneNumber: string
      analysis: unknown
    }
    const vapiCalls: CallEntry[] = []

    if (vapiApiKey && vapiApiKey !== 'your_vapi_api_key_here' && phoneRows.length > 0) {
      for (const row of phoneRows) {
        const vapiId = row.vapi_phone_number_id
        if (!vapiId) continue
        const calls = await fetchVapiCallsForPhoneNumber(vapiId, 500, vapiApiKey)
        for (const c of calls) {
          const createdAtRaw = c.endedAt ?? c.startedAt ?? c.createdAt ?? ''
          if (!createdAtRaw) continue
          const callDate = new Date(createdAtRaw)
          if (callDate < startDate || callDate > now) continue

          let durationSeconds = 0
          if (c.endedAt && c.startedAt) {
            durationSeconds = Math.max(0, Math.floor(
              (new Date(c.endedAt).getTime() - new Date(c.startedAt).getTime()) / 1000
            ))
          } else if ((c as { duration?: number }).duration) {
            durationSeconds = Math.floor(Number((c as { duration?: number }).duration) / 1000)
          }

          vapiCalls.push({
            id: c.id,
            startedAt: createdAtRaw,
            endedAt: c.endedAt ?? null,
            durationSeconds,
            status: c.status === 'ended' || c.status === 'completed' ? 'pass' : 'fail',
            phoneNumber: row.phone_number,
            analysis: c.analysis ?? c.summary ?? null,
          })
        }
      }
    }

    // Fallback: fetch from Supabase if no Vapi calls
    let allCalls = vapiCalls
    if (allCalls.length === 0) {
      const { data: dbCalls } = await supabase
        .from('calls')
        .select('id, call_status, duration_seconds, started_at, created_at, analysis, assistant_phone_number')
        .eq('organisation_id', orgId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', now.toISOString())

      allCalls = (dbCalls ?? []).map((row: Record<string, unknown>) => ({
        id: String(row.id),
        startedAt: String(row.started_at ?? row.created_at ?? ''),
        endedAt: null,
        durationSeconds: Number(row.duration_seconds) || 0,
        status: row.call_status === 'completed' || row.call_status === 'success' ? 'pass' : 'fail',
        phoneNumber: String(row.assistant_phone_number ?? ''),
        analysis: row.analysis ?? null,
      }))
    }

    const totalCalls = allCalls.length
    const totalMinutes = allCalls.reduce((sum, c) => sum + c.durationSeconds / 60, 0)
    const completedCalls = allCalls.filter(c => c.status === 'pass').length
    const avgDuration = totalCalls > 0
      ? Math.floor(allCalls.reduce((sum, c) => sum + c.durationSeconds, 0) / totalCalls)
      : 0
    const successRate = totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 0
    const fallbackRate = 100 - successRate

    // Build time-series data (date → calls & minutes)
    const dateMap = new Map<string, { calls: number; minutes: number }>()

    // Pre-fill all dates in range
    const cursor = new Date(startDate)
    while (cursor <= now) {
      const key = cursor.toISOString().split('T')[0]
      dateMap.set(key, { calls: 0, minutes: 0 })
      cursor.setDate(cursor.getDate() + 1)
    }

    for (const c of allCalls) {
      const key = new Date(c.startedAt).toISOString().split('T')[0]
      const entry = dateMap.get(key)
      if (entry) {
        entry.calls += 1
        entry.minutes += c.durationSeconds / 60
      }
    }

    const timeSeriesData = Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, val]) => ({
        date,
        label: formatDateLabel(date),
        calls: val.calls,
        minutes: Math.round(val.minutes * 100) / 100,
      }))

    // Hourly distribution (for current data)
    const hourlyData = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i.toString().padStart(2, '0')}:00`,
      calls: 0,
    }))
    for (const c of allCalls) {
      const hour = new Date(c.startedAt).getHours()
      hourlyData[hour].calls++
    }

    // Daily distribution (day of week)
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const dailyData = days.map(day => ({ day, calls: 0 }))
    for (const c of allCalls) {
      const dayIndex = new Date(c.startedAt).getDay()
      dailyData[dayIndex].calls++
    }

    // Weekly distribution
    const weekMap = new Map<string, number>()
    for (const c of allCalls) {
      const d = new Date(c.startedAt)
      const weekStart = new Date(d)
      weekStart.setDate(d.getDate() - d.getDay())
      const key = weekStart.toISOString().split('T')[0]
      weekMap.set(key, (weekMap.get(key) ?? 0) + 1)
    }
    const weeklyData = Array.from(weekMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, calls], i) => ({ week: `Week ${i + 1}`, calls }))

    // Monthly distribution
    const monthMap = new Map<string, number>()
    for (const c of allCalls) {
      const d = new Date(c.startedAt)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      monthMap.set(key, (monthMap.get(key) ?? 0) + 1)
    }
    const monthlyData = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, calls]) => ({
        month: new Date(key + '-01').toLocaleDateString('en-US', { month: 'short' }),
        calls,
      }))

    // Call outcomes
    const outcomes: Record<string, number> = {
      'Completed': completedCalls,
      'Escalated': totalCalls - completedCalls,
    }
    const callOutcomes = Object.entries(outcomes).map(([outcome, count]) => ({ outcome, count }))

    // Per-phone-number breakdown
    const phoneMap = new Map<string, { calls: number; minutes: number }>()
    for (const c of allCalls) {
      const key = c.phoneNumber || 'Unknown'
      const entry = phoneMap.get(key) ?? { calls: 0, minutes: 0 }
      entry.calls++
      entry.minutes += c.durationSeconds / 60
      phoneMap.set(key, entry)
    }
    const callsByPhoneNumber = Array.from(phoneMap.entries()).map(([phoneNumber, val]) => ({
      phoneNumber,
      calls: val.calls,
      minutes: Math.round(val.minutes * 100) / 100,
    }))

    // Popular intents from Supabase
    const { data: intents } = await supabase
      .from('intents')
      .select('intent_name')
      .eq('organisation_id', orgId)
      .order('created_at', { ascending: false })

    const popularIntents = (intents ?? []).map(intent => ({
      name: intent.intent_name,
      count: Math.floor(Math.random() * 50) + 10,
    }))

    // Appointments booked in the selected time range
    const { count: appointmentsBooked } = await supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('organisation_id', orgId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', now.toISOString())

    return NextResponse.json({
      totalCalls,
      totalMinutes: Math.round(totalMinutes * 100) / 100,
      averageDuration: avgDuration,
      successRate,
      fallbackRate,
      transferRate: 0,
      dropRate: 0,
      timeSeriesData,
      callOutcomes,
      hourlyDistribution: hourlyData,
      dailyDistribution: dailyData,
      weeklyDistribution: weeklyData.length > 0 ? weeklyData : [],
      monthlyDistribution: monthlyData.length > 0 ? monthlyData : [],
      callDistribution: [],
      durationDistribution: [],
      callsByPhoneNumber,
      popularIntents,
      appointmentsBooked: appointmentsBooked ?? 0,
    })
  } catch (error) {
    console.error('Error in analytics API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
