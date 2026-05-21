import { createClient } from '@supabase/supabase-js'

  const getSupabaseClient = () => {
    return createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    )
  }

  export async function getServerSideProps({ params }) {
    const { slug } = params
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('redirects')
      .select('destination, id')
      .eq('slug', slug)
      .single()

    if (error || !data) {
      return { notFound: true }
    }

    await supabase.from('scans').insert({
      redirect_id: data.id,
      scanned_at: new Date().toISOString(),
    })

    return {
      redirect: {
        destination: data.destination,
        permanent: false,
      },
    }
  }

  export default function RedirectPage() {
    return null
  }
