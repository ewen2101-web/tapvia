import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'

export default function ClientDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState(30)
  const [redirectId, setRedirectId] = useState(null)

  useEffect(() => {
    const id = localStorage.getItem('tapvia_redirect_id')
    if (!id) { router.push('/login'); return }
    setRedirectId(id)
    fetchStats(id, period)
  }, [])

  useEffect(() => {
    if (redirectId) fetchStats(redirectId, period)
  }, [period])

  async function fetchStats(id, days) {
    setLoading(true)
    const res = await fetch(`/api/client-stats?redirect_id=${id}&days=${days}`)
    const data = await res.json()
    setStats(data)
    setLoading(false)
  }

  function logout() {
    localStorage.clear()
    router.push('/login')
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0A0A0F', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B6880', fontFamily: 'monospace', fontSize: 13 }}>
        Chargement de votre dashboard...
      </div>
    )
  }

  const conversionRate = stats?.totalScans > 0
    ? Math.round((stats?.totalReviews / stats?.totalScans) * 100)
    : 0

  const estimatedViews = (stats?.totalScans || 0) * 8

  // Prépare les données du graphique
  const chartData = stats?.scansByDay || {}
  const chartDays = Object.keys(chartData).slice(-14)
  const chartMax = Math.max(...Object.values(chartData), 1)

  return (
    <div style={S.page}>
      <Head>
        <title>{stats?.client?.client_name || 'Mon dashboard'} — Tapvia</title>
      </Head>

      {/* Header */}
      <header style={S.header}>
        <div style={S.headerLeft}>
          <div style={S.logo}>tap<span style={{ color: '#7C6AF7' }}>via</span></div>
          <div style={S.separator}>/</div>
          <div style={S.clientName}>{stats?.client?.client_name}</div>
        </div>
        <div style={S.headerRight}>
          <span style={S.planBadge}>{stats?.client?.plan || 'Starter'}</span>
          <button style={S.logoutBtn} onClick={logout}>Déconnexion</button>
        </div>
      </header>

      <div style={S.content}>

        {/* Sélecteur de période */}
        <div style={S.periodRow}>
          <div style={S.periodLabel}>Période :</div>
          <div style={S.periodSelector}>
            {[7, 30, 90].map(d => (
              <button key={d}
                style={{ ...S.periodBtn, ...(period === d ? S.periodActive : {}) }}
                onClick={() => setPeriod(d)}>
                {d} jours
              </button>
            ))}
          </div>
        </div>

        {/* Métriques principales */}
        <div style={S.metrics}>
          <div style={S.metricCard}>
            <div style={S.metricLabel}>Scans NFC</div>
            <div style={{ ...S.metricValue, color: '#7C6AF7' }}>{stats?.totalScans || 0}</div>
            <div style={{ ...S.metricDelta, color: stats?.delta >= 0 ? '#5EE8B0' : '#F05252' }}>
              {stats?.delta >= 0 ? '↑' : '↓'} {Math.abs(stats?.delta || 0)}% vs période précédente
            </div>
          </div>

          <div style={S.metricCard}>
            <div style={S.metricLabel}>Note Google</div>
            <div style={{ ...S.metricValue, color: '#F0A050' }}>
              {stats?.avgRating > 0 ? `${stats.avgRating}★` : '—'}
            </div>
            <div style={S.metricSub}>Note moyenne actuelle</div>
          </div>

          <div style={S.metricCard}>
            <div style={S.metricLabel}>Avis reçus</div>
            <div style={{ ...S.metricValue, color: '#5EE8B0' }}>{stats?.totalReviews || 0}</div>
            <div style={S.metricSub}>Total sur Google</div>
          </div>

          <div style={S.metricCard}>
            <div style={S.metricLabel}>Visibilité estimée</div>
            <div style={{ ...S.metricValue, color: '#7C6AF7' }}>+{estimatedViews.toLocaleString('fr')}</div>
            <div style={S.metricSub}>vues Google estimées</div>
          </div>
        </div>

        {/* Graphique scans */}
        <div style={S.card}>
          <div style={S.cardTitle}>Scans par jour — {period} derniers jours</div>
          {chartDays.length === 0 ? (
            <div style={S.empty}>Aucun scan sur cette période.</div>
          ) : (
            <div style={S.chart}>
              {chartDays.map(day => {
                const val = chartData[day] || 0
                const height = Math.max((val / chartMax) * 120, 4)
                return (
                  <div key={day} style={S.barWrap} title={`${day} : ${val} scan(s)`}>
                    <div style={S.barVal}>{val > 0 ? val : ''}</div>
                    <div style={{ ...S.bar, height }} />
                    <div style={S.barLabel}>{day.slice(8)}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Taux de conversion */}
        <div style={S.row}>
          <div style={{ ...S.card, flex: 1 }}>
            <div style={S.cardTitle}>Taux de conversion</div>
            <div style={S.conversionWrap}>
              <div style={S.conversionRate}>{conversionRate}%</div>
              <div style={S.conversionSub}>
                {stats?.totalScans || 0} scans → {stats?.totalReviews || 0} avis
              </div>
              <div style={S.progressBar}>
                <div style={{ ...S.progressFill, width: `${conversionRate}%` }} />
              </div>
              <div style={S.conversionTip}>
                {conversionRate < 15
                  ? '💡 Conseil : Place la carte NFC en zone de caisse pour améliorer la conversion.'
                  : conversionRate < 30
                  ? '👍 Bonne conversion ! Continue ainsi.'
                  : '🚀 Excellente conversion !'}
              </div>
            </div>
          </div>

          <div style={{ ...S.card, flex: 1 }}>
            <div style={S.cardTitle}>Visibilité Google estimée</div>
            <div style={S.visibilityWrap}>
              <div style={S.visibilityItem}>
                <div style={S.visibilityIcon}>👁</div>
                <div>
                  <div style={S.visibilityValue}>+{estimatedViews.toLocaleString('fr')}</div>
                  <div style={S.visibilitySub}>vues Google estimées</div>
                </div>
              </div>
              <div style={S.visibilityItem}>
                <div style={S.visibilityIcon}>📍</div>
                <div>
                  <div style={S.visibilityValue}>+{Math.round(estimatedViews * 0.3).toLocaleString('fr')}</div>
                  <div style={S.visibilitySub}>recherches Google Maps</div>
                </div>
              </div>
              <div style={S.visibilityItem}>
                <div style={S.visibilityIcon}>⭐</div>
                <div>
                  <div style={S.visibilityValue}>{stats?.totalReviews || 0}</div>
                  <div style={S.visibilitySub}>avis Google au total</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={S.footer}>
          Dashboard propulsé par <strong>tapvia</strong> · Données mises à jour en temps réel
        </div>

      </div>
    </div>
  )
}

const S = {
  page: { minHeight: '100vh', background: '#0A0A0F', color: '#F0EEF8', fontFamily: 'system-ui, sans-serif' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px', borderBottom: '1px solid #ffffff0f', position: 'sticky', top: 0, background: '#0A0A0F', zIndex: 10 },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  logo: { fontSize: 18, fontWeight: 800 },
  separator: { color: '#6B6880', fontSize: 18 },
  clientName: { fontSize: 15, fontWeight: 600, color: '#F0EEF8' },
  headerRight: { display: 'flex', alignItems: 'center', gap: 10 },
  planBadge: { background: '#7C6AF720', border: '1px solid #7C6AF740', color: '#7C6AF7', fontFamily: 'monospace', fontSize: 10, padding: '4px 8px', borderRadius: 4 },
  logoutBtn: { background: 'transparent', border: '1px solid #ffffff1a', color: '#6B6880', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12 },
  content: { padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1100, margin: '0 auto' },
  periodRow: { display: 'flex', alignItems: 'center', gap: 12 },
  periodLabel: { fontSize: 13, color: '#6B6880' },
  periodSelector: { display: 'flex', gap: 6 },
  periodBtn: { background: 'transparent', border: '1px solid #ffffff1a', color: '#6B6880', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  periodActive: { background: '#7C6AF720', border: '1px solid #7C6AF7', color: '#F0EEF8' },
  metrics: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 },
  metricCard: { background: '#111118', border: '1px solid #ffffff0f', borderRadius: 10, padding: '16px 18px' },
  metricLabel: { fontFamily: 'monospace', fontSize: 10, color: '#6B6880', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  metricValue: { fontSize: 28, fontWeight: 800, letterSpacing: -1, lineHeight: 1 },
  metricDelta: { fontSize: 11, fontFamily: 'monospace', marginTop: 6 },
  metricSub: { fontSize: 11, color: '#6B6880', marginTop: 6 },
  card: { background: '#111118', border: '1px solid #ffffff0f', borderRadius: 10, padding: '20px 24px' },
  cardTitle: { fontSize: 13, fontWeight: 700, color: '#F0EEF8', marginBottom: 16 },
  empty: { color: '#6B6880', fontFamily: 'monospace', fontSize: 12, textAlign: 'center', padding: 20 },
  chart: { display: 'flex', alignItems: 'flex-end', gap: 6, height: 160, paddingTop: 24 },
  barWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1, cursor: 'default' },
  barVal: { fontSize: 9, color: '#6B6880', fontFamily: 'monospace', height: 12 },
  bar: { width: '100%', background: '#7C6AF7', borderRadius: 3, minHeight: 4, transition: 'height 0.3s' },
  barLabel: { fontSize: 9, color: '#6B6880', fontFamily: 'monospace' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  conversionWrap: { display: 'flex', flexDirection: 'column', gap: 10 },
  conversionRate: { fontSize: 48, fontWeight: 800, color: '#5EE8B0', letterSpacing: -2, lineHeight: 1 },
  conversionSub: { fontSize: 12, color: '#6B6880', fontFamily: 'monospace' },
  progressBar: { height: 6, background: '#1A1A24', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', background: '#5EE8B0', borderRadius: 4, transition: 'width 0.5s' },
  conversionTip: { fontSize: 12, color: '#6B6880', background: '#1A1A24', padding: '8px 12px', borderRadius: 6, lineHeight: 1.5 },
  visibilityWrap: { display: 'flex', flexDirection: 'column', gap: 14 },
  visibilityItem: { display: 'flex', alignItems: 'center', gap: 14 },
  visibilityIcon: { fontSize: 24, width: 40, textAlign: 'center' },
  visibilityValue: { fontSize: 18, fontWeight: 700, color: '#F0EEF8' },
  visibilitySub: { fontSize: 11, color: '#6B6880', marginTop: 2 },
  footer: { textAlign: 'center', fontSize: 11, color: '#6B6880', padding: '20px 0', borderTop: '1px solid #ffffff0f' },
}
