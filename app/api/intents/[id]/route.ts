import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseService } from '@/lib/supabase/service'
import { getCurrentUserAndOrg } from '@/lib/org'
import { syncOrgIntentsToVapi } from '@/lib/vapi-update-assistant'

// Uses the service-role client throughout so Supabase RLS (which relies on
// auth.uid() / Supabase native sessions) does not block writes.
// Application-level authorization is enforced via getCurrentUserAndOrg() +
// organisation_id filtering on every query.

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userAndOrg = await getCurrentUserAndOrg()
    if (!userAndOrg) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { intent_name, example_user_phrases, english_responses, russian_responses } = body

    if (!intent_name || !example_user_phrases || !english_responses) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = getSupabaseService()

    // Verify intent belongs to this organisation before updating
    const { data: existingIntent, error: checkError } = await supabase
      .from('intents')
      .select('id')
      .eq('id', id)
      .eq('organisation_id', userAndOrg.organisationId)
      .single()

    if (checkError || !existingIntent) {
      return NextResponse.json({ error: 'Intent not found or unauthorized' }, { status: 404 })
    }

    const { error: updateError } = await supabase
      .from('intents')
      .update({
        intent_name,
        example_user_phrases,
        english_responses,
        russian_responses: russian_responses ?? [],
      } as never)
      .eq('id', id)
      .eq('organisation_id', userAndOrg.organisationId)

    if (updateError) {
      console.error('[intents/PUT] Supabase update error:', updateError)
      return NextResponse.json({ error: 'Failed to update intent' }, { status: 500 })
    }

    // Fetch the updated row in a separate query (avoids fragility of .update().select().single())
    const { data: intent, error: fetchError } = await supabase
      .from('intents')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !intent) {
      console.error('[intents/PUT] Supabase fetch-after-update error:', fetchError)
      return NextResponse.json({ error: 'Intent not found after update' }, { status: 404 })
    }

    // Fire-and-forget — VAPI sync failure must not fail the intent save
    void syncOrgIntentsToVapi(userAndOrg.organisationId, supabase).catch((e) =>
      console.error('[intents/PUT] VAPI sync error (non-fatal):', e)
    )

    return NextResponse.json({ intent })
  } catch (error) {
    console.error('[intents/PUT] API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userAndOrg = await getCurrentUserAndOrg()
    if (!userAndOrg) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const supabase = getSupabaseService()

    // Verify intent belongs to this organisation before deleting
    const { data: existingIntent, error: checkError } = await supabase
      .from('intents')
      .select('id')
      .eq('id', id)
      .eq('organisation_id', userAndOrg.organisationId)
      .single()

    if (checkError || !existingIntent) {
      return NextResponse.json({ error: 'Intent not found or unauthorized' }, { status: 404 })
    }

    const { error } = await supabase
      .from('intents')
      .delete()
      .eq('id', id)
      .eq('organisation_id', userAndOrg.organisationId)

    if (error) {
      console.error('[intents/DELETE] Supabase error:', error)
      return NextResponse.json({ error: 'Failed to delete intent' }, { status: 500 })
    }

    // Fire-and-forget — VAPI sync failure must not fail the intent delete
    void syncOrgIntentsToVapi(userAndOrg.organisationId, supabase).catch((e) =>
      console.error('[intents/DELETE] VAPI sync error (non-fatal):', e)
    )

    return NextResponse.json({ message: 'Intent deleted successfully' })
  } catch (error) {
    console.error('[intents/DELETE] API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
