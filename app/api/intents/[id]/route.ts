import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserAndOrg } from '@/lib/org'
import { syncOrgIntentsToVapi } from '@/lib/vapi-update-assistant'

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
    const { intent_name, example_user_phrases, english_responses, russian_responses } = body

    // Validate required fields (russian_responses optional, defaults to [])
    if (!intent_name || !example_user_phrases || !english_responses) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: existingIntent, error: checkError } = await supabase
      .from('intents')
      .select('id')
      .eq('id', id)
      .eq('organisation_id', userAndOrg.organisationId)
      .single()

    if (checkError || !existingIntent) {
      return NextResponse.json(
        { error: 'Intent not found or unauthorized' },
        { status: 404 }
      )
    }

    const { data: intent, error } = await supabase
      .from('intents')
      .update({
        intent_name,
        example_user_phrases,
        english_responses,
        russian_responses: russian_responses ?? [],
      })
      .eq('id', id)
      .eq('organisation_id', userAndOrg.organisationId)
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to update intent' },
        { status: 500 }
      )
    }

    if (!intent) {
      return NextResponse.json(
        { error: 'Intent not found' },
        { status: 404 }
      )
    }

    await syncOrgIntentsToVapi(userAndOrg.organisationId, supabase)

    return NextResponse.json({ intent })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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
    const { data: existingIntent, error: checkError } = await supabase
      .from('intents')
      .select('id')
      .eq('id', id)
      .eq('organisation_id', userAndOrg.organisationId)
      .single()

    if (checkError || !existingIntent) {
      return NextResponse.json(
        { error: 'Intent not found or unauthorized' },
        { status: 404 }
      )
    }

    const { error } = await supabase
      .from('intents')
      .delete()
      .eq('id', id)
      .eq('organisation_id', userAndOrg.organisationId)

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to delete intent' },
        { status: 500 }
      )
    }

    await syncOrgIntentsToVapi(userAndOrg.organisationId, supabase)

    return NextResponse.json({ message: 'Intent deleted successfully' })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 