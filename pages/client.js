import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'

export default function ClientDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState(30)

  useEffect(() => {
    const id = localStorage.getItem('tapvia_redirect_id')
    if (!id) { router.push('/login'); return }
    fetchStats(id)
  }, [period])

  async function fetchStats(id) {
    setLoading(true)
    const res = await fetch(`/api/client-stats?redirect_id=${id}&days=${period}`)
    const data = await res.json()
    setStats(data)
    setLoading(false)
  }

  if (loading) return <div style={loadingStyle}>Chargement...</div>

  return (
    <div style={S.page}>
      <Head><title>{stats?.client?.client_name} — Dashboard Tapvia</title></Head>

      {/* Header */}
      <header style={S.header}>
        <div style={S.headerLeft}>
          <div style={S.logo}>tap<span style={{color:'#7C6AF7'}}>via</span></div>
          <div style={S.clientName}>{stats?.client?.client_name}</div>
        </div>
        <button style={S.logoutBtn} onClick={() => {
          localStorage.clear()
          router.push('/login')
        }}>Déconnexion</button>
      </header>

      <div style={S.content}>
        {/* Sélecteur de période */}
        <div style={S.periodSelector}>
          {[7, 30, 90].map(d => (
            <button key={d} style={{...S.periodBtn, ...(period===d ? S.periodActive : {})}}
              onClick={() => setPeriod(d)}>{d} jours</button>
          ))}
        </div>

        {/* Métriques principales */}
        <div style={S.metrics}>
          <MetricCard label="Scans" value={stats?.totalScans} delta={stats?.delta} color="#7C6AF7" />
          <MetricCard label="Note moyenne" value={`${stats?.avgRating}★`} color="#F0A050" />
          <MetricCard label="Avis reçus" value={stats?.totalReviews} color="#5EE8B0" />
          <MetricCard label="Visibilité estimée" value={`+${(stats?.totalScans || 0) * 8}`} suffix="vues" color="#7C6AF7" />
        </div>

        {/* Graphique scans */}
        <ScanChart data={stats?.scansByDay} />

        {/* Taux de conversion */}
        <ConversionBlock scans={stats?.totalScans} reviews={stats?.totalReviews} />
      </div>
    </div>
  )
}

// Composants internes
function MetricCard({ label, value, delta, color, suffix }) { /* ... */ }
function ScanChart({ data }) { /* ... */ }
function ConversionBlock({ scans, reviews }) { /* ... */ }
