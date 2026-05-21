import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const PRICE_IDS = {
  Starter:  'price_1TZGupHIjP9Yl8eI3nR5PvLx',
  Business: 'price_1TZGvQHIjP9Yl8eIB10ZyB7k',
  Pro:      'price_1TZGvrHIjP9Yl8eI6FJSj25s',
}

export default async function handler(req, res) {

  // Créer un lien de paiement Stripe pour un client
  if (req.method === 'POST') {
    const { client_name, client_email, plan } = req.body

    if (!client_email || !plan) {
      return res.status(400).json({ error: 'Email et plan requis' })
    }

    const priceId = PRICE_IDS[plan]
    if (!priceId) {
      return res.status(400).json({ error: 'Plan invalide' })
    }

    try {
      // Crée une session de paiement Stripe Checkout
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        customer_email: client_email,
        metadata: { client_name, plan },
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}`,
        locale: 'fr',
      })

      return res.status(200).json({ url: session.url, session_id: session.id })

    } catch (err) {
      console.error('Stripe error:', err)
      return res.status(500).json({ error: err.message })
    }
  }

  return res.status(405).json({ error: 'Méthode non autorisée' })
}
