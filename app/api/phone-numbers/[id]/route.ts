import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { auth } from '@clerk/nextjs/server'

// PUT: Update phone number (mainly to set assistant for inbound calls)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = params
    const body = await request.json()
    const { assistantId, vapiAssistantId } = body

    // Verify phone number belongs to user
    const { data: existingPhone, error: checkError } = await supabase
      .from('phone_numbers')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (checkError || !existingPhone) {
      return NextResponse.json(
        { error: 'Phone number not found or unauthorized' },
        { status: 404 }
      )
    }

    // Update phone number in VAPI if assistant is being set
    if (vapiAssistantId) {
      const vapiApiKey = process.env.VAPI_API_KEY
      if (vapiApiKey && vapiApiKey !== 'your_vapi_api_key_here') {
        try {
          const https = require('https')
          const options = {
            hostname: 'api.vapi.ai',
            port: 443,
            path: `/v1/phone-numbers/${existingPhone.vapi_phone_number_id}`,
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
                    reject(new Error('Failed to update phone number in VAPI'))
                  }
                } catch (parseError) {
                  reject(new Error('Failed to parse response'))
                }
              })
            })
            
            req.on('error', reject)
            req.write(JSON.stringify({
              assistantId: vapiAssistantId
            }))
            req.end()
          })
        } catch (vapiError) {
          console.error('VAPI update error:', vapiError)
          // Continue with database update even if VAPI fails
        }
      }
    }

    // Update in database
    const updateData: any = {}
    if (assistantId !== undefined) updateData.assistant_id = assistantId
    if (vapiAssistantId !== undefined) updateData.vapi_assistant_id = vapiAssistantId

    const { data: updatedPhone, error } = await supabase
      .from('phone_numbers')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to update phone number' },
        { status: 500 }
      )
    }

    return NextResponse.json({ phoneNumber: updatedPhone })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE: Delete phone number
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = params

    // Verify phone number belongs to user
    const { data: existingPhone, error: checkError } = await supabase
      .from('phone_numbers')
      .select('vapi_phone_number_id')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (checkError || !existingPhone) {
      return NextResponse.json(
        { error: 'Phone number not found or unauthorized' },
        { status: 404 }
      )
    }

    // Delete from VAPI (optional - you might want to keep the number)
    // For now, we'll just delete from our database

    // Delete from database
    const { error } = await supabase
      .from('phone_numbers')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to delete phone number' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Phone number deleted successfully' })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

