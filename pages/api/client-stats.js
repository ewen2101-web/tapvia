import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  const { redirect_id, days = 30 } = req.query
  if (!redirect_id) return res.status(400).json({ error: 'redirect_id requis' })

  const since = new Date()
  since.setDate(since.getDate() - parseInt(days))

  const { data: scans } = await supabase
    .from('scans')
    .select('scanned_at')
    .eq('redirect_id', redirect_id)
    .gte('scanned_at', since.toISOString())
    .order('scanned_at', { ascending: true })

  const prevSince = new Date(since)
  prevSince.setDate(prevSince.getDate() - parseInt(days))
  const { data: prevScans } = await supabase
    .from('scans')
    .select('scanned_at')
    .eq('redirect_id', redirect_id)
    .gte('scanned_at', prevSince.toISOString())
    .lt('scanned_at', since.toISOString())

  const { data: client } = await supabase
    .from('redirects')
    .select('*')
    .eq('id', redirect_id)
    .single()

  const totalScans = scans?.length || 0
  const prevTotal = prevScans?.length || 0
  const delta = prevTotal > 0 ? Math.round(((totalScans - prevTotal) / prevTotal) * 100) : 0

  const scansByDay = {}
  scans?.forEach(s => {
    const day = s.scanned_at.split('T')[0]
    scansByDay[day] = (scansByDay[day] || 0) + 1
  })

  return res.status(200).json({
    client,
    totalScans,
    prevTotal,
    delta,
    scansByDay,
    avgRating: client?.avg_rating || 0,
    totalReviews: client?.total_reviews || 0,
  })
}
