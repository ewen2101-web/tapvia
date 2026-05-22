import { supabase } from '../../lib/supabase'

export default async function handler(req, res) {
  // Créer un nouveau lien
  if (req.method === 'POST') {
    const { slug, destination, client_name, plan } = req.body

    if (!slug || !destination || !client_name) {
      return res.status(400).json({ error: 'Champs manquants' })
    }

    const { data, error } = await supabase
      .from('redirects')
      .insert({ slug, destination, client_name, plan: plan || 'Starter', active: true })
      .select()
      .single()

    if (error) return res.status(400).json({ error: error.message })
    return res.status(200).json(data)
  }

  // Récupérer tous les liens
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('redirects')
      .select(`
        *,
        scans(count)
      `)
      .order('created_at', { ascending: false })

    if (error) return res.status(400).json({ error: error.message })
    return res.status(200).json(data)
  }

  // Modifier un lien existant
  if (req.method === 'PUT') {
    const { id, destination, plan, active } = req.body

    const { data, error } = await supabase
      .from('redirects')
      .update({ destination, plan, active })
      .eq('id', id)
      .select()
      .single()

    if (error) return res.status(400).json({ error: error.message })
    return res.status(200).json(data)
  }

  // Supprimer un lien
  if (req.method === 'DELETE') {
    const { id } = req.body

    const { error } = await supabase
      .from('redirects')
      .delete()
      .eq('id', id)

    if (error) return res.status(400).json({ error: error.message })
    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: 'Méthode non autorisée' })
}
