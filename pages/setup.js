import { useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

export default function Setup() {
  const router = useRouter()
  const { token } = router.query
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSetup() {
    if (password !== confirm) return setError('Les mots de passe ne correspondent pas.')
    if (password.length < 8) return setError('Minimum 8 caractères.')
    setLoading(true)
    const res = await fetch('/api/auth/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password })
    })
    const data = await res.json()
    if (data.error) { setError(data.error); setLoading(false); return }
    router.push('/client')
  }

  return (
    <div style={S.page}>
      <Head><title>Activer mon compte — Tapvia</title></Head>
      <div style={S.box}>
        <div style={S.logo}>tap<span style={{color:'#7C6AF7'}}>via</span></div>
        <div style={S.title}>Activez votre compte</div>
        <div style={S.sub}>Choisissez un mot de passe pour accéder à votre dashboard.</div>
        <input style={S.input} type="password" placeholder="Mot de passe (min. 8 caractères)"
          value={password} onChange={e => setPassword(e.target.value)} />
        <input style={S.input} type="password" placeholder="Confirmer le mot de passe"
          value={confirm} onChange={e => setConfirm(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSetup()} />
        {error && <div style={S.error}>{error}</div>}
        <button style={S.btn} onClick={handleSetup} disabled={loading}>
          {loading ? 'Activation...' : 'Activer mon compte →'}
        </button>
      </div>
    </div>
  )
}

const S = {
  page: { minHeight:'100vh', background:'#0A0A0F', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'system-ui, sans-serif' },
  box: { background:'#111118', border:'1px solid #ffffff0f', borderRadius:12, padding:36, width:380, display:'flex', flexDirection:'column', gap:12 },
  logo: { fontSize:20, fontWeight:800, marginBottom:4 },
  title: { fontSize:18, fontWeight:700, color:'#F0EEF8' },
  sub: { fontSize:13, color:'#6B6880', marginBottom:4 },
  input: { width:'100%', background:'#0A0A0F', border:'1px solid #ffffff1a', borderRadius:6, color:'#F0EEF8', fontFamily:'monospace', fontSize:12, padding:'10px 12px', outline:'none' },
  error: { color:'#F05252', fontSize:12, fontFamily:'monospace' },
  btn: { background:'#7C6AF7', color:'#fff', border:'none', borderRadius:6, padding:'10px 18px', cursor:'pointer', fontWeight:600, fontSize:13 },
}
