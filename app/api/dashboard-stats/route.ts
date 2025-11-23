import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { auth } from '@clerk/nextjs/server'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Fetch intents count from Supabase for this user
    const { count: intentsCount, error: intentsError } = await supabase
      .from('intents')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    if (intentsError) {
      console.error('Supabase intents error:', intentsError)
      return NextResponse.json(
        { error: 'Failed to fetch intents count' },
        { status: 500 }
      )
    }

    // Fetch assistant status from Supabase for this user
    const { data: assistantSettings, error: assistantError } = await supabase
      .from('assistant_settings')
      .select('is_active')
      .eq('user_id', userId)
      .single()

    if (assistantError && assistantError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Supabase assistant settings error:', assistantError)
      // Continue with default active status
    }

    const assistantActive = assistantSettings?.is_active ?? true

    // Fetch call statistics from VAPI
    const vapiApiKey = process.env.VAPI_API_KEY || process.env.NEXT_PUBLIC_VAPI_API_KEY
    
    if (!vapiApiKey || vapiApiKey === 'your_vapi_api_key_here') {
      console.log('Vapi API key not configured')
      return NextResponse.json({
        totalCalls: 0,
        avgDuration: '0m 0s',
        intentsCount: intentsCount || 0,
        recentCalls: [],
        assistantActive: true,
        error: 'Vapi API key not configured. Please set VAPI_API_KEY in your environment variables.'
      })
    }

    let totalCalls = 0
    let totalDuration = 0
    let callsWithDuration = 0
    let allCalls: any[] = []

    try {
      // Use direct HTTP requests to Vapi API
      const https = require('https')
      
      // Try multiple possible Vapi API endpoints for calls
      const endpoints = ['/v1/calls', '/calls', '/call', '/v1/call']
      let lastError = null
      
      for (const endpoint of endpoints) {
        try {
          const options = {
            hostname: 'api.vapi.ai',
            port: 443,
            path: endpoint,
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${vapiApiKey}`,
              'Content-Type': 'application/json'
            }
          }
      
                const response = await new Promise<{ status: number; data: any }>((resolve, reject) => {
            const req = https.request(options, (res: any) => {
              let data = ''
              res.on('data', (chunk: any) => data += chunk)
              res.on('end', () => {
                try {
                  const jsonData = JSON.parse(data)
                  resolve({ status: res.statusCode || 0, data: jsonData })
                } catch (parseError) {
                  reject(new Error('Failed to parse response'))
                }
              })
            })
            
            req.on('error', reject)
            req.end()
          })
          
          if (response.status >= 200 && response.status < 300) {
            const calls = response.data?.data || response.data?.calls || response.data || []
            allCalls = calls
            totalCalls = calls.length
            
            // Calculate average duration
            calls.forEach((call: any) => {
              let durationSeconds = 0
              
              if (call.duration) {
                durationSeconds = call.duration
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
              
              if (durationSeconds > 0) {
                totalDuration += durationSeconds
                callsWithDuration++
              }
            })
            
            // If we successfully got data, break out of the loop
            break
          } else {
            console.log(`Endpoint ${endpoint} failed with status: ${response.status}`)
            lastError = new Error(`HTTP request failed: ${response.status}`)
          }
        } catch (endpointError) {
          console.log(`Endpoint ${endpoint} error:`, endpointError)
          lastError = endpointError
        }
      }
      
      if (totalCalls === 0 && lastError) {
        console.log('All endpoints failed, using default values')
      }
    } catch (vapiError) {
      console.error('Error fetching calls from Vapi:', vapiError)
      // Continue with default values if Vapi fails
    }

    // Calculate average duration
    const avgDurationSeconds = callsWithDuration > 0 ? Math.floor(totalDuration / callsWithDuration) : 0
    const avgDuration = formatDuration(avgDurationSeconds)

    // Get the first 4 recent calls, sorted by creation date
    const recentCalls = allCalls
      .sort((a: any, b: any) => {
        const dateA = new Date(a.createdAt || a.created_at || a.startTime || a.start || 0)
        const dateB = new Date(b.createdAt || b.created_at || b.startTime || b.start || 0)
        return dateB.getTime() - dateA.getTime()
      })
      .slice(0, 4)
      .map((call: any) => {
        // Calculate duration for each call
        let durationSeconds = 0
        
        if (call.duration) {
          durationSeconds = call.duration
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

        // Format phone number or indicate web call
        const phoneNumber = call.phoneNumber || call.phone || call.from || null
        
        return {
          id: call.id || `call-${Date.now()}-${Math.random()}`,
          phoneNumber: phoneNumber,
          isWebCall: !phoneNumber,
          time: formatCallTime(call.createdAt || call.created_at || call.startTime || call.start),
          duration: formatDuration(durationSeconds),
          status: call.status === 'completed' || call.status === 'success' ? 'completed' : 'failed'
        }
      })

    return NextResponse.json({
      totalCalls,
      avgDuration,
      intentsCount: intentsCount || 0,
      recentCalls,
      assistantActive
    })
  } catch (error) {
    console.error('Error in dashboard-stats API:', error)
    return NextResponse.json(
      { error: 'Internal server error. Please try again later.' },
      { status: 500 }
    )
  }
}

function formatDuration(seconds: number): string {
  if (!seconds) return '0m 0s'
  
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  
  if (minutes === 0) {
    return `${remainingSeconds}s`
  }
  
  return `${minutes}m ${remainingSeconds.toString().padStart(2, '0')}s`
}

function formatCallTime(dateString: string | number): string {
  if (!dateString) return 'Unknown time'
  
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      if (diffInHours < 1) {
        const diffInMinutes = Math.floor(diffInHours * 60)
        if (diffInMinutes < 1) {
          return 'Just now'
        }
        return `${diffInMinutes}m ago`
      }
      return `${Math.floor(diffInHours)}h ago`
    } else if (diffInHours < 48) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    }
  } catch (error) {
    return 'Invalid time'
  }
}
