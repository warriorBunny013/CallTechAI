import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { sampleIntents } from '@/lib/sample-data'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Clear existing data for this user only
    const { error: deleteError } = await supabase
      .from('intents')
      .delete()
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Error clearing data:', deleteError)
      return NextResponse.json(
        { error: 'Failed to clear existing data' },
        { status: 500 }
      )
    }

    // Insert sample data with user_id
    const intentsWithUserId = sampleIntents.map(intent => ({
      ...intent,
      user_id: user.id
    }))

    const { data: intents, error: insertError } = await supabase
      .from('intents')
      .insert(intentsWithUserId)
      .select()

    if (insertError) {
      console.error('Error inserting sample data:', insertError)
      return NextResponse.json(
        { error: 'Failed to insert sample data' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      message: 'Database seeded successfully',
      intents 
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 