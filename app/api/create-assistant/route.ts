import { NextRequest, NextResponse } from 'next/server'
import { VapiClient } from '@vapi-ai/server-sdk'
import { createAssistantConfig } from '@/lib/vapi'

export async function POST(request: NextRequest) {
  try {
    // Get intents from the request body
    const { intents } = await request.json()
    
    if (!intents || intents.length === 0) {
      return NextResponse.json(
        { error: 'No intents provided' },
        { status: 400 }
      )
    }

    // Validate Vapi API key
    const vapiApiKey = process.env.VAPI_API_KEY
    if (!vapiApiKey || vapiApiKey === 'your_vapi_api_key_here') {
      return NextResponse.json(
        { error: 'Vapi API key not configured. Please set VAPI_API_KEY in your .env.local file.' },
        { status: 500 }
      )
    }

    // Create Vapi client
    const vapi = new VapiClient({
      token: vapiApiKey
    })

    // Create assistant configuration
    const assistantConfig = createAssistantConfig(intents)

    // Create the assistant via Vapi API
    const assistant = await vapi.assistants.create(assistantConfig)

    return NextResponse.json({
      message: 'Assistant created successfully',
      assistantId: assistant.id,
      assistant: assistant
    })

  } catch (error) {
    console.error('Error creating assistant:', error)
    return NextResponse.json(
      { error: 'Failed to create assistant', details: error },
      { status: 500 }
    )
  }
} 