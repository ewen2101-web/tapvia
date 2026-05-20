import { supabase } from '../../lib/supabase'

// Cette page gère la redirection NFC
// Ex: tapvia.fr/c/pizza-bella → Google Reviews de Pizza Bella

export async function getServerSideProps({ params }) {
  const { slug } = params

  // 1. Cherche le lien dans la base de données
  const { data, error } = await supabase
    .from('redirects')
    .select('id, destination, active')
    .eq('slug', slug)
    .single()

  // 2. Slug introuvable ou lien désactivé → page 404
  if (error || !data || !data.active) {
    return { notFound: true }
  }

  // 3. Enregistre le scan dans la table analytics
  await supabase.from('scans').insert({
    redirect_id: data.id,
    scanned_at: new Date().toISOString(),
  })

  // 4. Redirige instantanément vers Google Reviews
  return {
    redirect: {
      destination: data.destination,
      permanent: false,
    },
  }
}

// Jamais affiché — la redirection est immédiate côté serveur
export default function RedirectPage() {
  return null
}
