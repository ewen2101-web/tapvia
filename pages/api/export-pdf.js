import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const { redirect_id } = req.query
  if (!redirect_id) return res.status(400).json({ error: 'redirect_id requis' })

  const { data: client } = await supabase
    .from('redirects')
    .select('*')
    .eq('id', redirect_id)
    .single()

  const since = new Date()
  since.setDate(since.getDate() - 30)
  const { data: scans } = await supabase
    .from('scans')
    .select('scanned_at')
    .eq('redirect_id', redirect_id)
    .gte('scanned_at', since.toISOString())

  const totalScans = scans?.length || 0
  const conversionRate = totalScans > 0 && client?.total_reviews
    ? Math.round((client.total_reviews / totalScans) * 100)
    : 0
  const estimatedViews = totalScans * 8
  const month = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  const generatedDate = new Date().toLocaleDateString('fr-FR')

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; color: #111; background: #fff; padding: 48px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 48px; padding-bottom: 24px; border-bottom: 2px solid #7C6AF7; }
    .logo { font-size: 28px; font-weight: 900; color: #7C6AF7; letter-spacing: -1px; }
    .header-right { text-align: right; }
    .report-title { font-size: 14px; color: #666; }
    .report-month { font-size: 20px; font-weight: 700; color: #111; margin-top: 4px; }
    .client-section { margin-bottom: 40px; }
    .client-name { font-size: 24px; font-weight: 800; color: #111; }
    .client-meta { font-size: 13px; color: #666; margin-top: 6px; }
    .plan-badge { display: inline-block; background: #7C6AF720; color: #7C6AF7; border: 1px solid #7C6AF740; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; margin-top: 8px; }
    .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 40px; }
    .metric { background: #f8f7ff; border: 1px solid #e8e4ff; border-radius: 10px; padding: 20px; }
    .metric-value { font-size: 32px; font-weight: 900; color: #7C6AF7; letter-spacing: -1px; }
    .metric-label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 6px; }
    .section-title { font-size: 14px; font-weight: 700; color: #111; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.5px; border-left: 3px solid #7C6AF7; padding-left: 10px; }
    .reviews-section { margin-bottom: 40px; }
    .review { background: #fafafa; border: 1px solid #eee; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
    .review-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .review-author { font-weight: 700; font-size: 13px; }
    .review-stars { color: #F0A050; font-size: 14px; }
    .review-date { font-size: 11px; color: #999; }
    .review-text { font-size: 12px; color: #555; line-height: 1.6; }
    .negative-review { border-left: 3px solid #F05252; background: #fff5f5; }
    .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #eee; display: flex; justify-content: space-between; font-size: 11px; color: #999; }
    .stats-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 40px; }
    .stat-card { background: #f8f7ff; border-radius: 10px; padding: 20px; }
    .stat-card-title { font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
    .progress-bar { height: 8px; background: #e8e4ff; border-radius: 4px; overflow: hidden; margin-top: 8px; }
    .progress-fill { height: 100%; background: #7C6AF7; border-radius: 4px; }
  </style>
</head>
<body>

  <div class="header">
    <div class="logo">tapvia</div>
    <div class="header-right">
      <div class="report-title">Rapport mensuel</div>
      <div class="report-month">${month}</div>
      <div style="font-size:11px;color:#999;margin-top:4px">Généré le ${generatedDate}</div>
    </div>
  </div>

  <div class="client-section">
    <div class="client-name">${client?.client_name || 'Client'}</div>
    <div class="client-meta">Dashboard Google Reviews NFC</div>
    <div class="plan-badge">Plan ${client?.plan || 'Starter'}</div>
  </div>

  <div class="metrics">
    <div class="metric">
      <div class="metric-value">${totalScans}</div>
      <div class="metric-label">Scans NFC ce mois</div>
    </div>
    <div class="metric">
      <div class="metric-value">${client?.avg_rating || '—'}${client?.avg_rating ? '★' : ''}</div>
      <div class="metric-label">Note Google moyenne</div>
    </div>
    <div class="metric">
      <div class="metric-value">${client?.total_reviews || 0}</div>
      <div class="metric-label">Avis Google total</div>
    </div>
    <div class="metric">
      <div class="metric-value">+${estimatedViews.toLocaleString('fr')}</div>
      <div class="metric-label">Vues estimées</div>
    </div>
  </div>

  <div class="stats-row">
    <div class="stat-card">
      <div class="stat-card-title">Taux de conversion</div>
      <div style="font-size:28px;font-weight:900;color:#5EE8B0">${conversionRate}%</div>
      <div style="font-size:11px;color:#888;margin-top:4px">${totalScans} scans → ${client?.total_reviews || 0} avis</div>
      <div class="progress-bar"><div class="progress-fill" style="width:${conversionRate}%;background:#5EE8B0"></div></div>
    </div>
    <div class="stat-card">
      <div class="stat-card-title">Visibilité Google estimée</div>
      <div style="font-size:18px;font-weight:700;color:#7C6AF7;margin-bottom:6px">+${estimatedViews.toLocaleString('fr')} vues</div>
      <div style="font-size:12px;color:#888">+${Math.round(estimatedViews * 0.3).toLocaleString('fr')} recherches Google Maps</div>
    </div>
  </div>

  <div class="footer">
    <span>Rapport généré automatiquement par <strong>tapvia</strong></span>
    <span>tapvia.vercel.app</span>
  </div>

</body>
</html>`

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Content-Disposition', `inline; filename="rapport-${client?.client_name?.toLowerCase().replace(/\s/g, '-')}-${month}.html"`)
  return res.status(200).send(html)
}
