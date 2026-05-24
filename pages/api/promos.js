import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {

  // Récupérer toutes les promos
  if (req.method === 'GET') {
    const { redirect_id } = req.query
    let query = supabase.from('promos').select('*').order('created_at', { ascending: false })
    if (redirect_id) query = query.eq('redirect_id', redirect_id)
    const { data, error } = await query
    if (error) return res.status(400).json({ error: error.message })
    return res.status(200).json(data || [])
  }

  // Créer une promo
  if (req.method === 'POST') {
    const { redirect_id, client_name, type, value, amount_off, expires_in_days } = req.body

    if (!redirect_id || !type) return res.status(400).json({ error: 'Champs manquants' })

    const expires_at = expires_in_days
      ? new Date(Date.now() + expires_in_days * 24 * 60 * 60 * 1000).toISOString()
      : null

    // Cas 1 : Période d'essai gratuite
    if (type === 'trial') {
      const trial_ends_at = new Date(Date.now() + value * 24 * 60 * 60 * 1000).toISOString()

      // Met à jour le client avec la date de fin d'essai
      await supabase.from('redirects').update({
        trial_ends_at,
        promo_active: true,
      }).eq('id', redirect_id)

      // Enregistre la promo
      const { data, error } = await supabase.from('promos').insert({
        redirect_id,
        client_name,
        type: 'trial',
        value, // nombre de jours
        status: 'active',
        expires_at: trial_ends_at,
      }).select().single()

      if (error) return res.status(400).json({ error: error.message })
      return res.status(200).json({ ...data, trial_ends_at })
    }

    // Cas 2 : Réduction Stripe (% ou montant fixe)
    if (type === 'discount') {
      try {
        // Génère un code promo lisible
        const code = `TAPVIA${Math.random().toString(36).substring(2, 7).toUpperCase()}`

        // Crée le coupon dans Stripe
        const couponData = {
          duration: 'once', // une seule fois
          name: `Promo ${client_name}`,
        }

        if (value) couponData.percent_off = value // ex: 50 = 50%
        if (amount_off) couponData.amount_off = amount_off * 100 // en centimes
        if (amount_off) couponData.currency = 'eur'

        const coupon = await stripe.coupons.create(couponData)

        // Crée le code promo dans Stripe
        const promotionCode = await stripe.promotionCodes.create({
          coupon: coupon.id,
          code,
          max_redemptions: 1, // utilisable une seule fois
        })

        // Enregistre dans Supabase
        const { data, error } = await supabase.from('promos').insert({
          redirect_id,
          client_name,
          type: 'discount',
          value: value || null,
          amount_off: amount_off || null,
          stripe_coupon_id: coupon.id,
          stripe_promotion_code: promotionCode.id,
          code,
          status: 'active',
          expires_at,
        }).select().single()

        if (error) return res.status(400).json({ error: error.message })
        return res.status(200).json({ ...data, code })

      } catch (err) {
        console.error('Stripe promo error:', err)
        return res.status(500).json({ error: err.message })
      }
    }

    return res.status(400).json({ error: 'Type de promo invalide' })
  }

  // Désactiver une promo
  if (req.method === 'PUT') {
    const { id, status } = req.body
    const { data, error } = await supabase
      .from('promos')
      .update({ status })
      .eq('id', id)
      .select()
      .single()
    if (error) return res.status(400).json({ error: error.message })
    return res.status(200).json(data)
  }

  // Supprimer une promo
  if (req.method === 'DELETE') {
    const { id } = req.body
    await supabase.from('promos').delete().eq('id', id)
    return res.status(200).json({ success: true })
  }

  return res.status(405).end()
}
