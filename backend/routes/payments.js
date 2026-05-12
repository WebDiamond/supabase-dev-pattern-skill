// src/routes/payments.js
// ⚠️  Registrare PRIMA di express.json() in app.js (il webhook usa raw body)
import express     from 'express'
import { requireAuth }            from '../middleware/auth.js'
import { createCheckoutSession, createPaymentIntent,
         createPortalSession, getActiveSubscription,
         constructWebhookEvent }  from '../services/stripeService.js'
import supabase from '../lib/supabase.js'
import logger   from '../lib/logger.js'

const router = express.Router()

/** POST /payments/checkout — Stripe Hosted Checkout */
router.post('/checkout', requireAuth, async (req, res) => {
  const { priceId, mode = 'payment' } = req.body
  if (!priceId) return res.status(400).json({ error: 'priceId obbligatorio' })

  try {
    const result = await createCheckoutSession({
      userId:     req.user.id,
      email:      req.user.email,
      priceId,
      mode,
      successUrl: `${process.env.CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl:  `${process.env.CLIENT_URL}/payment/cancel`,
    })
    res.json(result)
  } catch (err) {
    logger.error('Checkout error', { error: err.message, userId: req.user.id })
    res.status(500).json({ error: 'Errore sessione di pagamento' })
  }
})

/** POST /payments/intent — PaymentIntent per Stripe Elements */
router.post('/intent', requireAuth, async (req, res) => {
  const { amount, currency = 'eur', metadata = {} } = req.body
  if (!amount || amount < 50)
    return res.status(400).json({ error: 'Importo non valido (min 50 centesimi)' })

  try {
    const result = await createPaymentIntent({
      userId: req.user.id, email: req.user.email,
      amount, currency, metadata,
    })
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: 'Errore PaymentIntent' })
  }
})

/** POST /payments/portal — portale gestione abbonamento */
router.post('/portal', requireAuth, async (req, res) => {
  try {
    const url = await createPortalSession(
      req.user.id,
      `${process.env.CLIENT_URL}/settings`
    )
    res.json({ url })
  } catch (err) {
    res.status(500).json({ error: 'Errore portale abbonamento' })
  }
})

/** GET /payments/subscription — abbonamento attivo */
router.get('/subscription', requireAuth, async (req, res) => {
  try {
    const sub = await getActiveSubscription(req.user.id)
    res.json({ subscription: sub ?? null })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/** GET /payments/orders — storico ordini */
router.get('/orders', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('orders')
    .select('id, amount, currency, status, created_at, metadata')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ orders: data })
})

/**
 * POST /payments/webhook — eventi Stripe
 * DEVE usare raw body — registrata prima di express.json() in app.js
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['stripe-signature']
  let event

  try {
    event = constructWebhookEvent(req.body, signature)
  } catch (err) {
    logger.error('Webhook signature failed', { error: err.message })
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  logger.info('Stripe event', { type: event.type })

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object
        await supabase.from('orders')
          .update({ status: 'paid', amount: s.amount_total })
          .eq('stripe_session_id', s.id)
        break
      }
      case 'payment_intent.succeeded': {
        const i = event.data.object
        await supabase.from('orders').update({ status: 'paid' })
          .eq('stripe_payment_intent', i.id)
        break
      }
      case 'payment_intent.payment_failed': {
        const i = event.data.object
        await supabase.from('orders').update({ status: 'failed' })
          .eq('stripe_payment_intent', i.id)
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const s = event.data.object
        await supabase.from('subscriptions').upsert({
          stripe_subscription_id: s.id,
          stripe_price_id:        s.items.data[0].price.id,
          status:                 s.status,
          current_period_start:   new Date(s.current_period_start * 1000).toISOString(),
          current_period_end:     new Date(s.current_period_end   * 1000).toISOString(),
          cancel_at_period_end:   s.cancel_at_period_end,
        }, { onConflict: 'stripe_subscription_id' })
        break
      }
      case 'customer.subscription.deleted': {
        const s = event.data.object
        await supabase.from('subscriptions').update({ status: 'canceled' })
          .eq('stripe_subscription_id', s.id)
        break
      }
    }
  } catch (err) {
    logger.error('Webhook handler error', { type: event.type, error: err.message })
    return res.status(500).json({ error: 'Errore gestione evento' })
  }

  res.json({ received: true })
})

export default router
