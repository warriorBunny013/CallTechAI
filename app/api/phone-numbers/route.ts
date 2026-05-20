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

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://calltechai.com')

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

    // Configure Twilio webhook on this number to point to our inbound call handler
    const webhookUrl = `${APP_URL}/api/webhooks/twilio`
    let twilioConfigured = false

    try {
      // Use Twilio REST API to update incoming call webhook
      const twilioApiUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/IncomingPhoneNumbers.json`
      const searchRes = await fetch(
        `${twilioApiUrl}?PhoneNumber=${encodeURIComponent(e164Number)}`,
        {
          headers: {
            Authorization: `Basic ${Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64')}`,
          },
        }
      )
      if (searchRes.ok) {
        const searchData = await searchRes.json()
        const numbers = searchData.incoming_phone_numbers ?? []
        if (numbers.length > 0) {
          const twilioNumberSid = numbers[0].sid
          const updateRes = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/IncomingPhoneNumbers/${twilioNumberSid}.json`,
            {
              method: 'POST',
              headers: {
                Authorization: `Basic ${Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64')}`,
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: new URLSearchParams({
                VoiceUrl: webhookUrl,
                VoiceMethod: 'POST',
                StatusCallback: `${webhookUrl}?status=1`,
                StatusCallbackMethod: 'GET',
              }).toString(),
            }
          )
          twilioConfigured = updateRes.ok
          if (!updateRes.ok) {
            const errText = await updateRes.text()
            console.warn('[phone-numbers] Twilio webhook update failed:', updateRes.status, errText)
          }
        }
      }
    } catch (e) {
      console.warn('[phone-numbers] Twilio webhook setup error (number saved anyway):', e)
    }

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
      } as Record<string, unknown>)
      .select()
      .single()

    if (dbError) {
      console.error('[phone-numbers] DB insert error:', dbError.message, dbError.details, dbError.hint)
      return NextResponse.json({ error: `Failed to save phone number: ${dbError.message}` }, { status: 500 })
    }

    // Auto-assign the org's default (or first) assistant so calls work immediately
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

      if (defaultAssistant?.elevenlabs_agent_id) {
        await supabase
          .from('phone_numbers')
          .update({
            assistant_id: (defaultAssistant as { id: string }).id,
            elevenlabs_agent_id: (defaultAssistant as { elevenlabs_agent_id: string }).elevenlabs_agent_id,
          } as Record<string, unknown>)
          .eq('id', (savedPhoneNumber as { id: string }).id)
        assistantLinked = true
        console.log(
          `[phone-numbers] Auto-linked assistant "${(defaultAssistant as { name: string }).name}" ` +
          `(${(defaultAssistant as { elevenlabs_agent_id: string }).elevenlabs_agent_id}) to ${e164Number}`
        )
      }
    } catch (e) {
      console.warn('[phone-numbers] Could not auto-assign assistant (not critical):', e)
    }

    return NextResponse.json(
      {
        phoneNumber: savedPhoneNumber,
        webhookConfigured: twilioConfigured,
        assistantLinked,
        webhookUrl,
        message: twilioConfigured
          ? 'Phone number added and Twilio webhook configured.'
          : 'Phone number added. Please configure the webhook manually in Twilio console.',
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
