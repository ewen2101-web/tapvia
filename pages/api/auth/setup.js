import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + process.env.PASSWORD_SALT).digest('hex')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { token, password } = req.body

  if (!token || !password) return res.status(400).json({ error: 'Champs manquants' })
  if (password.length < 8) return res.status(400).json({ error: 'Minimum 8 caractères.' })

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('invite_token', token)
    .single()

  if (error || !user) return res.status(400).json({ error: 'Lien invalide ou expiré.' })
  if (new Date(user.invite_expires_at) < new Date()) return res.status(400).json({ error: 'Ce lien a expiré.' })

  const hash = hashPassword(password)
  await supabase.from('users').update({
    password_hash: hash,
    invite_accepted: true,
    invite_token: null,
  }).eq('id', user.id)

  return res.status(200).json({ success: true, redirect_id: user.redirect_id, user_id: user.id })
}
