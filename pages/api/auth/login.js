import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

import crypto from 'crypto'

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + process.env.PASSWORD_SALT).digest('hex')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { email, password } = req.body

  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .eq('is_active', true)
    .single()

  if (!user) return res.status(401).json({ error: 'Email ou mot de passe incorrect.' })

  const hash = hashPassword(password)
  if (hash !== user.password_hash) return res.status(401).json({ error: 'Email ou mot de passe incorrect.' })

  // Met à jour last_login
  await supabase.from('users').update({ last_login: new Date().toISOString() }).eq('id', user.id)

  return res.status(200).json({ success: true, redirect_id: user.redirect_id, user_id: user.id })
}
