import { supabase } from '../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const { redirect_id } = req.query

  const { data: client } = await supabase.from('redirects').select('*').eq('id', redirect_id).single()
  const { data: scans } = await supabase.from('scans').select('scanned_at').eq('redirect_id', redirect_id)

  const totalScans = scans?.length || 0
  const month = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; color: #111; padding: 40px; }
        .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
        .logo { font-size: 24px; font-weight: 900; color: #7C6AF7; }
        .title { font-size: 20px; font-weight: 700; margin-bottom: 8px; }
        .sub { color: #666; font-size: 14px; }
        .metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 30px 0; }
        .metric { background: #f5f5f5; border-radius: 8px; padding: 20px; }
        .metric-value { font-size: 32px; font-weight: 900; color: #7C6AF7; }
        .metric-label { font-size: 12px; color: #666; margin-top: 4px; }
        .footer { margin-top: 60px; border-top: 1px solid #eee; padding-top: 20px; font-size: 12px; color: #999; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">tapvia</div>
        <div style="text-align:right">
          <div class="title">Rapport mensuel</div>
          <div class="sub">${month}</div>
        </div>
      </div>

      <div class="title">${client.client_name}</div>
      <div class="sub">Plan ${client.plan} · Rapport généré le ${new Date().toLocaleDateString('fr-FR')}</div>

      <div class="metrics">
        <div class="metric">
          <div class="metric-value">${totalScans}</div>
          <div class="metric-label">Scans NFC ce mois</div>
        </div>
        <div class="metric">
          <div class="metric-value">${client.avg_rating || '—'}★</div>
          <div class="metric-label">Note moyenne Google</div>
        </div>
        <div class="metric">
          <div class="metric-value">${client.total_reviews || 0}</div>
          <div class="metric-label">Avis Google total</div>
        </div>
      </div>

      <div class="footer">
        Rapport généré automatiquement par Tapvia · tapvia.vercel.app
      </div>
    </body>
    </html>
  `

  res.setHeader('Content-Type', 'text/html')
  return res.status(200).send(html)
}
