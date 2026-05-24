import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const { days = 14 } = req.query
  const threshold = new Date()
  threshold.setDate(threshold.getDate() - parseInt(days))

  // Récupère tous les clients
  const { data: clients } = await supabase
    .from('redirects')
    .select('id, client_name, client_email, plan, last_scan_at, created_at')
    .eq('active', true)

  if (!clients) return res.status(200).json([])

  // Pour chaque client, vérifie le dernier scan
  const inactive = []
  for (const client of clients) {
    // Dernier scan depuis la table scans
    const { data: lastScan } = await supabase
      .from('scans')
      .select('scanned_at')
      .eq('redirect_id', client.id)
      .order('scanned_at', { ascending: false })
      .limit(1)
      .single()

    const lastScanDate = lastScan?.scanned_at ? new Date(lastScan.scanned_at) : null
    const daysSinceLastScan = lastScanDate
      ? Math.floor((Date.now() - lastScanDate.getTime()) / 86400000)
      : null

    const isInactive = !lastScanDate || lastScanDate < threshold
    const neverScanned = !lastScanDate

    if (isInactive) {
      inactive.push({
        ...client,
        last_scan_at: lastScanDate?.toISOString() || null,
        days_inactive: neverScanned ? null : daysSinceLastScan,
        never_scanned: neverScanned,
        urgency: neverScanned ? 'critical' : daysSinceLastScan > 30 ? 'high' : 'medium',
      })
    }
  }

  // Trie par urgence
  inactive.sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2 }
    return order[a.urgency] - order[b.urgency]
  })

  return res.status(200).json(inactive)
}
