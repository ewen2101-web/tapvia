import { supabase } from '../../../lib/supabase'
import crypto from 'crypto'

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + process.env.PASSWORD_SALT).digest('hex')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { email, password } = req.body

  if (!email || !password) return res.status(400).json({ error: 'Champs manquants' })

  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .eq('is_active', true)
    .single()

  if (!user) return res.status(401).json({ error: 'Email ou mot de passe incorrect.' })
  if (!user.invite_accepted) return res.status(401).json({ error: 'Compte non activé. Vérifie ton email.' })

  const hash = hashPassword(password)
  if (hash !== user.password_hash) return res.status(401).json({ error: 'Email ou mot de passe incorrect.' })

  // Met à jour la dernière connexion
  await supabase.from('users').update({
    last_login: new Date().toISOString()
  }).eq('id', user.id)

  return res.status(200).json({
    success: true,
    redirect_id: user.redirect_id,
    user_id: user.id,
    email: user.email
  })
}
