import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  const { redirect_id, days = 30 } = req.query
  if (!redirect_id) return res.status(400).json({ error: 'redirect_id requis' })

  // Période sélectionnée
  const since = new Date()
  since.setDate(since.getDate() - parseInt(days))

  // Période précédente (pour comparaison)
  const prevSince = new Date(since)
  prevSince.setDate(prevSince.getDate() - parseInt(days))

  // Scans de la période
  const { data: scans } = await supabase
    .from('scans')
    .select('scanned_at')
    .eq('redirect_id', redirect_id)
    .gte('scanned_at', since.toISOString())
    .order('scanned_at', { ascending: true })

  // Scans période précédente
  const { data: prevScans } = await supabase
    .from('scans')
    .select('scanned_at')
    .eq('redirect_id', redirect_id)
    .gte('scanned_at', prevSince.toISOString())
    .lt('scanned_at', since.toISOString())

  // Infos client
  const { data: client } = await supabase
    .from('redirects')
    .select('*')
    .eq('id', redirect_id)
    .single()

  // Nouveaux avis CE MOIS (depuis le 1er du mois)
  const thisMonthStart = new Date()
  thisMonthStart.setDate(1)
  thisMonthStart.setHours(0, 0, 0, 0)

  const { data: ratingHistory } = await supabase
    .from('rating_history')
    .select('total_reviews, recorded_at')
    .eq('redirect_id', redirect_id)
    .order('recorded_at', { ascending: true })

  // Calcul des nouveaux avis ce mois
  let newReviewsThisMonth = 0
  if (ratingHistory && ratingHistory.length >= 2) {
    const lastMonth = ratingHistory.filter(r => new Date(r.recorded_at) < thisMonthStart)
    const lastMonthReviews = lastMonth.length > 0 ? lastMonth[lastMonth.length - 1].total_reviews : 0
    const currentReviews = client?.total_reviews || 0
    newReviewsThisMonth = Math.max(currentReviews - lastMonthReviews, 0)
  }

  const totalScans = scans?.length || 0
  const prevTotal = prevScans?.length || 0
  const delta = prevTotal > 0 ? Math.round(((totalScans - prevTotal) / prevTotal) * 100) : 0

  // Scans par jour pour le graphique
  const scansByDay = {}
  scans?.forEach(s => {
    const day = s.scanned_at.split('T')[0]
    scansByDay[day] = (scansByDay[day] || 0) + 1
  })

  // Taux de conversion = scans cette période → nouveaux avis cette période
  const conversionRate = totalScans > 0 && newReviewsThisMonth > 0
    ? Math.round((newReviewsThisMonth / totalScans) * 100)
    : 0

  return res.status(200).json({
    client,
    totalScans,
    prevTotal,
    delta,
    scansByDay,
    avgRating: client?.avg_rating || 0,
    totalReviews: client?.total_reviews || 0,       // total pour affichage
    newReviewsThisMonth,                             // nouveaux ce mois pour objectif
    conversionRate,                                  // taux réel
  })
}
