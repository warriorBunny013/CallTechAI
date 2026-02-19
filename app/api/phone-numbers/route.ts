/**
 * Phone Numbers API (multi-tenant by organisation_id).
 * phone_numbers.phone_number = clinic number (E.164) that customers call.
 * Uses Vapi API only: POST https://api.vapi.ai/phone-number (not /v1/phone-numbers).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserAndOrg } from '@/lib/org'
import { setVapiPhoneNumberAssistant } from '@/lib/vapi-phone-number'

const VAPI_PHONE_BASE = 'https://api.vapi.ai'

// GET: List all phone numbers for the current user's organisation
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
    const { data: phoneNumbers, error } = await supabase
      .from('phone_numbers')
      .select('*')
      .eq('organisation_id', userAndOrg.organisationId)
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

// POST: Create a new phone number via Vapi (free US number) OR import Twilio number into Vapi.
// Two types:
// 1. Free Vapi number: { type: "vapi", areaCode: "415" }
// 2. Import Twilio: { type: "twilio", phoneNumber: "+14155551234", twilioAccountSid: "...", twilioAuthToken: "..." }
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
    const { type, areaCode, countryCode, phoneNumber, twilioAccountSid, twilioAuthToken, smsEnabled, label } = body as {
      type?: 'vapi' | 'twilio'
      areaCode?: string
      countryCode?: string
      phoneNumber?: string
      twilioAccountSid?: string
      twilioAuthToken?: string
      smsEnabled?: boolean
      label?: string
    }

    const vapiApiKey = process.env.VAPI_API_KEY
    if (!vapiApiKey || vapiApiKey === 'your_vapi_api_key_here') {
      return NextResponse.json(
        { error: 'VAPI API key not configured' },
        { status: 500 }
      )
    }

    let vapiPhoneNumber: { id?: string; number?: string; message?: string; error?: string }
    let numberType: 'free' | 'imported'
    let e164Number: string
    let twilioSid: string | null = null
    let twilioToken: string | null = null

    if (type === 'twilio' || (phoneNumber && twilioAccountSid)) {
      // Import Twilio number into Vapi
      if (!phoneNumber || !twilioAccountSid) {
        return NextResponse.json(
          { error: 'Twilio phone number and Account SID are required' },
          { status: 400 }
        )
      }

      // Normalize phone number to E.164
      const normalized = phoneNumber.replace(/\s+/g, '').replace(/^\+?1?/, '+1')
      if (!normalized.startsWith('+')) {
        return NextResponse.json(
          { error: 'Phone number must be in E.164 format (e.g., +14155551234)' },
          { status: 400 }
        )
      }

      const createBody = {
        provider: 'twilio' as const,
        number: normalized,
        twilioAccountSid,
        twilioAuthToken: twilioAuthToken || undefined,
        smsEnabled: smsEnabled !== false, // default true
        name: label || `CallTechAI-${userAndOrg.organisationId.slice(0, 8)}`,
      }

      const createRes = await fetch(`${VAPI_PHONE_BASE}/phone-number`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${vapiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createBody),
      })

      const raw = await createRes.text()
      try {
        vapiPhoneNumber = raw ? JSON.parse(raw) : {}
      } catch {
        vapiPhoneNumber = { message: raw || 'Invalid response' }
      }

      if (!createRes.ok) {
        const msg = vapiPhoneNumber?.message || vapiPhoneNumber?.error || raw || `Vapi returned ${createRes.status}`
        const msgStr = typeof msg === 'string' ? msg : String(msg)

        // VAPI returns "Existing Phone Number {id} Has Identical twilioAccountSid and number" when the number is already in VAPI.
        // Re-use that existing VAPI phone number and add our DB row so the user can use it (e.g. re-adding after delete, or same number in same org).
        const existingIdMatch = msgStr.match(/Existing Phone Number\s+([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i)
        if (existingIdMatch) {
          const existingVapiId = existingIdMatch[1]
          vapiPhoneNumber = { id: existingVapiId, number: normalized }
          numberType = 'imported'
          e164Number = normalized
          twilioSid = twilioAccountSid
          twilioToken = twilioAuthToken || null
        } else {
          console.error('VAPI Twilio import error:', createRes.status, msgStr, raw)
          return NextResponse.json(
            { error: msgStr || 'Failed to import Twilio number into Vapi' },
            { status: createRes.status >= 400 ? createRes.status : 500 }
          )
        }
      } else {
        numberType = 'imported'
        e164Number = normalized
        twilioSid = twilioAccountSid
        twilioToken = twilioAuthToken || null
      }
    } else {
      // Create free Vapi number
      const area = (areaCode && String(areaCode).replace(/\D/g, '').slice(0, 3)) || '415'
      const createBody = {
        provider: 'vapi' as const,
        numberDesiredAreaCode: area,
        name: label || `CallTechAI-${userAndOrg.organisationId.slice(0, 8)}`,
      }

      const createRes = await fetch(`${VAPI_PHONE_BASE}/phone-number`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${vapiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createBody),
      })

      const raw = await createRes.text()
      try {
        vapiPhoneNumber = raw ? JSON.parse(raw) : {}
      } catch {
        vapiPhoneNumber = { message: raw || 'Invalid response' }
      }

      if (!createRes.ok) {
        const msg = vapiPhoneNumber?.message || vapiPhoneNumber?.error || `Vapi returned ${createRes.status}`
        console.error('VAPI phone create error:', createRes.status, msg, raw)
        return NextResponse.json(
          { error: msg || 'Failed to create phone number with Vapi' },
          { status: createRes.status >= 400 ? createRes.status : 500 }
        )
      }

      numberType = 'free'
      e164Number = vapiPhoneNumber.number || `+1${area}***`
    }

    const vapiId = vapiPhoneNumber.id
    if (!vapiId) {
      console.error('VAPI response missing id:', vapiPhoneNumber)
      return NextResponse.json(
        { error: 'Vapi did not return a phone number ID' },
        { status: 500 }
      )
    }

    // Update e164Number from Vapi response if available
    if (vapiPhoneNumber.number) {
      e164Number = vapiPhoneNumber.number
    }

    const supabase = await createClient()
    const normaliseForMatch = (p: string | undefined | null): string => (p == null ? '' : p.replace(/\D/g, ''))
    const { data: existingRows } = await supabase
      .from('phone_numbers')
      .select('id, phone_number')
      .eq('organisation_id', userAndOrg.organisationId)
    const alreadyHasNumber = (existingRows ?? []).some(
      (row: { phone_number?: string }) => normaliseForMatch(row.phone_number) === normaliseForMatch(e164Number)
    )
    if (alreadyHasNumber) {
      return NextResponse.json(
        { error: 'This number is already in your dashboard. Add a different number or remove it first.' },
        { status: 400 }
      )
    }

    // Sync assistant to VAPI: set the org's selected voice agent on this phone number
    // so it shows correctly in VAPI dashboard (Inbound Settings → Assistant)
    const { data: org } = await supabase
      .from('organisations')
      .select('selected_voice_agent_id')
      .eq('id', userAndOrg.organisationId)
      .single()
    const assistantId = (org as { selected_voice_agent_id?: string } | null)?.selected_voice_agent_id ?? null
    if (assistantId) {
      await setVapiPhoneNumberAssistant(vapiId, assistantId, vapiApiKey)
    }

    const insertData: any = {
      organisation_id: userAndOrg.organisationId,
      user_id: userAndOrg.userId,
      vapi_phone_number_id: vapiId,
      phone_number: e164Number,
      country_code: countryCode || 'US',
      number_type: numberType,
      is_active: true,
    }

    // Store Twilio credentials only for imported numbers
    if (numberType === 'imported') {
      insertData.twilio_account_sid = twilioSid
      if (twilioToken) {
        insertData.twilio_auth_token = twilioToken
      }
    }

    const { data: savedPhoneNumber, error: dbError } = await supabase
      .from('phone_numbers')
      .insert(insertData)
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json(
        { error: 'Failed to save phone number to database' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { phoneNumber: savedPhoneNumber, vapiResponse: vapiPhoneNumber },
      { status: 201 }
    )
  } catch (error: unknown) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

