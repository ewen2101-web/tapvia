import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  const { redirect_id } = req.query
  if (!redirect_id) return res.status(400).json({ error: 'redirect_id requis' })

  // Infos client
  const { data: client } = await supabase
    .from('redirects')
    .select('*')
    .eq('id', redirect_id)
    .single()

  // Scans ce mois
  const since = new Date()
  since.setDate(1)
  const { data: scansThisMonth } = await supabase
    .from('scans')
    .select('scanned_at')
    .eq('redirect_id', redirect_id)
    .gte('scanned_at', since.toISOString())

  // Scans mois dernier
  const lastMonthStart = new Date()
  lastMonthStart.setMonth(lastMonthStart.getMonth() - 1)
  lastMonthStart.setDate(1)
  const lastMonthEnd = new Date()
  lastMonthEnd.setDate(0)
  const { data: scansLastMonth } = await supabase
    .from('scans')
    .select('scanned_at')
    .eq('redirect_id', redirect_id)
    .gte('scanned_at', lastMonthStart.toISOString())
    .lt('scanned_at', lastMonthEnd.toISOString())

  // Notes CRM
  const { data: notes } = await supabase
    .from('notes_crm')
    .select('*')
    .eq('redirect_id', redirect_id)
    .order('created_at', { ascending: false })

  // Utilisateur associé
  const { data: user } = await supabase
    .from('users')
    .select('email, last_login, invite_accepted, created_at')
    .eq('redirect_id', redirect_id)
    .single()

  const scansNow = scansThisMonth?.length || 0
  const scansPrev = scansLastMonth?.length || 0
  const scansDelta = scansPrev > 0 ? Math.round(((scansNow - scansPrev) / scansPrev) * 100) : 0

  return res.status(200).json({
    client,
    scansThisMonth: scansNow,
    scansLastMonth: scansPrev,
    scansDelta,
    notes: notes || [],
    user: user || null,
  })
}
