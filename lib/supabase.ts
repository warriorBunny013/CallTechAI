import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Type definitions for the intents table
export interface Intent {
  id: string
  intent_name: string
  example_user_phrases: string[]
  english_responses: string[]
  russian_responses: string[]
  created_at: string
} 