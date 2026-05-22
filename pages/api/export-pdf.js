import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  const { redirect_id } = req.query

  const { data: client } = await supabase.from('redirects').select('*').eq('id', redirect_id).single()
  const { data: scans } = await supabase.from('scans').select('scanned_at').eq('redirect_id', redirect_id)

  const totalScans = scans?.length || 0
  const month = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    body{font-family:Arial,sans-serif;color:#111;padding:40px}
    .logo{font-size:24px;font-weight:900;color:#7C6AF7}
    .metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin:30px 0}
    .metric{background:#f5f5f5;border-radius:8px;padding:20px}
    .metric-value{font-size:32px;font-weight:900;color:#7C6AF7}
    .metric-label{font-size:12px;color:#666;margin-top:4px}
    .footer{margin-top:60px;border-top:1px solid #eee;padding-top:20px;font-size:12px;color:#999}
  </style></head><body>
    <div class="logo">tapvia</div>
    <h2>${client?.client_name || 'Client'} — Rapport ${month}</h2>
    <div class="metrics">
      <div class="metric"><div class="metric-value">${totalScans}</div><div class="metric-label">Scans NFC</div></div>
      <div class="metric"><div class="metric-value">${client?.avg_rating || '—'}★</div><div class="metric-label">Note Google</div></div>
      <div class="metric"><div class="metric-value">${client?.total_reviews || 0}</div><div class="metric-label">Avis total</div></div>
    </div>
    <div class="footer">Rapport généré par Tapvia · ${new Date().toLocaleDateString('fr-FR')}</div>
  </body></html>`

  res.setHeader('Content-Type', 'text/html')
  return res.status(200).send(html)
}
