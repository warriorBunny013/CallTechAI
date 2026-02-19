import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserAndOrg } from '@/lib/org'

// GET: Get working hours configuration for current user
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
    const { data: workingHours, error } = await supabase
      .from('working_hours')
      .select('*')
      .eq('user_id', userAndOrg.userId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch working hours' },
        { status: 500 }
      )
    }

    // Return default configuration if none exists
    if (!workingHours) {
      return NextResponse.json({
        workingHours: null,
        message: 'No working hours configured'
      })
    }

    return NextResponse.json({ workingHours })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST/PUT: Create or update working hours configuration
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
    const {
      is_enabled,
      timezone,
      monday_enabled,
      monday_start_time,
      monday_end_time,
      tuesday_enabled,
      tuesday_start_time,
      tuesday_end_time,
      wednesday_enabled,
      wednesday_start_time,
      wednesday_end_time,
      thursday_enabled,
      thursday_start_time,
      thursday_end_time,
      friday_enabled,
      friday_start_time,
      friday_end_time,
      saturday_enabled,
      saturday_start_time,
      saturday_end_time,
      sunday_enabled,
      sunday_start_time,
      sunday_end_time,
      outside_hours_message
    } = body

    // Upsert working hours configuration
    const { data: workingHours, error } = await supabase
      .from('working_hours')
      .upsert({
        user_id: userAndOrg.userId,
        is_enabled: is_enabled ?? false,
        timezone: timezone || 'America/New_York',
        monday_enabled: monday_enabled ?? false,
        monday_start_time: monday_start_time || null,
        monday_end_time: monday_end_time || null,
        tuesday_enabled: tuesday_enabled ?? false,
        tuesday_start_time: tuesday_start_time || null,
        tuesday_end_time: tuesday_end_time || null,
        wednesday_enabled: wednesday_enabled ?? false,
        wednesday_start_time: wednesday_start_time || null,
        wednesday_end_time: wednesday_end_time || null,
        thursday_enabled: thursday_enabled ?? false,
        thursday_start_time: thursday_start_time || null,
        thursday_end_time: thursday_end_time || null,
        friday_enabled: friday_enabled ?? false,
        friday_start_time: friday_start_time || null,
        friday_end_time: friday_end_time || null,
        saturday_enabled: saturday_enabled ?? false,
        saturday_start_time: saturday_start_time || null,
        saturday_end_time: saturday_end_time || null,
        sunday_enabled: sunday_enabled ?? false,
        sunday_start_time: sunday_start_time || null,
        sunday_end_time: sunday_end_time || null,
        outside_hours_message: outside_hours_message || 'Sorry, we are currently closed. Please call back during our business hours.'
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to save working hours' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Working hours saved successfully',
      workingHours
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

