import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { redirect_id, email } = req.body
  if (!redirect_id || !email) return res.status(400).json({ error: 'Champs manquants' })

  const token = crypto.randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single()

  if (existing) {
    await supabase.from('users').update({
      invite_token: token,
      invite_expires_at: expires.toISOString(),
      invite_accepted: false,
    }).eq('email', email)
  } else {
    await supabase.from('users').insert({
      redirect_id,
      email,
      invite_token: token,
      invite_expires_at: expires.toISOString(),
    })
  }

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/setup?token=${token}`
  return res.status(200).json({ invite_url: inviteUrl })
}
