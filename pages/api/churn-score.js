import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { data: clients } = await supabase
    .from('redirects')
    .select('id, last_scan_at, plan')

  if (!clients) return res.status(200).json({ updated: 0 })

  for (const client of clients) {
    let score = 0
    if (client.last_scan_at) {
      const daysSince = Math.floor((Date.now() - new Date(client.last_scan_at)) / 86400000)
      if (daysSince > 14) score += 40
      if (daysSince > 30) score += 30
    } else {
      score += 70
    }
    await supabase.from('redirects').update({ churn_risk: Math.min(score, 100) }).eq('id', client.id)
  }

  return res.status(200).json({ updated: clients.length })
}
