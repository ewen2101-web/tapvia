import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const PLAN_MRR = { Starter: 19, Business: 39, Pro: 69 }

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const { data: clients } = await supabase
    .from('redirects')
    .select('id, plan, active, created_at, client_name')

  if (!clients) return res.status(200).json({ mrr: 0, arr: 0, total: 0 })

  const active = clients.filter(c => c.active !== false)
  const mrr = active.reduce((acc, c) => acc + (PLAN_MRR[c.plan] || 0), 0)
  const arr = mrr * 12

  // Nouveaux clients ce mois
  const thisMonthStart = new Date()
  thisMonthStart.setDate(1)
  thisMonthStart.setHours(0, 0, 0, 0)
  const newThisMonth = clients.filter(c => new Date(c.created_at) >= thisMonthStart).length

  // MRR mois dernier (estimation basée sur clients actuels - nouveaux)
  const mrrLastMonth = (active.length - newThisMonth) * (mrr / (active.length || 1))

  // Répartition par plan
  const byPlan = {
    Starter: { count: active.filter(c => c.plan === 'Starter').length, mrr: active.filter(c => c.plan === 'Starter').length * 19 },
    Business: { count: active.filter(c => c.plan === 'Business').length, mrr: active.filter(c => c.plan === 'Business').length * 39 },
    Pro: { count: active.filter(c => c.plan === 'Pro').length, mrr: active.filter(c => c.plan === 'Pro').length * 69 },
  }

  // Churn (clients inactifs ce mois)
  const churned = clients.filter(c => c.active === false).length
  const churnRate = clients.length > 0 ? Math.round((churned / clients.length) * 100) : 0

  // LTV estimée
  const ltv = churnRate > 0 ? Math.round(mrr / (active.length || 1) / (churnRate / 100)) : 0

  return res.status(200).json({
    mrr,
    arr,
    mrrLastMonth: Math.round(mrrLastMonth),
    mrrGrowth: mrrLastMonth > 0 ? Math.round(((mrr - mrrLastMonth) / mrrLastMonth) * 100) : 0,
    total: active.length,
    newThisMonth,
    churned,
    churnRate,
    ltv,
    byPlan,
  })
}
