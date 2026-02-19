import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserAndOrg } from '@/lib/org'

// PUT: Update phone number (e.g. set Vapi assistant for inbound; we use transient assistant per call)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userAndOrg = await getCurrentUserAndOrg()
    if (!userAndOrg) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { assistantId, vapiAssistantId } = body

    const supabase = await createClient()
    const { data: existingPhone, error: checkError } = await supabase
      .from('phone_numbers')
      .select('*')
      .eq('id', id)
      .eq('organisation_id', userAndOrg.organisationId)
      .single()

    if (checkError || !existingPhone) {
      return NextResponse.json(
        { error: 'Phone number not found or unauthorized' },
        { status: 404 }
      )
    }

    // Update phone number in VAPI if assistant is being set (path: /phone-number/:id, not /v1/...)
    if (vapiAssistantId) {
      const vapiApiKey = process.env.VAPI_API_KEY
      if (vapiApiKey && vapiApiKey !== 'your_vapi_api_key_here') {
        try {
          const res = await fetch(
            `https://api.vapi.ai/phone-number/${encodeURIComponent(existingPhone.vapi_phone_number_id)}`,
            {
              method: 'PATCH',
              headers: {
                Authorization: `Bearer ${vapiApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ assistantId: vapiAssistantId }),
            }
          )
          if (!res.ok) {
            const errText = await res.text()
            console.error('VAPI update error:', res.status, errText)
          }
        } catch (vapiError) {
          console.error('VAPI update error:', vapiError)
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
      .eq('organisation_id', userAndOrg.organisationId)
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userAndOrg = await getCurrentUserAndOrg()
    if (!userAndOrg) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params

    const supabase = await createClient()
    const { data: existingPhone, error: checkError } = await supabase
      .from('phone_numbers')
      .select('vapi_phone_number_id')
      .eq('id', id)
      .eq('organisation_id', userAndOrg.organisationId)
      .single()

    if (checkError || !existingPhone) {
      return NextResponse.json(
        { error: 'Phone number not found or unauthorized' },
        { status: 404 }
      )
    }

    // Delete from VAPI (optional - you might want to keep the number)
    // For now, we'll just delete from our database

    const { error } = await supabase
      .from('phone_numbers')
      .delete()
      .eq('id', id)
      .eq('organisation_id', userAndOrg.organisationId)

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

