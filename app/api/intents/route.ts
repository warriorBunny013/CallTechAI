import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserAndOrg } from '@/lib/org'
import { syncOrgIntentsToVapi } from '@/lib/vapi-update-assistant'

export async function GET(request: NextRequest) {
  try {
    const userAndOrg = await getCurrentUserAndOrg()
    if (!userAndOrg) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = await createClient()
    const { data: intents, error } = await supabase
      .from('intents')
      .select('*')
      .eq('organisation_id', userAndOrg.organisationId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch intents' },
        { status: 500 }
      )
    }

    return NextResponse.json({ intents })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const userAndOrg = await getCurrentUserAndOrg()
    if (!userAndOrg) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

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
    const { data: intent, error } = await supabase
      .from('intents')
      .insert({
        organisation_id: userAndOrg.organisationId,
        user_id: userAndOrg.userId,
        intent_name,
        example_user_phrases,
        english_responses,
        russian_responses: russian_responses ?? [],
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to create intent' },
        { status: 500 }
      )
    }

    await syncOrgIntentsToVapi(userAndOrg.organisationId, supabase)

    return NextResponse.json({ intent }, { status: 201 })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 