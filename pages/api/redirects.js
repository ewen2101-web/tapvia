import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { slug, destination, client_name, plan, client_email } = req.body
    if (!slug || !destination || !client_name) {
      return res.status(400).json({ error: 'Champs manquants' })
    }
    const { data, error } = await supabase
      .from('redirects')
      .insert({
        slug,
        destination,
        client_name,
        plan: plan || 'Starter',
        client_email: client_email || '',
        active: true
      })
      .select()
      .single()
    if (error) return res.status(400).json({ error: error.message })
    return res.status(200).json(data)
  }

  if (req.method === 'GET') {
    const thisMonthStart = new Date()
    thisMonthStart.setDate(1)
    thisMonthStart.setHours(0, 0, 0, 0)

    const { data, error } = await supabase
      .from('redirects')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) return res.status(400).json({ error: error.message })

    const { data: monthScans } = await supabase
      .from('scans')
      .select('redirect_id')
      .gte('scanned_at', thisMonthStart.toISOString())

    const monthCountMap = (monthScans || []).reduce((acc, s) => {
      acc[s.redirect_id] = (acc[s.redirect_id] || 0) + 1
      return acc
    }, {})

    const enriched = (data || []).map(c => ({
      ...c,
      scans: [{ count: monthCountMap[c.id] || 0 }],
    }))

    return res.status(200).json(enriched)
  }

  if (req.method === 'PUT') {
    const { id, destination, plan, active, client_email } = req.body
    const { data, error } = await supabase
      .from('redirects')
      .update({ destination, plan, active, client_email })
      .eq('id', id)
      .select()
      .single()
    if (error) return res.status(400).json({ error: error.message })
    return res.status(200).json(data)
  }

  if (req.method === 'DELETE') {
    const { id } = req.body
    const { error } = await supabase
      .from('redirects')
      .delete()
      .eq('id', id)
    if (error) return res.status(400).json({ error: error.message })
    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: 'Méthode non autorisée' })
}
