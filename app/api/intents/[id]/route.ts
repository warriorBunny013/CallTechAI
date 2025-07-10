import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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

    const { data: intent, error } = await supabase
      .from('intents')
      .update({
        intent_name,
        example_user_phrases,
        english_responses,
        russian_responses,
      })
      .eq('id', id)
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
    const { id } = params

    const { error } = await supabase
      .from('intents')
      .delete()
      .eq('id', id)

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