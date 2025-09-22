import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { currentUser } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's subscription from database
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error || !subscription) {
      return NextResponse.json({
        subscription: null,
        usage: { calls_count: 0, intents_count: 0 }
      })
    }

    let stripeSubscription = null
    if (subscription.stripe_subscription_id) {
      try {
        // Get subscription details from Stripe
        stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id)
      } catch (stripeError) {
        console.error('Error fetching Stripe subscription:', stripeError)
      }
    }

    // Get usage data (you'll need to implement this based on your data structure)
    const { data: callLogs } = await supabase
      .from('call_logs')
      .select('id')
      .eq('user_id', user.id)
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())

    const { data: intents } = await supabase
      .from('intents')
      .select('id')
      .eq('user_id', user.id)

    const subscriptionData = {
      id: subscription.id,
      status: subscription.status || 'inactive',
      plan_name: subscription.plan_name || 'No Plan',
      current_period_end: stripeSubscription?.current_period_end 
        ? new Date(stripeSubscription.current_period_end * 1000).toISOString()
        : new Date(0).toISOString(), // This was causing the 1970 date
      cancel_at_period_end: stripeSubscription?.cancel_at_period_end || false,
      stripe_customer_id: subscription.stripe_customer_id,
      stripe_subscription_id: subscription.stripe_subscription_id
    }

    const usage = {
      calls_count: callLogs?.length || 0,
      intents_count: intents?.length || 0
    }

    return NextResponse.json({
      subscription: subscriptionData,
      usage
    })
  } catch (error) {
    console.error('Subscription status error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subscription status' },
      { status: 500 }
    )
  }
}