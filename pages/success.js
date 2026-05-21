  import { useEffect, useState } from 'react'
  import Head from 'next/head'
  import { useRouter } from 'next/router'

  export default function Success() {
    const router = useRouter()
    const [countdown, setCountdown] = useState(5)

    useEffect(() => {
      const timer = setInterval(() => {
        setCountdown(c => {
          if (c <= 1) { clearInterval(timer); router.push('/'); return 0 }
          return c - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }, [])

    return (
      <div style={{ minHeight: '100vh', background: '#0A0A0F', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', color: '#F0EEF8', textAlign: 
  'center', padding: 20 }}>
        <Head><title>Paiement confirmé — Tapvia</title></Head>
        <div style={{ fontSize: 64, marginBottom: 24 }}>✅</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>Abonnement activé !</h1>
        <p style={{ color: '#6B6880', fontSize: 15, marginBottom: 8 }}>Le paiement a été confirmé avec succès.</p>
        <p style={{ color: '#6B6880', fontSize: 13, marginBottom: 32 }}>Un reçu a été envoyé par email automatiquement par Stripe.</p>
        <div style={{ background: '#111118', border: '1px solid #ffffff0f', borderRadius: 10, padding: '16px 28px', fontFamily: 'monospace', fontSize: 13, color: '#5EE8B0' }}>
          Redirection vers le dashboard dans {countdown}s...
        </div>
      </div>
    )
  }
