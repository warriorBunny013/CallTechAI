import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Get current assistant status from database
    let isActive = true // Default to active
    
    try {
      const { data: settings, error } = await supabase
        .from('assistant_settings')
        .select('is_active')
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Supabase error:', error)
        // Continue with default value
      } else if (settings) {
        isActive = settings.is_active
      }
    } catch (dbError) {
      console.error('Database connection error:', dbError)
      // Continue with default value if database is not accessible
    }
    
    return NextResponse.json({ 
      isActive,
      message: isActive ? 'Assistant is active' : 'Assistant is inactive'
    })
  } catch (error) {
    console.error('Error getting assistant status:', error)
    return NextResponse.json(
      { error: 'Failed to get assistant status' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { isActive } = body

    if (typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'isActive must be a boolean' },
        { status: 400 }
      )
    }

    // Update or create assistant settings in database
    let dbSuccess = false
    
    try {
      const { data, error } = await supabase
        .from('assistant_settings')
        .upsert({ 
          id: 1, 
          is_active: isActive,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        })

      if (error) {
        console.error('Supabase error:', error)
        // Continue with VAPI update even if database fails
      } else {
        dbSuccess = true
      }
    } catch (dbError) {
      console.error('Database connection error:', dbError)
      // Continue with VAPI update even if database fails
    }

    // Integrate with VAPI to actually enable/disable the assistant
    const vapiApiKey = process.env.VAPI_API_KEY || process.env.NEXT_PUBLIC_VAPI_API_KEY
    
    if (vapiApiKey && vapiApiKey !== 'your_vapi_api_key_here') {
      try {
        // Use direct HTTP requests to Vapi API to update assistant status
        const https = require('https')
        
        // Get the assistant ID from environment or use a default
        const assistantId = process.env.VAPI_ASSISTANT_ID || 'default'
        
        // Update the assistant configuration based on status
        const assistantConfig = {
          firstMessage: isActive 
            ? "Hello! I'm your CallTechAI assistant. How can I help you today?"
            : "This assistant is currently unavailable. Please try again later.",
          // You could also update other fields like system prompt, voice settings, etc.
        }
        
        // Make HTTP request to update VAPI assistant
        const options = {
          hostname: 'api.vapi.ai',
          port: 443,
          path: `/v1/assistants/${assistantId}`,
          method: 'PATCH',
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
          req.write(JSON.stringify(assistantConfig))
          req.end()
        })
        
        if (response.status >= 200 && response.status < 300) {
          console.log(`VAPI assistant updated successfully: ${isActive ? 'activated' : 'deactivated'}`)
        } else {
          console.log(`VAPI update failed with status: ${response.status}`)
        }
      } catch (vapiError) {
        console.error('Error updating VAPI assistant:', vapiError)
        // Continue with database update even if VAPI fails
      }
    }
    
    console.log(`Assistant status changed to: ${isActive ? 'active' : 'inactive'}`)
    
    const message = dbSuccess 
      ? `Assistant ${isActive ? 'activated' : 'deactivated'} successfully`
      : `Assistant ${isActive ? 'activated' : 'deactivated'} (database update failed)`
    
    return NextResponse.json({ 
      isActive,
      message,
      timestamp: new Date().toISOString(),
      dbSuccess
    })
  } catch (error) {
    console.error('Error updating assistant status:', error)
    return NextResponse.json(
      { error: 'Failed to update assistant status' },
      { status: 500 }
    )
  }
}
