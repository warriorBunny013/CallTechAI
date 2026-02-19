import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserAndOrg } from '@/lib/org'

// POST: Launch assistant (link phone number to assistant for inbound calls)
export async function POST(request: NextRequest) {
  try {
    const userAndOrg = await getCurrentUserAndOrg()
    if (!userAndOrg) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = await createClient()

    const body = await request.json()
    const { phoneNumberId, assistantId } = body

    if (!phoneNumberId || !assistantId) {
      return NextResponse.json(
        { error: 'Phone number ID and assistant ID are required' },
        { status: 400 }
      )
    }

    // Verify phone number belongs to org
    const { data: phoneNumber, error: phoneError } = await supabase
      .from('phone_numbers')
      .select('*')
      .eq('id', phoneNumberId)
      .eq('organisation_id', userAndOrg.organisationId)
      .single()

    if (phoneError || !phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number not found or unauthorized' },
        { status: 404 }
      )
    }

    // Verify assistant belongs to org
    const { data: assistant, error: assistantError } = await supabase
      .from('assistants')
      .select('*')
      .eq('id', assistantId)
      .eq('organisation_id', userAndOrg.organisationId)
      .single()

    if (assistantError || !assistant) {
      return NextResponse.json(
        { error: 'Assistant not found or unauthorized' },
        { status: 404 }
      )
    }

    // Update phone number in VAPI with assistant ID
    const vapiApiKey = process.env.VAPI_API_KEY
    if (!vapiApiKey || vapiApiKey === 'your_vapi_api_key_here') {
      return NextResponse.json(
        { error: 'VAPI API key not configured' },
        { status: 500 }
      )
    }

    try {
      const https = require('https')
      const options = {
        hostname: 'api.vapi.ai',
        port: 443,
        path: `/v1/phone-numbers/${phoneNumber.vapi_phone_number_id}`,
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${vapiApiKey}`,
          'Content-Type': 'application/json'
        }
      }

      await new Promise((resolve, reject) => {
        const req = https.request(options, (res: any) => {
          let data = ''
          res.on('data', (chunk: any) => data += chunk)
          res.on('end', () => {
            try {
              if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                resolve(JSON.parse(data))
              } else {
                const errorData = JSON.parse(data)
                reject(new Error(errorData.message || 'Failed to update phone number in VAPI'))
              }
            } catch (parseError) {
              reject(new Error('Failed to parse response'))
            }
          })
        })
        
        req.on('error', reject)
        req.write(JSON.stringify({
          assistantId: assistant.vapi_assistant_id
        }))
        req.end()
      })
    } catch (vapiError: any) {
      console.error('VAPI update error:', vapiError)
      return NextResponse.json(
        { error: vapiError.message || 'Failed to launch assistant in VAPI' },
        { status: 500 }
      )
    }

    // Update in database
    const { data: updatedPhone, error: updateError } = await supabase
      .from('phone_numbers')
      .update({
        assistant_id: assistantId,
        vapi_assistant_id: assistant.vapi_assistant_id,
        is_active: true
      })
      .eq('id', phoneNumberId)
      .eq('organisation_id', userAndOrg.organisationId)
      .select()
      .single()

    if (updateError) {
      console.error('Database update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update phone number in database' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Assistant launched successfully! Your phone number is now active and ready to receive calls.',
      phoneNumber: updatedPhone,
      assistant: assistant
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

