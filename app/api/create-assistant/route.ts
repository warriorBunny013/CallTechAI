import { NextRequest, NextResponse } from 'next/server'
import { VapiClient } from '@vapi-ai/server-sdk'
import { createAssistantConfig } from '@/lib/vapi'
import { supabase } from '@/lib/supabase'
import { auth } from '@clerk/nextjs/server'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get intents and voice agent from the request body
    const { intentIds, name, voiceAgent } = await request.json()
    
    if (!intentIds || intentIds.length === 0) {
      return NextResponse.json(
        { error: 'No intents provided' },
        { status: 400 }
      )
    }

    // Fetch user's intents from database
    const { data: intents, error: intentsError } = await supabase
      .from('intents')
      .select('*')
      .eq('user_id', userId)
      .in('id', intentIds)

    if (intentsError || !intents || intents.length === 0) {
      return NextResponse.json(
        { error: 'Failed to fetch intents or intents not found' },
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
    let assistantConfig: any
    
    if (voiceAgent) {
      // Use voice agent template configuration
      const formattedIntents = intents.map((intent: any) => ({
        name: intent.intent_name,
        examples: intent.example_user_phrases,
        responses: {
          english: intent.english_responses,
          russian: intent.russian_responses
        }
      }))

      // Build system prompt with voice agent personality and intents
      const intentsPrompt = formattedIntents.map((intent: any) => `
Intent: ${intent.name}
Example questions: ${intent.examples.join(', ')}
English responses: ${intent.responses.english.join(' | ')}
${intent.responses.russian.length > 0 ? `Russian responses: ${intent.responses.russian.join(' | ')}` : ''}
`).join('')

      assistantConfig = {
        name: name || voiceAgent.name,
        firstMessage: voiceAgent.firstMessage,
        model: {
          provider: voiceAgent.model.provider,
          model: voiceAgent.model.model,
          temperature: voiceAgent.model.temperature,
          messages: [
            {
              role: "system",
              content: `${voiceAgent.systemPrompt}

Based on the following intents and their responses:

${intentsPrompt}

Instructions:
1. Listen to the user's question and identify which intent it matches
2. Respond in the same language the user is speaking
3. Use the appropriate response from the matching intent
4. If no intent matches, politely ask for clarification
5. Maintain your personality: ${voiceAgent.personality}
6. Keep responses concise and natural for voice interaction`
            }
          ]
        },
        voice: {
          provider: voiceAgent.voiceProvider,
          voiceId: voiceAgent.voiceId
        }
      }
    } else {
      // Use default configuration
      assistantConfig = createAssistantConfig(intents)
      if (name) {
        assistantConfig.name = name
      }
    }

    // Create the assistant via Vapi API
    const vapiAssistant = await vapi.assistants.create(assistantConfig)

    // Save assistant to database
    const { data: savedAssistant, error: dbError } = await supabase
      .from('assistants')
      .insert({
        user_id: userId,
        vapi_assistant_id: vapiAssistant.id,
        name: name || voiceAgent?.name || 'CallTechAI Assistant',
        config: {
          ...assistantConfig,
          voiceAgentId: voiceAgent?.id,
          personality: voiceAgent?.personality
        },
        intents_used: intentIds
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      // Assistant was created in VAPI, but failed to save to DB
      // We'll still return success but log the error
    }

    return NextResponse.json({
      message: 'Assistant created successfully',
      assistantId: vapiAssistant.id,
      assistant: vapiAssistant,
      savedAssistant: savedAssistant
    })

  } catch (error) {
    console.error('Error creating assistant:', error)
    return NextResponse.json(
      { error: 'Failed to create assistant', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 