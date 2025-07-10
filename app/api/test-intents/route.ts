import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Test 1: GET all intents
    const { data: intents, error: getError } = await supabase
      .from('intents')
      .select('*')
    
    if (getError) {
      return NextResponse.json({ error: 'GET test failed', details: getError })
    }

    // Test 2: POST new intent
    const testIntent = {
      intent_name: "Test Intent",
      example_user_phrases: ["Test phrase 1", "Test phrase 2"],
      english_responses: ["Test English response"],
      russian_responses: ["Тестовый русский ответ"]
    }

    const { data: newIntent, error: postError } = await supabase
      .from('intents')
      .insert(testIntent)
      .select()
      .single()

    if (postError) {
      return NextResponse.json({ error: 'POST test failed', details: postError })
    }

    // Test 3: PUT update intent
    const updateData = {
      intent_name: "Updated Test Intent",
      example_user_phrases: ["Updated test phrase"],
      english_responses: ["Updated English response"],
      russian_responses: ["Обновленный русский ответ"]
    }

    const { data: updatedIntent, error: putError } = await supabase
      .from('intents')
      .update(updateData)
      .eq('id', newIntent.id)
      .select()
      .single()

    if (putError) {
      return NextResponse.json({ error: 'PUT test failed', details: putError })
    }

    // Test 4: DELETE intent
    const { error: deleteError } = await supabase
      .from('intents')
      .delete()
      .eq('id', newIntent.id)

    if (deleteError) {
      return NextResponse.json({ error: 'DELETE test failed', details: deleteError })
    }

    return NextResponse.json({
      message: 'All CRUD operations working correctly',
      tests: {
        get: '✅ PASSED',
        post: '✅ PASSED',
        put: '✅ PASSED',
        delete: '✅ PASSED'
      },
      originalCount: intents.length,
      testIntent: newIntent,
      updatedIntent: updatedIntent
    })

  } catch (error) {
    console.error('Test error:', error)
    return NextResponse.json(
      { error: 'Test failed', details: error },
      { status: 500 }
    )
  }
} 