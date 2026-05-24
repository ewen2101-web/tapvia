import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  // Récupérer toutes les alertes
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('negative_alerts')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) return res.status(400).json({ error: error.message })
    return res.status(200).json(data || [])
  }

  // Créer une alerte
  if (req.method === 'POST') {
    const { redirect_id, client_name, rating, review_text, author } = req.body
    const { data, error } = await supabase
      .from('negative_alerts')
      .insert({ redirect_id, client_name, rating, review_text, author })
      .select()
      .single()
    if (error) return res.status(400).json({ error: error.message })
    return res.status(200).json(data)
  }

  // Mettre à jour le statut
  if (req.method === 'PUT') {
    const { id, status } = req.body
    const { data, error } = await supabase
      .from('negative_alerts')
      .update({ status })
      .eq('id', id)
      .select()
      .single()
    if (error) return res.status(400).json({ error: error.message })
    return res.status(200).json(data)
  }

  return res.status(405).end()
}
