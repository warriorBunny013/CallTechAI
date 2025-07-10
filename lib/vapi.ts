// Dynamic import for Vapi to avoid constructor issues
let vapiInstance: any = null

export async function getVapi() {
  console.log('getVapi called')
  if (!vapiInstance) {
    console.log('Creating new Vapi instance')
    const vapiApiKey = process.env.NEXT_PUBLIC_VAPI_API_KEY!
    
    // Validate API key
    if (!vapiApiKey || vapiApiKey === 'your_vapi_api_key_here') {
      throw new Error('Vapi API key is not configured. Please set NEXT_PUBLIC_VAPI_API_KEY in your .env.local file.')
    }

    console.log('API key found, importing Vapi...')
    try {
      const Vapi = (await import('@vapi-ai/web')).default
      console.log('Vapi imported successfully')
      vapiInstance = new Vapi(vapiApiKey)
      console.log('Vapi instance created successfully')
    } catch (error) {
      console.error('Error creating Vapi instance:', error)
      throw new Error(`Failed to initialize Vapi: ${error}`)
    }
  } else {
    console.log('Returning existing Vapi instance')
  }
  return vapiInstance
}

// Helper function to format intents for Vapi context
export function formatIntentsForVapi(intents: any[]) {
  return intents.map(intent => ({
    name: intent.intent_name,
    examples: intent.example_user_phrases,
    responses: {
      english: intent.english_responses,
      russian: intent.russian_responses
    }
  }))
}

// Create Vapi assistant configuration
export function createAssistantConfig(intents: any[]) {
  const formattedIntents = formatIntentsForVapi(intents)
  
  const systemPrompt = `You are a helpful AI voice assistant for CallTechAI. You should respond based on the following intents and their responses:

${formattedIntents.map(intent => `
Intent: ${intent.name}
Example questions: ${intent.examples.join(', ')}
English responses: ${intent.responses.english.join(' | ')}
Russian responses: ${intent.responses.russian.join(' | ')}

`).join('')}

Instructions:
1. Listen to the user's question and identify which intent it matches
2. Respond in the same language the user is speaking (English or Russian)
3. Use the appropriate response from the matching intent
4. If no intent matches, politely ask for clarification
5. Keep responses concise and natural for voice interaction
6. Be helpful and professional in tone

Remember: You are a voice assistant, so keep responses conversational and brief.`

  return {
    name: "CallTechAI Assistant",
    firstMessage: "Hello! I'm your CallTechAI assistant. How can I help you today?",
    model: {
      provider: "openai",
      model: "gpt-4",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
      ],
    },
    voice: {
      provider: "11labs",
      voiceId: "pNInz6obpgDQGcFmaJgB" // Adam voice
    }
  }
} 