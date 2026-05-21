import { useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setError('')
    if (!email || !password) return setError('Remplis tous les champs.')
    setLoading(true)

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    const data = await res.json()

    if (data.error) {
      setError(data.error)
      setLoading(false)
      return
    }

    localStorage.setItem('tapvia_redirect_id', data.redirect_id)
    localStorage.setItem('tapvia_user_id', data.user_id)
    localStorage.setItem('tapvia_email', data.email)
    router.push('/client')
  }

  return (
    <div style={S.page}>
      <Head><title>Connexion — Tapvia</title></Head>
      <div style={S.box}>
        <div style={S.logo}>tap<span style={{ color: '#7C6AF7' }}>via</span></div>
        <div style={S.title}>Accéder à mon dashboard</div>
        <div style={S.sub}>Suis tes avis Google et tes performances NFC.</div>

        <div style={S.formGroup}>
          <label style={S.label}>Email</label>
          <input
            style={S.input}
            type="email"
            placeholder="ton@email.fr"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>

        <div style={S.formGroup}>
          <label style={S.label}>Mot de passe</label>
          <input
            style={S.input}
            type="password"
            placeholder="Ton mot de passe"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
        </div>

        {error && <div style={S.error}>⚠ {error}</div>}

        <button style={{ ...S.btn, opacity: loading ? 0.7 : 1 }} onClick={handleLogin} disabled={loading}>
          {loading ? 'Connexion...' : 'Se connecter →'}
        </button>

        <div style={S.footer}>
          Pas encore de compte ? Contacte ton prestataire Tapvia pour recevoir ton lien d'activation.
        </div>
      </div>
    </div>
  )
}

const S = {
  page: { minHeight: '100vh', background: '#0A0A0F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', padding: 20 },
  box: { background: '#111118', border: '1px solid #ffffff0f', borderRadius: 12, padding: 36, width: 380, maxWidth: '100%', display: 'flex', flexDirection: 'column', gap: 12 },
  logo: { fontSize: 20, fontWeight: 800, color: '#F0EEF8' },
  title: { fontSize: 18, fontWeight: 700, color: '#F0EEF8' },
  sub: { fontSize: 13, color: '#6B6880', marginBottom: 4 },
  formGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontFamily: 'monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, color: '#6B6880' },
  input: { width: '100%', background: '#0A0A0F', border: '1px solid #ffffff1a', borderRadius: 6, color: '#F0EEF8', fontFamily: 'monospace', fontSize: 12, padding: '10px 12px', outline: 'none', boxSizing: 'border-box' },
  error: { color: '#F05252', fontSize: 12, fontFamily: 'monospace', background: '#F0525210', padding: '8px 12px', borderRadius: 6 },
  btn: { background: '#7C6AF7', color: '#fff', border: 'none', borderRadius: 6, padding: '12px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 14, marginTop: 4 },
  footer: { fontSize: 11, color: '#6B6880', textAlign: 'center', lineHeight: 1.5, marginTop: 4 },
}
