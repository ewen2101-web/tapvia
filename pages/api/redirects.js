// Dans le GET, remplace la query existante par :
if (req.method === 'GET') {
  const thisMonthStart = new Date()
  thisMonthStart.setDate(1)
  thisMonthStart.setHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from('redirects')
    .select('*, scans(count)')
    .order('created_at', { ascending: false })

  if (error) return res.status(400).json({ error: error.message })

  // ✅ Compter les scans du mois séparément
  const { data: monthScans } = await supabase
    .from('scans')
    .select('redirect_id')
    .gte('scanned_at', thisMonthStart.toISOString())

  const monthCountMap = (monthScans || []).reduce((acc, s) => {
    acc[s.redirect_id] = (acc[s.redirect_id] || 0) + 1
    return acc
  }, {})

  const enriched = data.map(c => ({
    ...c,
    scans_this_month: monthCountMap[c.id] || 0,
  }))

  return res.status(200).json(enriched)
}
