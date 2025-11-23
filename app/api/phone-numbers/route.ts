import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { auth } from '@clerk/nextjs/server'

// GET: List all phone numbers for the current user
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: phoneNumbers, error } = await supabase
      .from('phone_numbers')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch phone numbers' },
        { status: 500 }
      )
    }

    return NextResponse.json({ phoneNumbers })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST: Create a new phone number (free US number or import from Twilio)
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { phoneNumber, countryCode, numberType, twilioAccountSid, twilioAuthToken, twilioPhoneNumberSid } = body

    // Validate VAPI API key
    const vapiApiKey = process.env.VAPI_API_KEY
    if (!vapiApiKey || vapiApiKey === 'your_vapi_api_key_here') {
      return NextResponse.json(
        { error: 'VAPI API key not configured' },
        { status: 500 }
      )
    }

    let vapiPhoneNumber: any

    try {
      // Use VAPI API to create or import phone number
      const https = require('https')

      if (numberType === 'imported' && twilioAccountSid && twilioAuthToken && twilioPhoneNumberSid) {
        // Import phone number from Twilio
        const options = {
          hostname: 'api.vapi.ai',
          port: 443,
          path: '/v1/phone-numbers/import',
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${vapiApiKey}`,
            'Content-Type': 'application/json'
          }
        }

        vapiPhoneNumber = await new Promise((resolve, reject) => {
          const req = https.request(options, (res: any) => {
            let data = ''
            res.on('data', (chunk: any) => data += chunk)
            res.on('end', () => {
              try {
                const jsonData = JSON.parse(data)
                if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                  resolve(jsonData)
                } else {
                  reject(new Error(jsonData.message || 'Failed to import phone number'))
                }
              } catch (parseError) {
                reject(new Error('Failed to parse response'))
              }
            })
          })
          
          req.on('error', reject)
          req.write(JSON.stringify({
            twilioAccountSid,
            twilioAuthToken,
            twilioPhoneNumberSid
          }))
          req.end()
        })
      } else {
        // Create free US phone number
        const options = {
          hostname: 'api.vapi.ai',
          port: 443,
          path: '/v1/phone-numbers',
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${vapiApiKey}`,
            'Content-Type': 'application/json'
          }
        }

        vapiPhoneNumber = await new Promise((resolve, reject) => {
          const req = https.request(options, (res: any) => {
            let data = ''
            res.on('data', (chunk: any) => data += chunk)
            res.on('end', () => {
              try {
                const jsonData = JSON.parse(data)
                if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                  resolve(jsonData)
                } else {
                  reject(new Error(jsonData.message || 'Failed to create phone number'))
                }
              } catch (parseError) {
                reject(new Error('Failed to parse response'))
              }
            })
          })
          
          req.on('error', reject)
          req.write(JSON.stringify({
            number: phoneNumber,
            countryCode: countryCode || 'US'
          }))
          req.end()
        })
      }

      // Save phone number to database
      const { data: savedPhoneNumber, error: dbError } = await supabase
        .from('phone_numbers')
        .insert({
          user_id: userId,
          vapi_phone_number_id: vapiPhoneNumber.id || vapiPhoneNumber.phoneNumberId,
          phone_number: vapiPhoneNumber.number || vapiPhoneNumber.phoneNumber || phoneNumber,
          country_code: countryCode || 'US',
          number_type: numberType || 'free',
          is_active: true
        })
        .select()
        .single()

      if (dbError) {
        console.error('Database error:', dbError)
        return NextResponse.json(
          { error: 'Failed to save phone number to database' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        phoneNumber: savedPhoneNumber,
        vapiResponse: vapiPhoneNumber
      }, { status: 201 })

    } catch (vapiError: any) {
      console.error('VAPI error:', vapiError)
      return NextResponse.json(
        { error: vapiError.message || 'Failed to create/import phone number with VAPI' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

