import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { redirect_id } = req.query
    const { data } = await supabase
      .from('notes_crm')
      .select('*')
      .eq('redirect_id', redirect_id)
      .order('created_at', { ascending: false })
    return res.status(200).json(data || [])
  }

  if (req.method === 'POST') {
    const { redirect_id, content } = req.body
    const { data } = await supabase
      .from('notes_crm')
      .insert({ redirect_id, content })
      .select()
      .single()
    return res.status(200).json(data)
  }

  if (req.method === 'DELETE') {
    const { id } = req.body
    await supabase.from('notes_crm').delete().eq('id', id)
    return res.status(200).json({ success: true })
  }

  return res.status(405).end()
}
