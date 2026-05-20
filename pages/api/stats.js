import { supabase } from '../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Méthode non autorisée' })
  }

  const { redirect_id, days = 30 } = req.query

  const since = new Date()
  since.setDate(since.getDate() - parseInt(days))

  let query = supabase
    .from('scans')
    .select('scanned_at, redirect_id')
    .gte('scanned_at', since.toISOString())
    .order('scanned_at', { ascending: true })

  if (redirect_id) {
    query = query.eq('redirect_id', redirect_id)
  }

  const { data, error } = await query

  if (error) return res.status(400).json({ error: error.message })
  return res.status(200).json(data)
}
