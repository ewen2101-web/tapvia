import { supabase } from '../../../lib/supabase'
import crypto from 'crypto'

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + process.env.PASSWORD_SALT).digest('hex')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { token, password } = req.body

  // Vérifie le token
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('invite_token', token)
    .single()

  if (error || !user) return res.status(400).json({ error: 'Lien invalide ou expiré.' })
  if (new Date(user.invite_expires_at) < new Date()) return res.status(400).json({ error: 'Ce lien a expiré.' })

  // Hash le mot de passe et active le compte
  const hash = hashPassword(password)
  await supabase.from('users').update({
    password_hash: hash,
    invite_accepted: true,
    invite_token: null,
  }).eq('id', user.id)

  // Crée une session simple (cookie ou localStorage)
  return res.status(200).json({ success: true, redirect_id: user.redirect_id })
}
