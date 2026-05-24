import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { redirect_id, rating, total_reviews } = req.body
    if (!redirect_id || !rating) return res.status(400).json({ error: 'Champs manquants' })

    const { data, error } = await supabase
      .from('rating_history')
      .insert({ redirect_id, rating, total_reviews: total_reviews || 0 })
      .select()
      .single()

    if (error) return res.status(400).json({ error: error.message })
    return res.status(200).json(data)
  }

  if (req.method === 'GET') {
    const { redirect_id } = req.query
    if (!redirect_id) return res.status(400).json({ error: 'redirect_id requis' })

    const { data, error } = await supabase
      .from('rating_history')
      .select('rating, total_reviews, recorded_at')
      .eq('redirect_id', redirect_id)
      .order('recorded_at', { ascending: true })

    if (error) return res.status(400).json({ error: error.message })

    const byMonth = {}
    data?.forEach(entry => {
      const month = entry.recorded_at.slice(0, 7)
      byMonth[month] = {
        rating: entry.rating,
        total_reviews: entry.total_reviews,
        month,
      }
    })

    return res.status(200).json(Object.values(byMonth))
  }

  return res.status(405).end()
}
