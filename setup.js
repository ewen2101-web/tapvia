import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

export default function Setup() {
  const router = useRouter()
  const { token } = router.query
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tokenValid, setTokenValid] = useState(null)

  useEffect(() => {
    if (token) setTokenValid(true)
    else if (router.isReady) setTokenValid(false)
  }, [token, router.isReady])

  async function handleSetup() {
    setError('')
    if (!password || !confirm) return setError('Remplis les deux champs.')
    if (password !== confirm) return setError('Les mots de passe ne correspondent pas.')
    if (password.length < 8) return setError('Minimum 8 caractères.')
    setLoading(true)

    const res = await fetch('/api/auth/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password })
    })
    const data = await res.json()

    if (data.error) {
      setError(data.error)
      setLoading(false)
      return
    }

    // Sauvegarde la session et redirige vers le dashboard client
    localStorage.setItem('tapvia_redirect_id', data.redirect_id)
    localStorage.setItem('tapvia_user_id', data.user_id)
    router.push('/client')
  }

  if (tokenValid === false) {
    return (
      <div style={S.page}>
        <div style={S.box}>
          <div style={S.logo}>tap<span style={{ color: '#7C6AF7' }}>via</span></div>
          <div style={{ fontSize: 32, textAlign: 'center', margin: '16px 0' }}>❌</div>
          <div style={S.title}>Lien invalide</div>
          <div style={S.sub}>Ce lien d'activation est invalide ou a expiré. Contacte ton prestataire Tapvia pour recevoir un nouveau lien.</div>
        </div>
      </div>
    )
  }

  return (
    <div style={S.page}>
      <Head><title>Activer mon compte — Tapvia</title></Head>
      <div style={S.box}>
        <div style={S.logo}>tap<span style={{ color: '#7C6AF7' }}>via</span></div>
        <div style={{ fontSize: 32, textAlign: 'center', margin: '8px 0' }}>🎉</div>
        <div style={S.title}>Activez votre compte</div>
        <div style={S.sub}>Choisissez un mot de passe pour accéder à votre dashboard Google Reviews.</div>

        <div style={S.formGroup}>
          <label style={S.label}>Mot de passe</label>
          <input
            style={S.input}
            type="password"
            placeholder="Minimum 8 caractères"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </div>

        <div style={S.formGroup}>
          <label style={S.label}>Confirmer le mot de passe</label>
          <input
            style={S.input}
            type="password"
            placeholder="Répète ton mot de passe"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSetup()}
          />
        </div>

        {error && <div style={S.error}>⚠ {error}</div>}

        <button style={{ ...S.btn, opacity: loading ? 0.7 : 1 }} onClick={handleSetup} disabled={loading}>
          {loading ? 'Activation en cours...' : 'Activer mon compte →'}
        </button>

        <div style={S.footer}>
          En activant votre compte, vous acceptez les conditions d'utilisation de Tapvia.
        </div>
      </div>
    </div>
  )
}

const S = {
  page: { minHeight: '100vh', background: '#0A0A0F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', padding: 20 },
  box: { background: '#111118', border: '1px solid #ffffff0f', borderRadius: 12, padding: 36, width: 400, maxWidth: '100%', display: 'flex', flexDirection: 'column', gap: 12 },
  logo: { fontSize: 20, fontWeight: 800, color: '#F0EEF8' },
  title: { fontSize: 20, fontWeight: 700, color: '#F0EEF8' },
  sub: { fontSize: 13, color: '#6B6880', lineHeight: 1.6 },
  formGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontFamily: 'monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, color: '#6B6880' },
  input: { width: '100%', background: '#0A0A0F', border: '1px solid #ffffff1a', borderRadius: 6, color: '#F0EEF8', fontFamily: 'monospace', fontSize: 12, padding: '10px 12px', outline: 'none', boxSizing: 'border-box' },
  error: { color: '#F05252', fontSize: 12, fontFamily: 'monospace', background: '#F0525210', padding: '8px 12px', borderRadius: 6 },
  btn: { background: '#7C6AF7', color: '#fff', border: 'none', borderRadius: 6, padding: '12px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 14, marginTop: 4 },
  footer: { fontSize: 11, color: '#6B6880', textAlign: 'center', lineHeight: 1.5, marginTop: 4 },
}
