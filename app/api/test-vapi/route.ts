import { NextRequest, NextResponse } from 'next/server'
import { createAssistantConfig } from '@/lib/vapi'

export async function GET(request: NextRequest) {
  try {
    // Mock intents for testing
    const mockIntents = [
      {
        id: "1",
        intent_name: "Business Hours",
        example_user_phrases: ["What are your business hours?", "When are you open?"],
        english_responses: ["Our business hours are Monday to Friday from 9 AM to 6 PM."],
        russian_responses: ["Наш рабочий график: с понедельника по пятницу с 9:00 до 18:00."],
        created_at: new Date().toISOString()
      },
      {
        id: "2",
        intent_name: "Location",
        example_user_phrases: ["Where are you located?", "What's your address?"],
        english_responses: ["We are located at 123 Business Street, New York, NY 10001."],
        russian_responses: ["Мы находимся по адресу: улица Деловая 123, Нью-Йорк, NY 10001."],
        created_at: new Date().toISOString()
      }
    ]

    const assistantConfig = createAssistantConfig(mockIntents)

    return NextResponse.json({
      message: 'Vapi configuration test successful',
      assistantConfig: assistantConfig,
      intentsCount: mockIntents.length,
      systemPrompt: assistantConfig.assistant.model.systemPrompt.substring(0, 200) + '...'
    })

  } catch (error) {
    console.error('Vapi test error:', error)
    return NextResponse.json(
      { error: 'Vapi test failed', details: error },
      { status: 500 }
    )
  }
} 