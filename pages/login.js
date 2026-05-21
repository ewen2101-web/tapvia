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
    setLoading(true)
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    const data = await res.json()
    if (data.error) { setError(data.error); setLoading(false); return }
    localStorage.setItem('tapvia_redirect_id', data.redirect_id)
    localStorage.setItem('tapvia_user_id', data.user_id)
    router.push('/client')
  }

  return (
    <div style={S.page}>
      <Head><title>Connexion — Tapvia</title></Head>
      <div style={S.box}>
        <div style={S.logo}>tap<span style={{color:'#7C6AF7'}}>via</span></div>
        <div style={S.title}>Accéder à mon dashboard</div>
        <input style={S.input} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <input style={S.input} type="password" placeholder="Mot de passe" value={password}
          onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
        {error && <div style={S.error}>{error}</div>}
        <button style={S.btn} onClick={handleLogin} disabled={loading}>
          {loading ? 'Connexion...' : 'Se connecter →'}
        </button>
      </div>
    </div>
  )
}

const S = {
  page: { minHeight:'100vh', background:'#0A0A0F', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'system-ui, sans-serif' },
  box: { background:'#111118', border:'1px solid #ffffff0f', borderRadius:12, padding:36, width:360, display:'flex', flexDirection:'column', gap:12 },
  logo: { fontSize:20, fontWeight:800 },
  title: { fontSize:16, fontWeight:700, color:'#F0EEF8', marginBottom:4 },
  input: { width:'100%', background:'#0A0A0F', border:'1px solid #ffffff1a', borderRadius:6, color:'#F0EEF8', fontFamily:'monospace', fontSize:12, padding:'10px 12px', outline:'none' },
  error: { color:'#F05252', fontSize:12, fontFamily:'monospace' },
  btn: { background:'#7C6AF7', color:'#fff', border:'none', borderRadius:6, padding:'10px 18px', cursor:'pointer', fontWeight:600, fontSize:13 },
}
