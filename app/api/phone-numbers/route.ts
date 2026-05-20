/**
 * Phone Numbers API (multi-tenant by organisation_id).
 *
 * POST: Import a Twilio phone number. Configures Twilio webhook to point to our
 *       /api/webhooks/twilio endpoint so ElevenLabs handles inbound calls.
 * GET:  List all phone numbers for the current org.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseService } from '@/lib/supabase/service'
import { getCurrentUserAndOrg } from '@/lib/org'
import {
  importPhoneNumberToElevenLabs,
  assignAgentToElevenLabsPhoneNumber,
  patchAgentTwilioAudio,
} from '@/lib/elevenlabs-agent-manager'

function normalizeE164(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return phone.startsWith('+') ? phone : `+${digits}`
}

// GET: List all phone numbers for the current org
export async function GET() {
  try {
    const userAndOrg = await getCurrentUserAndOrg()
    if (!userAndOrg) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const { data: phoneNumbers, error } = await supabase
      .from('phone_numbers')
      .select('*')
      .eq('organisation_id', userAndOrg.organisationId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch phone numbers' }, { status: 500 })
    }

    // Enrich with org's agent name
    const { data: settings } = await supabase
      .from('organisation_settings')
      .select('agent_name')
      .eq('organisation_id', userAndOrg.organisationId)
      .maybeSingle()

    const agentName = (settings as Record<string, unknown> | null)?.agent_name ?? null

    const enriched = (phoneNumbers ?? []).map((p: Record<string, unknown>) => ({
      ...p,
      assistant_name: agentName ?? 'AI Assistant',
    }))

    return NextResponse.json({ phoneNumbers: enriched })
  } catch (err) {
    console.error('[phone-numbers GET] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: Import a Twilio phone number and configure its webhook
export async function POST(request: NextRequest) {
  try {
    const userAndOrg = await getCurrentUserAndOrg()
    if (!userAndOrg) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { phoneNumber, twilioAccountSid, twilioAuthToken, label, countryCode } = body as {
      phoneNumber?: string
      twilioAccountSid?: string
      twilioAuthToken?: string
      label?: string
      countryCode?: string
    }

    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
    }
    if (!twilioAccountSid) {
      return NextResponse.json({ error: 'Twilio Account SID is required' }, { status: 400 })
    }
    if (!twilioAuthToken) {
      return NextResponse.json({ error: 'Twilio Auth Token is required' }, { status: 400 })
    }

    const e164Number = normalizeE164(phoneNumber)

    // Use service client for inserts (bypasses RLS)
    const supabase = getSupabaseService()
    const normalizeDigits = (p: string) => p.replace(/\D/g, '')
    const { data: existingRows } = await supabase
      .from('phone_numbers')
      .select('id, phone_number')
      .eq('organisation_id', userAndOrg.organisationId)

    const alreadyExists = (existingRows ?? []).some(
      (row: { phone_number?: string }) =>
        normalizeDigits(row.phone_number ?? '') === normalizeDigits(e164Number)
    )
    if (alreadyExists) {
      return NextResponse.json(
        { error: 'This number is already in your dashboard.' },
        { status: 400 }
      )
    }

    // Step 1: Import the number into ElevenLabs.
    // This registers it in the ElevenLabs dashboard and ElevenLabs will
    // automatically update the Twilio webhook to their servers for native audio handling.
    let elevenLabsPhoneNumberId: string | null = null
    let elevenLabsRegistered = false
    try {
      elevenLabsPhoneNumberId = await importPhoneNumberToElevenLabs(
        e164Number,
        label ?? e164Number,
        twilioAccountSid,
        twilioAuthToken
      )
      elevenLabsRegistered = true
      console.log(`[phone-numbers] Registered in ElevenLabs: ${elevenLabsPhoneNumberId}`)
    } catch (e) {
      console.warn('[phone-numbers] ElevenLabs import failed (saving locally anyway):', e)
    }

    // Step 2: Save to our DB
    const { data: savedPhoneNumber, error: dbError } = await supabase
      .from('phone_numbers')
      .insert({
        organisation_id: userAndOrg.organisationId,
        user_id: userAndOrg.userId,
        phone_number: e164Number,
        country_code: countryCode ?? 'US',
        number_type: 'imported',
        is_active: true,
        twilio_account_sid: twilioAccountSid,
        twilio_auth_token: twilioAuthToken,
        label: label ?? null,
        elevenlabs_phone_number_id: elevenLabsPhoneNumberId ?? null,
      } as Record<string, unknown>)
      .select()
      .single()

    if (dbError) {
      console.error('[phone-numbers] DB insert error:', dbError.message, dbError.details, dbError.hint)
      return NextResponse.json({ error: `Failed to save phone number: ${dbError.message}` }, { status: 500 })
    }

    // Step 3: Auto-assign the org's default (or first) assistant
    let assistantLinked = false
    try {
      const { data: defaultAssistant } = await supabase
        .from('organisation_assistants')
        .select('id, elevenlabs_agent_id, name')
        .eq('organisation_id', userAndOrg.organisationId)
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      const agentElevenLabsId = (defaultAssistant as { elevenlabs_agent_id?: string } | null)?.elevenlabs_agent_id

      if (agentElevenLabsId) {
        // Patch agent for Twilio compatibility (μ-law + override permissions)
        await patchAgentTwilioAudio(agentElevenLabsId).catch((e) =>
          console.warn('[phone-numbers] patchAgentTwilioAudio failed:', e)
        )

        // Assign in our DB
        await supabase
          .from('phone_numbers')
          .update({
            assistant_id: (defaultAssistant as { id: string }).id,
            elevenlabs_agent_id: agentElevenLabsId,
          } as Record<string, unknown>)
          .eq('id', (savedPhoneNumber as { id: string }).id)

        // Assign in ElevenLabs (so the number → agent link is visible in their dashboard)
        if (elevenLabsPhoneNumberId) {
          await assignAgentToElevenLabsPhoneNumber(elevenLabsPhoneNumberId, agentElevenLabsId).catch((e) =>
            console.warn('[phone-numbers] ElevenLabs assign agent failed:', e)
          )
        }

        assistantLinked = true
        console.log(
          `[phone-numbers] Auto-linked assistant "${(defaultAssistant as { name: string }).name}" ` +
          `(${agentElevenLabsId}) to ${e164Number}`
        )
      }
    } catch (e) {
      console.warn('[phone-numbers] Could not auto-assign assistant (not critical):', e)
    }

    return NextResponse.json(
      {
        phoneNumber: savedPhoneNumber,
        elevenLabsRegistered,
        elevenLabsPhoneNumberId,
        assistantLinked,
        message: elevenLabsRegistered
          ? 'Phone number added and registered in ElevenLabs.'
          : 'Phone number added. Visit ElevenLabs dashboard to register it manually.',
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('[phone-numbers POST] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
