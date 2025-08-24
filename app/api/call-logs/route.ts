import { NextRequest, NextResponse } from 'next/server'

// No sample data - we only want real Vapi data

export async function GET(request: NextRequest) {
  try {
    console.log('Call-logs API called')
    const vapiApiKey = process.env.VAPI_API_KEY || process.env.NEXT_PUBLIC_VAPI_API_KEY
    
    console.log('API key check:', {
      hasKey: !!vapiApiKey,
      keyLength: vapiApiKey?.length,
      isDefault: vapiApiKey === 'your_vapi_api_key_here'
    })
    
    if (!vapiApiKey || vapiApiKey === 'your_vapi_api_key_here') {
      console.log('Vapi API key not configured')
      return NextResponse.json(
        { error: 'Vapi API key not configured. Please set VAPI_API_KEY in your environment variables.' },
        { status: 401 }
      )
    }

    // Since the Vapi SDK import is failing, let's use direct HTTP requests to the Vapi API
    console.log('Using direct HTTP requests to Vapi API...')
    
    // We'll skip the SDK and use Node.js built-in HTTP
    const https = require('https')
    console.log('Vapi instance created')
    
    // Debug: Check what's available
    console.log('Using direct HTTP requests to Vapi API')
    
    // Get call logs from Vapi using direct HTTP requests
    let calls: any[] = []
    try {
      console.log('Fetching calls from Vapi using direct HTTP...')
      
      // Try different possible Vapi API endpoints for calls
      const endpoints = ['/call', '/calls', '/v1/call', '/v1/calls']
      let lastError = null
      
      for (const endpoint of endpoints) {
        try {
          console.log(`Trying endpoint: ${endpoint}`)
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
            calls = response.data?.data || response.data?.calls || response.data || []
            console.log(`Success with endpoint ${endpoint}:`, response)
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
      
      if (calls.length === 0 && lastError) {
        throw lastError
      }
      
      console.log('Successfully fetched calls from Vapi:', calls.length, 'calls')
      
      if (calls.length > 0) {
        console.log('Sample call data:', calls[0])
        console.log('Sample analysis data:', calls[0].analysis || calls[0].summary || calls[0].transcript || calls[0].insights)
      }
    } catch (vapiError) {
      console.error('Error fetching calls from Vapi:', vapiError)
      return NextResponse.json(
        { error: 'Failed to fetch calls from Vapi. Please check your API key and account.' },
        { status: 500 }
      )
    }
    
    // If no calls returned from Vapi, return empty array
    if (!calls || calls.length === 0) {
      console.log('No calls returned from Vapi')
      return NextResponse.json([])
    }
    
          // Transform the data to match our application's format
      const transformedCalls = calls.map((call: any) => {
        // Calculate duration from various possible fields
        let durationSeconds = 0
        
        if (call.duration) {
          // If duration is already in seconds
          durationSeconds = call.duration
        } else if (call.durationMs) {
          // If duration is in milliseconds
          durationSeconds = Math.floor(call.durationMs / 1000)
        } else if (call.startTime && call.endTime) {
          // Calculate from start and end times
          const start = new Date(call.startTime).getTime()
          const end = new Date(call.endTime).getTime()
          durationSeconds = Math.floor((end - start) / 1000)
        } else if (call.start && call.end) {
          // Alternative start/end field names
          const start = new Date(call.start).getTime()
          const end = new Date(call.end).getTime()
          durationSeconds = Math.floor((end - start) / 1000)
        }
        
        // Determine status (pass/fail) based on call data
        let callStatus = 'pass'
        if (call.status === 'failed' || call.status === 'error' || call.status === 'disconnected') {
          callStatus = 'fail'
        } else if (call.status === 'completed' || call.status === 'success') {
          callStatus = 'pass'
        }
        
        return {
          id: call.id || `call-${Date.now()}-${Math.random()}`,
          phoneNumber: call.phoneNumber || null,
          isWebCall: !call.phoneNumber,
          date: call.createdAt ? new Date(call.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          time: call.createdAt ? new Date(call.createdAt).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          }) : new Date().toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          }),
          duration: formatDuration(durationSeconds),
          status: callStatus,
          recordingUrl: call.recordingUrl || call.recording || null,
          analysis: extractAnalysisText(call.analysis || call.summary || call.transcript || call.insights),
          createdAt: call.createdAt || new Date().toISOString()
        }
      })

    return NextResponse.json(transformedCalls)
  } catch (error) {
    console.error('Error in call-logs API:', error)
    return NextResponse.json(
      { error: 'Internal server error. Please try again later.' },
      { status: 500 }
    )
  }
}

function formatDuration(seconds: number): string {
  if (!seconds) return '0s'
  
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  
  if (minutes === 0) {
    return `${remainingSeconds}s`
  }
  
  return `${minutes}m ${remainingSeconds.toString().padStart(2, '0')}s`
}

function extractAnalysisText(analysisData: any): string {
  if (!analysisData) return 'No analysis available'
  
  // If it's already a string, return it
  if (typeof analysisData === 'string') {
    return analysisData
  }
  
  // If it's an object, try to extract text from common fields
  if (typeof analysisData === 'object') {
    // Try different possible text fields
    const textFields = ['text', 'content', 'summary', 'transcript', 'insights', 'analysis', 'description']
    
    for (const field of textFields) {
      if (analysisData[field] && typeof analysisData[field] === 'string') {
        return analysisData[field]
      }
    }
    
    // If no text field found, try to stringify the object
    try {
      // Look for nested text content
      if (analysisData.summary && typeof analysisData.summary === 'string') {
        return analysisData.summary
      }
      if (analysisData.successEvaluation && typeof analysisData.successEvaluation === 'string') {
        return analysisData.successEvaluation
      }
      
      // If still no text, return a formatted version of the object
      return JSON.stringify(analysisData, null, 2).substring(0, 200) + '...'
    } catch (error) {
      return 'Analysis data available (format not supported)'
    }
  }
  
  // If it's any other type, convert to string
  return String(analysisData)
}
