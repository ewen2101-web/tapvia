import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const { redirect_id } = req.query
  if (!redirect_id) return res.status(400).json({ error: 'redirect_id requis' })

  // Récupère le place_id du client
  const { data: client, error } = await supabase
    .from('redirects')
    .select('google_place_id, client_name')
    .eq('id', redirect_id)
    .single()

  if (error || !client) return res.status(404).json({ error: 'Client introuvable' })
  if (!client.google_place_id) return res.status(400).json({ error: 'Place ID Google non configuré' })

  try {
    // Appel Google Places API — détails + avis
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${client.google_place_id}&fields=name,rating,user_ratings_total,reviews&language=fr&key=${GOOGLE_API_KEY}`
    const response = await fetch(url)
    const data = await response.json()

    if (data.status !== 'OK') {
      return res.status(400).json({ error: `Google API error: ${data.status}` })
    }

    const place = data.result
    const reviews = (place.reviews || []).map(r => ({
      author: r.author_name,
      rating: r.rating,
      text: r.text,
      time: r.time,
      relative_time: r.relative_time_description,
      profile_photo: r.profile_photo_url,
    }))

    // Met à jour avg_rating et total_reviews dans Supabase
    await supabase
      .from('redirects')
      .update({
        avg_rating: place.rating || 0,
        total_reviews: place.user_ratings_total || 0,
      })
      .eq('id', redirect_id)

    return res.status(200).json({
      name: place.name,
      rating: place.rating || 0,
      total_reviews: place.user_ratings_total || 0,
      reviews,
    })

  } catch (err) {
    console.error('Google Places error:', err)
    return res.status(500).json({ error: err.message })
  }
}
