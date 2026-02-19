import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserAndOrg } from '@/lib/org'
import { VapiClient } from '@vapi-ai/server-sdk'
import { createAssistantConfig } from '@/lib/vapi'

// POST: Create a default assistant for a new user
export async function POST(request: NextRequest) {
  try {
    const userAndOrg = await getCurrentUserAndOrg()
    if (!userAndOrg) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = await createClient()

    // Check if org already has an assistant
    const { data: existingAssistants } = await supabase
      .from('assistants')
      .select('id')
      .eq('organisation_id', userAndOrg.organisationId)
      .limit(1)

    if (existingAssistants && existingAssistants.length > 0) {
      return NextResponse.json({
        message: 'User already has an assistant',
        assistant: existingAssistants[0]
      })
    }

    // Get org's intents
    const { data: intents, error: intentsError } = await supabase
      .from('intents')
      .select('*')
      .eq('organisation_id', userAndOrg.organisationId)

    if (intentsError) {
      console.error('Error fetching intents:', intentsError)
    }

    // Validate VAPI API key
    const vapiApiKey = process.env.VAPI_API_KEY
    if (!vapiApiKey || vapiApiKey === 'your_vapi_api_key_here') {
      return NextResponse.json(
        { error: 'VAPI API key not configured' },
        { status: 500 }
      )
    }

    // Create VAPI client
    const vapi = new VapiClient({
      token: vapiApiKey
    })

    // Create assistant configuration
    const assistantConfig = createAssistantConfig(intents || [])
    assistantConfig.name = "My CallTechAI Assistant"

    // Create the assistant via VAPI API
    const vapiAssistant = await vapi.assistants.create(assistantConfig)

    // Save assistant to database
    const { data: savedAssistant, error: dbError } = await supabase
      .from('assistants')
      .insert({
        organisation_id: userAndOrg.organisationId,
        user_id: userAndOrg.userId,
        vapi_assistant_id: vapiAssistant.id,
        name: assistantConfig.name,
        config: assistantConfig,
        intents_used: intents?.map(i => i.id) || []
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      // Assistant was created in VAPI, but failed to save to DB
      return NextResponse.json({
        message: 'Assistant created in VAPI but failed to save to database',
        assistantId: vapiAssistant.id,
        assistant: vapiAssistant
      })
    }

    return NextResponse.json({
      message: 'Default assistant created successfully',
      assistant: savedAssistant,
      vapiAssistant: vapiAssistant
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating default assistant:', error)
    return NextResponse.json(
      { error: 'Failed to create default assistant', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

