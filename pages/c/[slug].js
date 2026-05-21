import { createClient } from '@supabase/supabase-js'

  // Fonction pour obtenir le client Supabase (initialisation paresseuse)
  const getSupabaseClient = () => {
    return createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    )
  }

  export async function getServerSideProps({ params }) {
    const { slug } = params

    // Initialiser le client Supabase À L'INTÉRIEUR de la fonction
    const supabase = getSupabaseClient()

    // 1. Cherche le lien dans la base de données
    const { data, error } = await supabase
      .from('redirects')
      .select('destination, id')
      .eq('slug', slug)
      .single()

    // 2. Si le slug n'existe pas → page 404
    if (error || !data) {
      return { notFound: true }
    }

    // 3. Enregistre le scan (+1) dans la table analytics
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

  // Page vide — jamais affichée (la redirection est instantanée)
  export default function RedirectPage() {
    return null
  }
