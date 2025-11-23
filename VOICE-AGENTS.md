# Voice Agents Feature

## Overview

The Voice Agents feature allows users to choose from pre-configured voice agent personalities when creating their AI assistant. Each voice agent has unique characteristics, language support, and personality traits.

## Available Voice Agents

### 1. Sarah - Professional Assistant
- **Language**: English Only
- **Gender**: Female
- **Personality**: Professional, friendly, and efficient
- **Best For**: Business calls, professional interactions

### 2. Alex - Friendly Assistant
- **Language**: English Only
- **Gender**: Male
- **Personality**: Warm, conversational, and approachable
- **Best For**: Customer service, casual interactions

### 3. Luna - Multilingual Assistant
- **Language**: Multilingual (English, Spanish, and more)
- **Gender**: Female
- **Personality**: Adaptive, culturally aware, and versatile
- **Best For**: Diverse customer bases, international businesses

### 4. Carlos - Spanish Professional
- **Language**: Spanish Only
- **Gender**: Male
- **Personality**: Professional, clear, and respectful
- **Best For**: Spanish-speaking customers and businesses

### 5. Emma - Energetic Assistant
- **Language**: English Only
- **Gender**: Female
- **Personality**: Energetic, upbeat, and enthusiastic
- **Best For**: Sales and marketing calls

### 6. Jordan - Calm Assistant
- **Language**: English Only
- **Gender**: Neutral
- **Personality**: Calm, patient, and reassuring
- **Best For**: Support calls, situations requiring empathy

## Features

### Filtering Options

Users can filter voice agents by:

1. **Language Filter**:
   - All Languages
   - English Only
   - Spanish Only
   - Multilingual

2. **Gender Filter**:
   - All Genders
   - Male
   - Female
   - Neutral

### Voice Agent Selection

- Each voice agent card shows:
  - Name and personality description
  - Language and gender badges
  - First message preview
  - "Create Assistant" button

- Users can:
  - Browse all available agents
  - Filter by language and gender
  - Preview agent personality
  - Create assistant with selected agent

## User Flow

```
1. User goes to /dashboard/assistants
   ↓
2. Sees list of 6 voice agents
   ↓
3. Applies filters (language, gender)
   ↓
4. Selects a voice agent
   ↓
5. Clicks "Create Assistant"
   ↓
6. System creates assistant with:
   - Selected voice agent personality
   - User's intents
   - Voice agent's voice settings
   - Voice agent's system prompt
   ↓
7. Assistant is ready to use
```

## Integration with Assistant Creation

When a user selects a voice agent and creates an assistant:

1. **Voice Agent Configuration** is applied:
   - Voice provider and voice ID
   - Model settings (temperature, etc.)
   - System prompt with personality
   - First message

2. **User's Intents** are integrated:
   - Intent responses are added to system prompt
   - Assistant uses user's custom responses
   - Maintains voice agent's personality

3. **Assistant is Created**:
   - Created in VAPI with voice agent settings
   - Saved to database with `user_id`
   - Linked to user's intents

## Dashboard Page

### Location
`/dashboard/assistants`

### Features
- Grid layout showing all voice agents
- Filter sidebar (language, gender)
- Stats cards (available agents, user intents, active assistant)
- Empty state handling
- Loading states
- Error handling

### UI Components
- Voice agent cards with personality info
- Filter dropdowns
- Create assistant buttons
- Badge indicators for language/gender
- Stats summary

## API Integration

### Create Assistant Endpoint
```
POST /api/create-assistant
Body: {
  intentIds: string[],
  name?: string,
  voiceAgent: VoiceAgent
}
```

The endpoint:
- Accepts voice agent configuration
- Merges voice agent settings with user's intents
- Creates assistant in VAPI
- Saves to database with user_id

## Data Structure

### VoiceAgent Interface
```typescript
interface VoiceAgent {
  id: string
  name: string
  personality: string
  description: string
  language: 'english' | 'multilingual' | 'spanish'
  gender: 'male' | 'female' | 'neutral'
  voiceProvider: '11labs' | 'openai' | 'deepgram'
  voiceId: string
  model: {
    provider: string
    model: string
    temperature: number
  }
  systemPrompt: string
  firstMessage: string
}
```

## Setup Wizard Integration

The setup wizard now includes:
1. Add Phone Number
2. Create Intents
3. **Choose & Create Assistant** (new step)
4. Launch Assistant

Users are guided to the assistants page to select their voice agent.

## Benefits

- ✅ **Easy Selection**: Pre-configured personalities save time
- ✅ **Consistent Quality**: Tested voice agent configurations
- ✅ **Flexible Filtering**: Find the perfect agent quickly
- ✅ **User Customization**: Still uses user's intents
- ✅ **Professional Options**: Multiple personalities for different use cases

## Summary

The Voice Agents feature provides users with 6 pre-configured voice agent personalities to choose from. Users can filter by language and gender, preview personalities, and create their assistant with one click. The selected voice agent's personality, voice, and settings are applied while still using the user's custom intents for responses.

