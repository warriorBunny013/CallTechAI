import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { auth } from '@clerk/nextjs/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = params
    const body = await request.json()
    const { intent_name, example_user_phrases, english_responses, russian_responses } = body

    // Validate required fields
    if (!intent_name || !example_user_phrases || !english_responses || !russian_responses) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // First verify the intent belongs to the user
    const { data: existingIntent, error: checkError } = await supabase
      .from('intents')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
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
        russian_responses,
      })
      .eq('id', id)
      .eq('user_id', userId)
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
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = params

    // First verify the intent belongs to the user
    const { data: existingIntent, error: checkError } = await supabase
      .from('intents')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
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
      .eq('user_id', userId)

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to delete intent' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Intent deleted successfully' })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 