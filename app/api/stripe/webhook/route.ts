import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabase } from '@/lib/supabase'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        if (!session.subscription) {
          console.error('No subscription ID in session')
          break
        }

        // Get subscription details with explicit typing
        const subscriptionResponse = await stripe.subscriptions.retrieve(
          session.subscription as string
        )
        
        // Extract the data from the response safely
        const subscription = subscriptionResponse as any

        // Get the subscription from database to get the ID
        const { data: existingSubscription } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('stripe_customer_id', session.customer as string)
          .single()

        // Update database
        await supabase
          .from('subscriptions')
          .update({
            stripe_subscription_id: subscription.id,
            stripe_price_id: subscription.items?.data?.[0]?.price?.id || null,
            plan_name: session.metadata?.planName,
            status: subscription.status,
            current_period_start: subscription.current_period_start 
              ? new Date(subscription.current_period_start * 1000).toISOString()
              : null,
            current_period_end: subscription.current_period_end 
              ? new Date(subscription.current_period_end * 1000).toISOString()
              : null,
            updated_at: new Date().toISOString()
          })
          .eq('stripe_customer_id', session.customer as string)

        // Initialize usage tracking
        if (existingSubscription?.id && subscription.current_period_start && subscription.current_period_end) {
          await supabase
            .from('usage_tracking')
            .insert({
              user_id: session.metadata?.userId,
              subscription_id: existingSubscription.id,
              period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              period_end: new Date(subscription.current_period_end * 1000).toISOString()
            })
        }

        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as any
        
        await supabase
          .from('subscriptions')
          .update({
            status: subscription.status,
            stripe_price_id: subscription.items?.data?.[0]?.price?.id || null,
            current_period_start: subscription.current_period_start 
              ? new Date(subscription.current_period_start * 1000).toISOString()
              : null,
            current_period_end: subscription.current_period_end 
              ? new Date(subscription.current_period_end * 1000).toISOString()
              : null,
            cancel_at_period_end: subscription.cancel_at_period_end || false,
            updated_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', subscription.id)

        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any
        
        await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            updated_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', subscription.id)

        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as any
        
        if (!invoice.subscription) {
          console.log('Invoice without subscription, skipping')
          break
        }

        // Get user_id from subscription
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('user_id, id')
          .eq('stripe_subscription_id', invoice.subscription)
          .single()

        if (subscription && invoice.payment_intent) {
          // Record payment
          await supabase
            .from('payments')
            .insert({
              user_id: subscription.user_id,
              subscription_id: subscription.id,
              stripe_payment_intent_id: invoice.payment_intent,
              amount: invoice.amount_paid || 0,
              currency: invoice.currency || 'usd',
              status: 'succeeded'
            })
        }

        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any
        
        if (!invoice.subscription) {
          console.log('Invoice without subscription, skipping')
          break
        }

        // Get user_id from subscription
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('user_id, id')
          .eq('stripe_subscription_id', invoice.subscription)
          .single()

        if (subscription && invoice.payment_intent) {
          // Record failed payment
          await supabase
            .from('payments')
            .insert({
              user_id: subscription.user_id,
              subscription_id: subscription.id,
              stripe_payment_intent_id: invoice.payment_intent,
              amount: invoice.amount_due || 0,
              currency: invoice.currency || 'usd',
              status: 'failed'
            })
        }

        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}