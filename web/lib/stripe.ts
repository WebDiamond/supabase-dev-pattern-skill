// src/lib/stripe.ts
import { loadStripe } from '@stripe/stripe-js'

// Singleton — Stripe viene caricato una sola volta
export const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
