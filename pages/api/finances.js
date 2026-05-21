import { supabase } from '../../lib/supabase'

const PLAN_MRR = { Starter: 19, Business: 39, Pro: 69 }

export default async function handler(req, res) {
  const { data: clients } = await supabase.from('redirects').select('plan, active, created_at')

  const active = clients.filter(c => c.active)
  const mrr = active.reduce((acc, c) => acc + (PLAN_MRR[c.plan] || 0), 0)
  const arr = mrr * 12

  // Nouveaux clients ce mois
  const thisMonth = new Date()
  thisMonth.setDate(1)
  const newThisMonth = clients.filter(c => new Date(c.created_at) >= thisMonth).length

  // Répartition par plan
  const byPlan = {
    Starter: active.filter(c => c.plan === 'Starter').length,
    Business: active.filter(c => c.plan === 'Business').length,
    Pro: active.filter(c => c.plan === 'Pro').length,
  }

  return res.status(200).json({ mrr, arr, total: active.length, newThisMonth, byPlan })
}
