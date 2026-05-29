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
  const ratingEvolution = historyData.lengt
