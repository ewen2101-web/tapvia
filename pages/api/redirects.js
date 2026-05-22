import { supabase } from '../../lib/supabase'

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { slug, destination, client_name, plan, client_email } = req.body
    if (!slug || !destination || !client_name) {
      return res.status(400).json({ error: 'Champs manquants' })
    }
    const { data, error } = await supabase
      .from('redirects')
      .insert({ slug, destination, client_name, plan: plan || 'Starter', client_email: client_email || '', active: true })
      .select()
      .single()
    if (error) return res.status(400).json({ error: error.message })
    return res.status(200).json(data)
  }

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('redirects')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) return res.status(400).json({ error: error.message })

    // Compte les scans séparément pour chaque client
    const clientsWithScans = await Promise.all(
      data.map(async (client) => {
        const { count } = await supabase
          .from('scans')
          .select('*', { count: 'exact', head: true })
          .eq('redirect_id', client.id)
        return { ...client, scans: [{ count: count || 0 }] }
      })
    )
    return res.status(200).json(clientsWithScans)
  }

  if (req.method === 'PUT') {
    const { id, destination, plan, active, client_email } = req.body
    const { data, error } = await supabase
      .from('redirects')
      .update({ destination, plan, active, client_email })
      .eq('id', id)
      .select()
      .single()
    if (error) return res.status(400).json({ error: error.message })
    return res.status(200).json(data)
  }

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
