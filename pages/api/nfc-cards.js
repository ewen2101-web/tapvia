import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { redirect_id } = req.query
    const { data } = await supabase.from('nfc_cards').select('*').eq('redirect_id', redirect_id)
    return res.status(200).json(data || [])
  }

  if (req.method === 'POST') {
    const { redirect_id, name, slug, destination } = req.body
    const { data } = await supabase.from('nfc_cards').insert({ redirect_id, name, slug, destination }).select().single()
    return res.status(200).json(data)
  }

  if (req.method === 'PUT') {
    const { id, name, destination, is_active } = req.body
    const { data } = await supabase.from('nfc_cards').update({ name, destination, is_active }).eq('id', id).select().single()
    return res.status(200).json(data)
  }

  if (req.method === 'DELETE') {
    const { id } = req.body
    await supabase.from('nfc_cards').delete().eq('id', id)
    return res.status(200).json({ success: true })
  }

  return res.status(405).end()
}
