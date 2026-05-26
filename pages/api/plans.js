import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  // Récupérer tous les plans
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .order('price', { ascending: true })
    if (error) return res.status(400).json({ error: error.message })
    return res.status(200).json(data || [])
  }

  // Modifier le prix d'un plan
  if (req.method === 'PUT') {
    const { id, price, description, features } = req.body
    if (!id || price === undefined) return res.status(400).json({ error: 'Champs manquants' })
    if (price < 0) return res.status(400).json({ error: 'Prix invalide' })

    const { data, error } = await supabase
      .from('plans')
      .update({ price, description, features, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) return res.status(400).json({ error: error.message })
    return res.status(200).json(data)
  }

  return res.status(405).end()
}
