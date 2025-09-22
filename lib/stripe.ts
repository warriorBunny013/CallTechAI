import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
  typescript: true,
})

export const getStripeJs = async () => {
  const { loadStripe } = await import('@stripe/stripe-js')
  return loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
}

// Pricing configuration
export const PLANS = {
  basic: {
    name: 'Basic',
    priceId: process.env.STRIPE_BASIC_PRICE_ID!,
    price: 99,
    features: {
      callsPerMonth: 100,
      languages: ['English'],
      customIntents: 3,
      support: 'Email support',
      integrations: []
    }
  },
  pro: {
    name: 'Pro',
    priceId: process.env.STRIPE_PRO_PRICE_ID!,
    price: 199,
    features: {
      callsPerMonth: 500,
      languages: ['English', 'Russian'],
      customIntents: 10,
      support: 'Priority email support',
      integrations: ['CRM']
    }
  },
  ultimate: {
    name: 'Ultimate',
    priceId: process.env.STRIPE_ULTIMATE_PRICE_ID!,
    price: 299,
    features: {
      callsPerMonth: -1, // Unlimited
      languages: ['All'],
      customIntents: -1, // Unlimited
      support: '24/7 phone support',
      integrations: ['All'],
      customVoice: true
    }
  }
}