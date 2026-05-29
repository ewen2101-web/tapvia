import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'

export default function ClientDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState(null)
  const [reviews, setReviews] = useState(null)
  const [competitors, setCompetitors] = useState(null)
  const [ratingHistory, setRatingHistory] = useState(null)
  const [localRanking, setLocalRanking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [competitorsLoading, setCompetitorsLoading] = useState(false)
  const [rankingLoading, setRankingLoading] = useState(false)
  const [period, setPeriod] = useState(30)
  const [redirectId, setRedirectId] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [alertsShown, setAlertsShown] = useState(false)

  useEffect(() => {
    const id = localStorage.getItem('tapvia_redirect_id')
    if (!id) { router.push('/login'); return }
    setRedirectId(id)
    fetchStats(id, period)
    fetchRatingHistory(id)
  }, [])

  useEffect(() => {
    if (redirectId) fetchStats(redirectId, period)
  }, [period])

  useEffect(() => {
    if (!redirectId) return
    if (activeTab === 'reviews' && !reviews) fetchReviews(redirectId)
    if (activeTab === 'competitors' && !competitors) fetchCompetitors(redirectId)
    if (activeTab === 'ranking' && !localRanking) fetchLocalRanking(redirectId)
  }, [activeTab])

  async function fetchStats(id, days) {
    setLoading(true)
    const res = await fetch(`/api/client-stats?redirect_id=${id}&days=${days}`)
    const data = await res.json()
    setStats(data)
    setLoading(false)
  }

  async function fetchRatingHistory(id) {
    const res = await fetch(`/api/rating-history?redirect_id=${id}`)
    const data = await res.json()
    setRatingHistory(Array.isArray(data) ? data : [])
  }

  async function fetchReviews(id) {
    setReviewsLoading(true)
    const res = await fetch(`/api/google-reviews?redirect_id=${id}`)
    const data = await res.json()
    setReviews(data)
    if (data.rating) {
      await fetch('/api/rating-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redirect_id: id, rating: data.rating, total_reviews: data.total_reviews })
      })
      fetchRatingHistory(id)
    }
    setReviewsLoading(false)
  }

  async function fetchCompetitors(id) {
    setCompetitorsLoading(true)
    const placeId = stats?.client?.google_place_id
    if (!placeId) { setCompetitors({ error: 'Place ID non configuré.' }); setCompetitorsLoading(false); return }
    const res = await fetch(`/api/competitors?place_id=${placeId}`)
    const data = await res.json()
    setCompetitors(data)
    setCompetitorsLoading(false)
  }

  async function fetchLocalRanking(id) {
    setRankingLoading(true)
    const placeId = stats?.client?.google_place_id
    if (!placeId) { setLocalRanking({ error: 'Place ID non configuré.' }); setRankingLoading(false); return }
    const res = await fetch(`/api/local-ranking?place_id=${placeId}`)
    const data = await res.json()
    setLocalRanking(data)
    setRankingLoading(false)
  }

  function exportPDF() {
    window.open(`/api/export-pdf?redirect_id=${redirectId}`, '_blank')
  }

  function logout() {
    localStorage.clear()
    router.push('/login')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0A0A0F', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B6880', fontFamily: 'monospace', fontSize: 13 }}>
      Chargement de votre dashboard...
    </div>
  )

  if (!stats?.client) return (
    <div style={{ minHeight: '100vh', background: '#0A0A0F', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B6880', fontFamily: 'monospace', fontSize: 13 }}>
      Erreur. <span onClick={() => router.push('/login')} style={{ color: '#7C6AF7', cursor: 'pointer', marginLeft: 6 }}>Reconnecte-toi →</span>
    </div>
  )

  // ✅ FIX Bug 2 : objectif mensuel basé sur les NOUVEAUX scans du mois, pas le total d'avis
  const scansThisMonth = stats.scansThisMonth || 0
  const monthlyGoal = stats.client.monthly_goal || 50
  const goalProgress = Math.min(Math.round((scansThisMonth / monthlyGoal) * 100), 100)

  // ✅ FIX Bug 3 : taux de conversion affiché seulement si données cohérentes
  // Un taux de conversion n'a de sens que si on a des scans ET des avis,
  // et que le nombre d'avis ne dépasse pas le nombre de scans
  const hasValidConversionData = stats.totalScans > 0 && stats.totalReviews > 0 && stats.totalScans >= stats.totalReviews
  const conversionRate = hasValidConversionData
    ? Math.round((stats.totalReviews / stats.totalScans) * 100)
    : null

  const estimatedViews = (stats.totalScans || 0) * 8
  const chartData = stats.scansByDay || {}
  const chartDays = Object.keys(chartData).slice(-14)
  const chartMax = Math.max(...Object.values(chartData), 1)
  const negativeReviews = (reviews?.reviews || []).filter(r => r.rating <= 2)

  const historyData = ratingHistory || []
  const ratingEvolution = historyData.length >= 2
    ? (historyData[historyData.length - 1].rating - historyData[0].rating).toFixed(1)
    : null
  const historyMax = Math.max(...historyData.map(h => h.rating), 5)
  const historyMin = Math.max(Math.min(...historyData.map(h => h.rating), 3) - 0.5, 0)

  const monthNames = { '01': 'Jan', '02': 'Fév', '03': 'Mar', '04': 'Avr', '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Aoû', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Déc' }

  return (
    <div style={S.page}>
      <Head><title>{stats.client.client_name} — Dashboard Tapvia</title></Head>

      {reviews && negativeReviews.length > 0 && !alertsShown && (
        <div style={S.alertBanner}>
          <div style={S.alertBannerContent}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            <div style={{ fontSize: 13 }}>
              <strong>{negativeReviews.length} avis négatif{negativeReviews.length > 1 ? 's' : ''}</strong> récent{negativeReviews.length > 1 ? 's' : ''} — {negativeReviews.map(r => r.rating + '★').join(', ')}
            </div>
            <button style={S.alertBannerBtn} onClick={() => { setActiveTab('reviews'); setAlertsShown(true) }}>Voir →</button>
            <button style={S.alertBannerClose} onClick={() => setAlertsShown(true)}>✕</button>
          </div>
        </div>
      )}

      <header style={S.header}>
        <div style={S.headerLeft}>
          <div style={S.logo}>tap<span style={{ color: '#7C6AF7' }}>via</span></div>
          <div style={S.separator}>/</div>
          <div style={S.clientName}>{stats.client.client_name}</div>
        </div>
        <div style={S.headerRight}>
          <span style={S.planBadge}>{stats.client.plan || 'Starter'}</span>
          <button style={S.exportBtn} onClick={exportPDF}>📄 Rapport PDF</button>
          <button style={S.logoutBtn} onClick={logout}>Déconnexion</button>
        </div>
      </header>

      <div style={S.tabs}>
        {[
          { id: 'overview', label: '📊 Vue d\'ensemble' },
          { id: 'reviews', label: `⭐ Avis Google${negativeReviews.length > 0 ? ` (${negativeReviews.length} ⚠️)` : ''}` },
          { id: 'competitors', label: '🏆 Concurrents' },
          { id: 'ranking', label: '📍 Classement local' },
        ].map(tab => (
          <button key={tab.id} style={{ ...S.tab, ...(activeTab === tab.id ? S.tabActive : {}) }} onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </button>
        ))}
      </div>

      <div style={S.content}>

        {activeTab === 'overview' && (
          <>
            <div style={S.periodRow}>
              <div style={S.periodLabel}>Période :</div>
              <div style={S.periodSelector}>
                {[7, 30, 90].map(d => (
                  <button key={d} style={{ ...S.periodBtn, ...(period === d ? S.periodActive : {}) }} onClick={() => setPeriod(d)}>{d} jours</button>
                ))}
              </div>
            </div>

            <div style={S.metrics}>
              {[
                { label: 'Scans NFC', value: stats.totalScans || 0, color: '#7C6AF7', delta: `${(stats.delta || 0) >= 0 ? '↑' : '↓'} ${Math.abs(stats.delta || 0)}% vs période préc.`, deltaColor: (stats.delta || 0) >= 0 ? '#5EE8B0' : '#F05252' },
                { label: 'Note Google', value: stats.avgRating > 0 ? `${stats.avgRating}★` : '—', color: '#F0A050', sub: 'Note moyenne actuelle' },
                { label: 'Avis reçus', value: stats.totalReviews || 0, color: '#5EE8B0', sub: 'Total sur Google' },
                { label: 'Visibilité estimée', value: `+${estimatedViews.toLocaleString('fr')}`, color: '#7C6AF7', sub: 'vues Google estimées' },
              ].map((m, i) => (
                <div key={i} style={S.metricCard}>
                  <div style={S.metricLabel}>{m.label}</div>
                  <div style={{ ...S.metricValue, color: m.color }}>{m.value}</div>
                  {m.delta && <div style={{ fontSize: 11, fontFamily: 'monospace', marginTop: 6, color: m.deltaColor }}>{m.delta}</div>}
                  {m.sub && <div style={S.metricSub}>{m.sub}</div>}
                </div>
              ))}
            </div>

            {/* ✅ FIX Bug 2 : objectif mensuel basé sur scansThisMonth */}
            <div style={S.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={S.cardTitle}>🎯 Objectif mensuel de scans</div>
                <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#6B6880' }}>
                  {scansThisMonth} / {monthlyGoal} scans ce mois
                </div>
              </div>

              <div style={{ height: 12, background: '#1A1A24', borderRadius: 8, overflow: 'hidden', marginBottom: 10 }}>
                <div style={{
                  height: '100%',
                  width: `${goalProgress}%`,
                  background: goalProgress >= 100 ? '#5EE8B0' : goalProgress >= 70 ? '#7C6AF7' : goalProgress >= 40 ? '#F0A050' : '#F05252',
                  borderRadius: 8,
                  transition: 'width 0.5s ease',
                }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 12, color: '#6B6880' }}>
                  {goalProgress >= 100
                    ? '🎉 Objectif atteint ! Excellent travail !'
                    : goalProgress >= 70
                    ? `💪 Encore ${monthlyGoal - scansThisMonth} scans pour atteindre l'objectif`
                    : goalProgress >= 40
                    ? `📈 Continuez, vous êtes à ${goalProgress}% de l'objectif`
                    : `🚀 Démarrage — ${monthlyGoal - scansThisMonth} scans restants ce mois`}
                </div>
                <div style={{
                  fontSize: 22, fontWeight: 800,
                  color: goalProgress >= 100 ? '#5EE8B0' : goalProgress >= 70 ? '#7C6AF7' : '#F0A050'
                }}>
                  {goalProgress}%
                </div>
              </div>
            </div>

            <div style={S.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={S.cardTitle}>📈 Évolution de votre note Google</div>
                {ratingEvolution !== null && (
                  <div style={{
                    fontFamily: 'monospace', fontSize: 13, fontWeight: 700,
                    color: parseFloat(ratingEvolution) >= 0 ? '#5EE8B0' : '#F05252'
                  }}>
                    {parseFloat(ratingEvolution) >= 0 ? '↑' : '↓'} {Math.abs(ratingEvolution)}★ depuis le début
                  </div>
                )}
              </div>

              {historyData.length === 0 ? (
                <div style={S.empty}>
                  Pas encore d'historique. Les données s'accumulent automatiquement chaque mois.<br />
                  <span style={{ fontSize: 11, color: '#6B6880' }}>Ouvre l'onglet "Avis Google" pour enregistrer la note actuelle.</span>
                </div>
              ) : historyData.length === 1 ? (
                <div style={{ textAlign: 'center', padding: 20 }}>
                  <div style={{ fontSize: 36, fontWeight: 800, color: '#F0A050' }}>{historyData[0].rating}★</div>
                  <div style={{ fontSize: 12, color: '#6B6880', marginTop: 8 }}>Note actuelle — L'évolution apparaîtra le mois prochain</div>
                </div>
              ) : (
                <>
                  <div style={{ position: 'relative', height: 140, marginBottom: 8 }}>
                    <svg width="100%" height="140" viewBox={`0 0 ${historyData.length * 80} 140`} preserveAspectRatio="none">
                      <polyline
                        points={historyData.map((h, i) => {
                          const x = (i / (historyData.length - 1)) * (historyData.length * 80)
                          const y = 120 - ((h.rating - historyMin) / (historyMax - historyMin)) * 100
                          return `${x},${y}`
                        }).join(' ')}
                        fill="none"
                        stroke="#7C6AF7"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {historyData.map((h, i) => {
                        const x = (i / (historyData.length - 1)) * (historyData.length * 80)
                        const y = 120 - ((h.rating - historyMin) / (historyMax - historyMin)) * 100
                        return (
                          <g key={i}>
                            <circle cx={x} cy={y} r="5" fill="#7C6AF7" />
                            <text x={x} y={y - 12} textAnchor="middle" fill="#F0EEF8" fontSize="11" fontWeight="700">{h.rating}★</text>
                          </g>
                        )
                      })}
                    </svg>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 4 }}>
                    {historyData.map((h, i) => (
                      <div key={i} style={{ fontFamily: 'monospace', fontSize: 10, color: '#6B6880', textAlign: 'center' }}>
                        {monthNames[h.month?.slice(5, 7)] || h.month}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

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

            <div style={S.row}>
              {/* ✅ FIX Bug 3 : taux de conversion masqué si données incohérentes */}
              <div style={{ ...S.card, flex: 1 }}>
                <div style={S.cardTitle}>Taux de conversion</div>
                {conversionRate === null ? (
                  <div style={{ padding: '20px 0' }}>
                    <div style={{ fontSize: 32, fontWeight: 800, color: '#6B6880', letterSpacing: -1 }}>—</div>
                    <div style={{ fontSize: 12, color: '#6B6880', fontFamily: 'monospace', marginTop: 8 }}>
                      {stats.totalScans === 0
                        ? 'Aucun scan enregistré pour le moment.'
                        : 'Données insuffisantes — les statistiques apparaîtront une fois les cartes NFC activées.'}
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={S.conversionRate}>{conversionRate}%</div>
                    <div style={S.conversionSub}>{stats.totalScans} scans → {stats.totalReviews} avis</div>
                    <div style={S.progressBar}><div style={{ ...S.progressFill, width: `${conversionRate}%` }} /></div>
                    <div style={S.conversionTip}>
                      {conversionRate < 15 ? '💡 Place la carte NFC en zone de caisse pour améliorer la conversion.'
                        : conversionRate < 30 ? '👍 Bonne conversion ! Continue ainsi.'
                        : '🚀 Excellente conversion !'}
                    </div>
                  </>
                )}
              </div>

              <div style={{ ...S.card, flex: 1 }}>
                <div style={S.cardTitle}>Visibilité Google estimée</div>
                <div style={S.visibilityWrap}>
                  {[
                    { icon: '👁', value: `+${estimatedViews.toLocaleString('fr')}`, label: 'vues Google estimées' },
                    { icon: '📍', value: `+${Math.round(estimatedViews * 0.3).toLocaleString('fr')}`, label: 'recherches Google Maps' },
                    { icon: '⭐', value: stats.totalReviews || 0, label: 'avis Google au total' },
                  ].map((item, i) => (
                    <div key={i} style={S.visibilityItem}>
                      <div style={S.visibilityIcon}>{item.icon}</div>
                      <div>
                        <div style={S.visibilityValue}>{item.value}</div>
                        <div style={S.visibilitySub}>{item.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'reviews' && (
          <div>
            {reviewsLoading ? (
              <div style={S.empty}>Chargement des avis Google...</div>
            ) : reviews?.error ? (
              <div style={{ ...S.card, color: '#F05252', fontFamily: 'monospace', fontSize: 12 }}>⚠️ {reviews.error}</div>
            ) : (
              <>
                <div style={{ ...S.card, marginBottom: 16 }}>
                  <div style={S.cardTitle}>Résumé Google Reviews</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                    <div>
                      <div style={{ fontSize: 48, fontWeight: 800, color: '#F0A050', letterSpacing: -2 }}>{reviews?.rating || '—'}</div>
                      <div style={{ color: '#F0A050', fontSize: 20, marginTop: 4 }}>
                        {'★'.repeat(Math.round(reviews?.rating || 0))}{'☆'.repeat(5 - Math.round(reviews?.rating || 0))}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{reviews?.total_reviews || 0} avis au total</div>
                      <div style={{ fontSize: 12, color: '#6B6880', marginTop: 4 }}>
                        {negativeReviews.length > 0
                          ? <span style={{ color: '#F05252' }}>⚠️ {negativeReviews.length} avis négatif{negativeReviews.length > 1 ? 's' : ''} récent{negativeReviews.length > 1 ? 's' : ''}</span>
                          : <span style={{ color: '#5EE8B0' }}>✓ Aucun avis négatif récent</span>}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={S.cardTitle}>5 derniers avis</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                  {(reviews?.reviews || []).map((review, i) => (
                    <div key={i} style={{
                      ...S.card,
                      borderLeft: review.rating <= 2 ? '3px solid #F05252' : review.rating >= 5 ? '3px solid #5EE8B0' : '3px solid #7C6AF7',
                      background: review.rating <= 2 ? '#F0525208' : '#111118',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {review.profile_photo && <img src={review.profile_photo} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />}
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>{review.author}</div>
                            <div style={{ fontSize: 11, color: '#6B6880' }}>{review.relative_time}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ color: '#F0A050', fontSize: 14 }}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</div>
                          {review.rating <= 2 && <span style={{ background: '#F0525220', color: '#F05252', fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>⚠️ Négatif</span>}
                        </div>
                      </div>
                      <div style={{ fontSize: 13, color: '#C8C4D8', lineHeight: 1.6 }}>
                        {review.text || <span style={{ color: '#6B6880', fontStyle: 'italic' }}>Pas de commentaire</span>}
                      </div>
                      
                        href={`https://search.google.com/local/writereview?placeid=${stats.client.google_place_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: 'inline-block', marginTop: 10, fontSize: 11, color: '#7C6AF7', textDecoration: 'none', fontWeight: 600 }}
                      >
                        Répondre sur Google ↗
                      </a>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'competitors' && (
          <div>
            {competitorsLoading ? (
              <div style={S.empty}>Recherche des concurrents proches...</div>
            ) : competitors?.error ? (
              <div style={{ ...S.card, color: '#F05252', fontFamily: 'monospace', fontSize: 12 }}>⚠️ {competitors.error}</div>
            ) : (
              <div style={S.card}>
                <div style={S.cardTitle}>Comparaison locale — rayon 500m</div>
                <div style={{ fontSize: 12, color: '#6B6880', marginBottom: 16 }}>Établissements similaires dans votre zone</div>
                <div style={{ background: '#7C6AF720', border: '1px solid #7C6AF740', borderRadius: 8, padding: '14px 16px', marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#7C6AF7' }}>⭐ {competitors?.main?.name} <span style={{ fontSize: 11, fontWeight: 400 }}>(vous)</span></div>
                    <div style={{ display: 'flex', gap: 20 }}>
                      <div style={{ textAlign: 'center' }}><div style={{ fontSize: 20, fontWeight: 800, color: '#F0A050' }}>{competitors?.main?.rating || '—'}★</div><div style={{ fontSize: 10, color: '#6B6880' }}>Note</div></div>
                      <div style={{ textAlign: 'center' }}><div style={{ fontSize: 20, fontWeight: 800, color: '#5EE8B0' }}>{competitors?.main?.total_reviews || 0}</div><div style={{ fontSize: 10, color: '#6B6880' }}>Avis</div></div>
                    </div>
                  </div>
                </div>
                {(competitors?.competitors || []).map((c, i) => (
                  <div key={i} style={{ background: '#111118', border: '1px solid #ffffff0f', borderRadius: 8, padding: '14px 16px', marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>#{i + 1} {c.name}</div>
                      <div style={{ display: 'flex', gap: 20 }}>
                        <div style={{ textAlign: 'center' }}><div style={{ fontSize: 18, fontWeight: 800, color: c.rating > (competitors?.main?.rating || 0) ? '#F05252' : '#5EE8B0' }}>{c.rating || '—'}★</div><div style={{ fontSize: 10, color: '#6B6880' }}>Note</div></div>
                        <div style={{ textAlign: 'center' }}><div style={{ fontSize: 18, fontWeight: 800, color: c.total_reviews > (competitors?.main?.total_reviews || 0) ? '#F05252' : '#5EE8B0' }}>{c.total_reviews || 0}</div><div style={{ fontSize: 10, color: '#6B6880' }}>Avis</div></div>
                      </div>
                    </div>
                  </div>
                ))}
                <div style={{ background: '#1A1A24', borderRadius: 8, padding: '12px 14px', marginTop: 12, fontSize: 12, color: '#6B6880', lineHeight: 1.6 }}>
                  {(competitors?.main?.total_reviews || 0) > Math.max(...(competitors?.competitors || []).map(c => c.total_reviews || 0))
                    ? '🏆 Vous avez le plus d\'avis dans votre zone ! Continuez !'
                    : '💪 Continuez à collecter des avis avec vos cartes NFC pour dépasser vos concurrents !'}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'ranking' && (
          <div>
            {rankingLoading ? (
              <div style={S.empty}>Calcul de votre classement local...</div>
            ) : localRanking?.error ? (
              <div style={{ ...S.card, color: '#F05252', fontFamily: 'monospace', fontSize: 12 }}>⚠️ {localRanking.error}</div>
            ) : (
              <>
                <div style={{ ...S.card, textAlign: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 13, color: '#6B6880', marginBottom: 12, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Votre position dans votre zone (1km)
                  </div>
                  <div style={{ fontSize: 80, fontWeight: 900, letterSpacing: -4, lineHeight: 1, color: localRanking?.rank === 1 ? '#F0A050' : localRanking?.rank <= 3 ? '#7C6AF7' : '#5EE8B0' }}>
                    #{localRanking?.rank || '—'}
                  </div>
                  <div style={{ fontSize: 16, color: '#6B6880', marginTop: 8 }}>
                    sur {localRanking?.total || '—'} établissements similaires
                  </div>
                  <div style={{ marginTop: 16, fontSize: 14, color: '#F0EEF8', fontWeight: 600 }}>
                    {localRanking?.rank === 1 ? '🥇 Vous êtes le meilleur de votre zone !'
                      : localRanking?.rank === 2 ? '🥈 Excellent ! Encore un effort pour la 1ère place.'
                      : localRanking?.rank === 3 ? '🥉 Top 3 ! Continuez à collecter des avis.'
                      : `💪 Encore ${localRanking?.rank - 1} place${localRanking?.rank - 1 > 1 ? 's' : ''} à remonter pour le podium !`}
                  </div>
                </div>
                <div style={S.card}>
                  <div style={S.cardTitle}>Top 5 de votre zone</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                    {(localRanking?.top5 || []).map((place, i) => {
                      const isYou = place.isMain
                      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`
                      return (
                        <div key={i} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '12px 16px', borderRadius: 8,
                          background: isYou ? '#7C6AF720' : '#1A1A24',
                          border: isYou ? '1px solid #7C6AF740' : '1px solid transparent',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ fontSize: 20, width: 32, textAlign: 'center' }}>{medal}</div>
                            <div>
                              <div style={{ fontWeight: isYou ? 700 : 500, fontSize: 13, color: isYou ? '#7C6AF7' : '#F0EEF8' }}>
                                {place.name} {isYou && <span style={{ fontSize: 10, fontWeight: 400, color: '#7C6AF7' }}>(vous)</span>}
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontWeight: 700, color: '#F0A050', fontSize: 14 }}>{place.rating}★</div>
                              <div style={{ fontSize: 10, color: '#6B6880' }}>Note</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontWeight: 700, fontSize: 14 }}>{place.total_reviews}</div>
                              <div style={{ fontSize: 10, color: '#6B6880' }}>Avis</div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ background: '#0A0A0F', borderRadius: 8, padding: '12px 14px', marginTop: 16, fontSize: 12, color: '#6B6880', lineHeight: 1.6 }}>
                    📍 Classement basé sur la note Google et le nombre d'avis dans un rayon de 1km
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        <div style={S.footer}>
          Dashboard propulsé par <strong>tapvia</strong> · Données mises à jour en temps réel
        </div>
      </div>
    </div>
  )
}

const S = {
  page: { minHeight: '100vh', background: '#0A0A0F', color: '#F0EEF8', fontFamily: 'system-ui, sans-serif' },
  alertBanner: { background: '#F0525215', borderBottom: '1px solid #F0525240', padding: '12px 28px' },
  alertBannerContent: { display: 'flex', alignItems: 'center', gap: 12, maxWidth: 1100, margin: '0 auto' },
  alertBannerBtn: { background: '#F05252', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, marginLeft: 'auto' },
  alertBannerClose: { background: 'transparent', border: 'none', color: '#F05252', cursor: 'pointer', fontSize: 16, padding: '0 4px' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px', borderBottom: '1px solid #ffffff0f', position: 'sticky', top: 0, background: '#0A0A0F', zIndex: 10 },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  logo: { fontSize: 18, fontWeight: 800 },
  separator: { color: '#6B6880', fontSize: 18 },
  clientName: { fontSize: 15, fontWeight: 600 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 10 },
  planBadge: { background: '#7C6AF720', border: '1px solid #7C6AF740', color: '#7C6AF7', fontFamily: 'monospace', fontSize: 10, padding: '4px 8px', borderRadius: 4 },
  exportBtn: { background: '#1A1A24', border: '1px solid #ffffff1a', color: '#F0EEF8', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  logoutBtn: { background: 'transparent', border: '1px solid #ffffff1a', color: '#6B6880', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12 },
  tabs: { display: 'flex', borderBottom: '1px solid #ffffff0f', padding: '0 28px', background: '#0A0A0F' },
  tab: { background: 'transparent', border: 'none', borderBottom: '2px solid transparent', color: '#6B6880', padding: '14px 20px', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  tabActive: { color: '#F0EEF8', borderBottomColor: '#7C6AF7' },
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
  metricSub: { fontSize: 11, color: '#6B6880', marginTop: 6 },
  card: { background: '#111118', border: '1px solid #ffffff0f', borderRadius: 10, padding: '20px 24px' },
  cardTitle: { fontSize: 13, fontWeight: 700, marginBottom: 16 },
  empty: { color: '#6B6880', fontFamily: 'monospace', fontSize: 12, textAlign: 'center', padding: 40, lineHeight: 2 },
  chart: { display: 'flex', alignItems: 'flex-end', gap: 6, height: 160, paddingTop: 24 },
  barWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 },
  barVal: { fontSize: 9, color: '#6B6880', fontFamily: 'monospace', height: 12 },
  bar: { width: '100%', background: '#7C6AF7', borderRadius: 3, minHeight: 4 },
  barLabel: { fontSize: 9, color: '#6B6880', fontFamily: 'monospace' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  conversionRate: { fontSize: 48, fontWeight: 800, color: '#5EE8B0', letterSpacing: -2, lineHeight: 1, marginBottom: 8 },
  conversionSub: { fontSize: 12, color: '#6B6880', fontFamily: 'monospace', marginBottom: 8 },
  progressBar: { height: 6, background: '#1A1A24', borderRadius: 4, overflow: 'hidden', marginBottom: 12 },
  progressFill: { height: '100%', background: '#5EE8B0', borderRadius: 4 },
  conversionTip: { fontSize: 12, color: '#6B6880', background: '#1A1A24', padding: '8px 12px', borderRadius: 6, lineHeight: 1.5 },
  visibilityWrap: { display: 'flex', flexDirection: 'column', gap: 14 },
  visibilityItem: { display: 'flex', alignItems: 'center', gap: 14 },
  visibilityIcon: { fontSize: 24, width: 40, textAlign: 'center' },
  visibilityValue: { fontSize: 18, fontWeight: 700 },
  visibilitySub: { fontSize: 11, color: '#6B6880', marginTop: 2 },
  footer: { textAlign: 'center', fontSize: 11, color: '#6B6880', padding: '20px 0', borderTop: '1px solid #ffffff0f' },
}
