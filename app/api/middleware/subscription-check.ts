import { currentUser } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function checkSubscriptionLimits(feature: 'calls' | 'intents') {
  const user = await currentUser()
  if (!user) {
    return { allowed: false, error: 'Unauthorized' }
  }

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!subscription) {
    return { allowed: false, error: 'No active subscription' }
  }

  const { data: usage } = await supabase
    .from('usage_tracking')
    .select('*')
    .eq('subscription_id', subscription.id)
    .gte('period_end', new Date().toISOString())
    .single()

  if (!usage) {
    return { allowed: true }
  }

  // Check limits based on plan
  const limits = {
    basic: { calls: 100, intents: 3 },
    pro: { calls: 500, intents: 10 },
    ultimate: { calls: -1, intents: -1 } // Unlimited
  }

  const planLimits = limits[subscription.plan_name.toLowerCase() as keyof typeof limits]
  
  if (feature === 'calls') {
    if (planLimits.calls === -1) return { allowed: true }
    return { 
      allowed: usage.calls_count < planLimits.calls,
      remaining: planLimits.calls - usage.calls_count
    }
  }

  if (feature === 'intents') {
    if (planLimits.intents === -1) return { allowed: true }
    return { 
      allowed: usage.intents_count < planLimits.intents,
      remaining: planLimits.intents - usage.intents_count
    }
  }

  return { allowed: false, error: 'Invalid feature' }
}