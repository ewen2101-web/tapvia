  import Stripe from 'stripe'
  import { createClient } from '@supabase/supabase-js'

  // Initialiser le client Supabase
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
  )

  // Initialiser Stripe
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

  export default async function handler(req, res) {
    if (req.method === 'POST') {
      const { client_name, client_email, plan } = req.body

      // Validation des données requises
      if (!client_email || !plan) {
        return res.status(400).json({ error: 'Email et plan requis' })
      }

      try {
        // 🔑 NOUVEAU : Récupérer le price_id depuis la table plan_pricing
        const { data: pricingData, error: pricingError } = await supabase
          .from('plan_pricing')
          .select('price_id')
          .eq('plan', plan)
          .single()

        // Gestion des erreurs de récupération du prix
        if (pricingError || !pricingData) {
          return res.status(500).json({
            error: `Prix non configuré pour le plan: ${plan}. Vérifiez votre table plan_pricing dans Supabase.`
          })
        }

        const priceId = pricingData.price_id

        // Créer la session de checkout Stripe
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
