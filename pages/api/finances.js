import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  // Récupère les clients
  const { data: clients } = await supabase
    .from('redirects')
    .select('id, plan, active, created_at, client_name')

  // Récupère les vrais prix depuis Supabase
  const { data: plans } = await supabase
    .from('plans')
    .select('name, price')

  if (!clients) return res.status(200).json({ mrr: 0, arr: 0, total: 0 })

  // Construit le map des prix depuis la table plans
  const planPrices = {}
  if (plans && plans.length > 0) {
    plans.forEach(p => { planPrices[p.name] = p.price })
  } else {
    // Fallback si la table plans n'est pas disponible
    planPrices['Starter'] = 19
    planPrices['Business'] = 39
    planPrices['Pro'] = 69
  }

  const active = clients.filter(c => c.active !== false)
  const mrr = active.reduce((acc, c) => acc + (planPrices[c.plan] || 0), 0)
  const arr = mrr * 12

  // Nouveaux clients ce mois
  const thisMonthStart = new Date()
  thisMonthStart.setDate(1)
  thisMonthStart.setHours(0, 0, 0, 0)
  const newThisMonth = clients.filter(c => new Date(c.created_at) >= thisMonthStart).length

  // MRR mois dernier (estimation)
  const mrrLastMonth = active.length > newThisMonth
    ? ((active.length - newThisMonth) / active.length) * mrr
    : 0

  // Répartition par plan
  const byPlan = {}
  Object.keys(planPrices).forEach(planName => {
    const count = active.filter(c => c.plan === planName).length
    byPlan[planName] = {
      count,
      mrr: count * (planPrices[planName] || 0),
      price: planPrices[planName] || 0,
    }
  })

  // Churn
  const churned = clients.filter(c => c.active === false).length
  const churnRate = clients.length > 0 ? Math.round((churned / clients.length) * 100) : 0
  const avgMrr = active.length > 0 ? mrr / active.length : 0
  const ltv = churnRate > 0 ? Math.round(avgMrr / (churnRate / 100)) : 0
  const mrrGrowth = mrrLastMonth > 0 ? Math.round(((mrr - mrrLastMonth) / mrrLastMonth) * 100) : 0

  return res.status(200).json({
    mrr,
    arr,
    mrrLastMonth: Math.round(mrrLastMonth),
    mrrGrowth,
    total: active.length,
    newThisMonth,
    churned,
    churnRate,
    ltv,
    byPlan,
    planPrices,
  })
}
