import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { sampleIntents } from '@/lib/sample-data'

export async function POST(request: NextRequest) {
  try {
    // Clear existing data
    const { error: deleteError } = await supabase
      .from('intents')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all records

    if (deleteError) {
      console.error('Error clearing data:', deleteError)
      return NextResponse.json(
        { error: 'Failed to clear existing data' },
        { status: 500 }
      )
    }

    // Insert sample data
    const { data: intents, error: insertError } = await supabase
      .from('intents')
      .insert(sampleIntents)
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