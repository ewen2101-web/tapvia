import { supabase } from '../../lib/supabase'
import crypto from 'crypto'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { redirect_id, email } = req.body
  if (!redirect_id || !email) return res.status(400).json({ error: 'Champs manquants' })

  // Génère un token unique
  const token = crypto.randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 jours

  // Vérifie si l'utilisateur existe déjà
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single()

  if (existing) {
    // Met à jour le token si déjà existant
    await supabase.from('users').update({
      invite_token: token,
      invite_expires_at: expires.toISOString(),
      invite_accepted: false,
    }).eq('email', email)
  } else {
    // Crée le compte client
    await supabase.from('users').insert({
      redirect_id,
      email,
      invite_token: token,
      invite_expires_at: expires.toISOString(),
    })
  }

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/setup?token=${token}`

  return res.status(200).json({ invite_url: inviteUrl, token })
}
