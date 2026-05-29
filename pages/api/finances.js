import { createClient } from '@supabase/supabase-js'
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  // ✅ Lire les prix depuis Supabase, pas des constantes hardcodées
  const { data: plansData } = await supabase.from('plans').select('name, price')
  const PLAN_MRR = (plansData || []).reduce((acc, p) => {
    acc[p.name] = p.price
    return acc
  }, { Starter: 19, Business: 39, Pro: 69 }) // fallback si table vide

  const { data: clients } = await supabase
    .from('redirects')
    .select('id, plan, active, created_at, client_name')

  if (!clients) return res.status(200).json({ mrr: 0, arr: 0, total: 0 })

  const active = clients.filter(c => c.active !== false)
  const mrr = active.reduce((acc, c) => acc + (PLAN_MRR[c.plan] || 0), 0)
  const arr = mrr * 12

  const thisMonthStart = new Date()
  thisMonthStart.setDate(1)
  thisMonthStart.setHours(0, 0, 0, 0)
  const newThisMonth = clients.filter(c => new Date(c.created_at) >= thisMonthStart).length

  const mrrLastMonth = (active.length - newThisMonth) * (mrr / (active.length || 1))

  const byPlan = Object.keys(PLAN_MRR).reduce((acc, planName) => {
    const count = active.filter(c => c.plan === planName).length
    acc[planName] = { count, mrr: count * PLAN_MRR[planName] }
    return acc
  }, {})

  const churned = clients.filter(c => c.active === false).length
  const churnRate = clients.length > 0 ? Math.round((churned / clients.length) * 100) : 0
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
