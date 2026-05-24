import { useState, useEffect } from 'react'
import Head from 'next/head'

const PLAN_MRR = { Starter: 19, Business: 39, Pro: 69 }

export default function Admin() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState({ client_name: '', slug: '', destination: '', plan: 'Starter', client_email: '' })
  const [copied, setCopied] = useState(null)
  const [password, setPassword] = useState('')
  const [auth, setAuth] = useState(false)
  const [stripeLoading, setStripeLoading] = useState(null)
  const [inviteLoading, setInviteLoading] = useState(null)
  const [notification, setNotification] = useState(null)
  const [stripeLink, setStripeLink] = useState(null)
  const [inviteLink, setInviteLink] = useState(null)
  const [activeSection, setActiveSection] = useState('dashboard')
  const [selectedClient, setSelectedClient] = useState(null)
  const [clientDetail, setClientDetail] = useState(null)
  const [clientDetailLoading, setClientDetailLoading] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [finances, setFinances] = useState(null)
  const [negativeAlerts, setNegativeAlerts] = useState([])
  const [inactiveClients, setInactiveClients] = useState([])
  const [inactiveDays, setInactiveDays] = useState(14)
  const [promos, setPromos] = useState([])
  const [promoModal, setPromoModal] = useState(false)
  const [promoTarget, setPromoTarget] = useState(null)
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoResult, setPromoResult] = useState(null)
  const [promoForm, setPromoForm] = useState({ type: 'trial', value: 30, amount_off: '', expires_in_days: '' })
  const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123'

  useEffect(() => {
    if (auth) {
      fetchClients()
      fetchFinances()
      fetchNegativeAlerts()
      fetchPromos()
    }
  }, [auth])

  useEffect(() => {
    if (auth && activeSection === 'inactive') fetchInactiveClients()
    if (auth && activeSection === 'promos') fetchPromos()
  }, [activeSection, inactiveDays])

  function notify(msg, type = 'success') {
    setNotification({ msg, type })
    setTimeout(() => setNotification(null), 3500)
  }

  async function fetchClients() {
    setLoading(true)
    const res = await fetch('/api/redirects')
    const data = await res.json()
    setClients(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  async function fetchFinances() {
    const res = await fetch('/api/finances')
    const data = await res.json()
    setFinances(data)
  }

  async function fetchNegativeAlerts() {
    const res = await fetch('/api/negative-alerts')
    const data = await res.json()
    setNegativeAlerts(Array.isArray(data) ? data : [])
  }

  async function fetchPromos() {
    const res = await fetch('/api/promos')
    const data = await res.json()
    setPromos(Array.isArray(data) ? data : [])
  }

  async function createPromo(client) {
    setPromoLoading(true)
    setPromoResult(null)
    try {
      const res = await fetch('/api/promos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          redirect_id: client.id,
          client_name: client.client_name,
          type: promoForm.type,
          value: promoForm.type === 'trial' ? parseInt(promoForm.value) : parseInt(promoForm.value) || null,
          amount_off: promoForm.amount_off ? parseInt(promoForm.amount_off) : null,
          expires_in_days: promoForm.expires_in_days ? parseInt(promoForm.expires_in_days) : null,
        })
      })
      const data = await res.json()
      if (data.error) { notify(data.error, 'error'); setPromoLoading(false); return }
      setPromoResult(data)
      fetchPromos()
      notify('Promo créée ✓')
    } catch (e) { notify('Erreur réseau', 'error') }
    setPromoLoading(false)
  }

  async function updatePromoStatus(id, status) {
    await fetch('/api/promos', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status })
    })
    fetchPromos()
    notify('Promo mise à jour ✓')
  }

  async function fetchInactiveClients() {
    const res = await fetch(`/api/inactive-clients?days=${inactiveDays}`)
    const data = await res.json()
    setInactiveClients(Array.isArray(data) ? data : [])
  }

  async function fetchClientDetail(client) {
    setSelectedClient(client)
    setClientDetail(null)
    setClientDetailLoading(true)
    setActiveSection('client-detail')
    const res = await fetch(`/api/client-detail?redirect_id=${client.id}`)
    const data = await res.json()
    setClientDetail(data)
    setClientDetailLoading(false)
  }

  async function addNote() {
    if (!newNote.trim() || !selectedClient) return
    await fetch('/api/crm-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ redirect_id: selectedClient.id, content: newNote.trim() })
    })
    setNewNote('')
    fetchClientDetail(selectedClient)
    notify('Note ajoutée ✓')
  }

  async function deleteNote(noteId) {
    await fetch('/api/crm-notes', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: noteId })
    })
    fetchClientDetail(selectedClient)
  }

  async function updateAlertStatus(id, status) {
    await fetch('/api/negative-alerts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status })
    })
    fetchNegativeAlerts()
    notify('Statut mis à jour ✓')
  }

  async function changePlan(clientId, newPlan) {
    await fetch('/api/redirects', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: clientId, plan: newPlan, active: true })
    })
    fetchClients()
    if (clientDetail) fetchClientDetail(selectedClient)
    notify(`Plan mis à jour : ${newPlan} ✓`)
  }

  async function saveClient() {
    if (!form.client_name || !form.slug || !form.destination) {
      alert('Remplis tous les champs obligatoires.')
      return
    }
    if (editTarget) {
      await fetch('/api/redirects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editTarget.id, destination: form.destination, plan: form.plan, active: true, client_email: form.client_email })
      })
      notify('Client mis à jour ✓')
    } else {
      await fetch('/api/redirects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      notify('Client créé ✓')
    }
    setModal(false)
    setEditTarget(null)
    setForm({ client_name: '', slug: '', destination: '', plan: 'Starter', client_email: '' })
    fetchClients()
    fetchFinances()
  }

  async function sendStripeLink(client) {
    if (!client.client_email) {
      const email = prompt(`Email du client "${client.client_name}" :`)
      if (!email) return
      client = { ...client, client_email: email }
    }
    setStripeLoading(client.id)
    try {
      const res = await fetch('/api/stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_name: client.client_name, client_email: client.client_email, plan: client.plan })
      })
      const data = await res.json()
      if (data.url) setStripeLink({ url: data.url, client_name: client.client_name })
      else notify('Erreur : ' + (data.error || 'inconnue'), 'error')
    } catch (e) { notify('Erreur réseau', 'error') }
    setStripeLoading(null)
  }

  async function sendInvite(client) {
    if (!client.client_email) {
      const email = prompt(`Email du client "${client.client_name}" :`)
      if (!email) return
      client = { ...client, client_email: email }
    }
    setInviteLoading(client.id)
    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redirect_id: client.id, email: client.client_email })
      })
      const data = await res.json()
      if (data.invite_url) setInviteLink({ url: data.invite_url, client_name: client.client_name, email: client.client_email })
      else notify('Erreur : ' + (data.error || 'inconnue'), 'error')
    } catch (e) { notify('Erreur réseau', 'error') }
    setInviteLoading(null)
  }

  async function deleteClient(id, name) {
    if (!confirm(`Supprimer "${name}" ?`)) return
    await fetch('/api/redirects', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    fetchClients()
    fetchFinances()
  }

  function openEdit(c) {
    setEditTarget(c)
    setForm({ client_name: c.client_name, slug: c.slug, destination: c.destination, plan: c.plan, client_email: c.client_email || '' })
    setModal(true)
  }

  function openNew() {
    setEditTarget(null)
    setForm({ client_name: '', slug: '', destination: '', plan: 'Starter', client_email: '' })
    setModal(true)
  }

  function handleNameChange(val) {
    const slug = val.toLowerCase().normalize('NFD').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-')
    setForm(f => ({ ...f, client_name: val, slug }))
  }

  function copyLink(slug) {
    const url = `${window.location.origin}/c/${slug}`
    navigator.clipboard?.writeText(url)
    setCopied(slug)
    setTimeout(() => setCopied(null), 2000)
  }

  const mrr = finances?.mrr || 0
  const unreadAlerts = negativeAlerts.filter(a => a.status === 'unread').length

  // Top clients
  const topClients = [...clients]
    .sort((a, b) => (b.scans?.[0]?.count || 0) - (a.scans?.[0]?.count || 0))
    .slice(0, 3)

  if (!auth) {
    return (
      <div style={S.loginPage}>
        <Head><title>Tapvia — Admin</title></Head>
        <div style={S.loginBox}>
          <div style={S.logoMark}>tap<span style={{ color: '#7C6AF7' }}>via</span></div>
          <div style={S.loginSub}>Accès administrateur</div>
          <input style={S.input} type="password" placeholder="Mot de passe" value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && setAuth(password === ADMIN_PASSWORD)} />
          <button style={S.btnPrimary} onClick={() => {
            if (password === ADMIN_PASSWORD) setAuth(true)
            else alert('Mot de passe incorrect')
          }}>Connexion →</button>
        </div>
      </div>
    )
  }

  return (
    <div style={S.page}>
      <Head><title>Tapvia — Dashboard Admin</title></Head>

      {notification && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 200, background: notification.type === 'error' ? '#F0525220' : '#5EE8B020', border: `1px solid ${notification.type === 'error' ? '#F05252' : '#5EE8B0'}`, color: notification.type === 'error' ? '#F05252' : '#5EE8B0', padding: '12px 20px', borderRadius: 8, fontFamily: 'monospace', fontSize: 13, boxShadow: '0 4px 20px #00000040' }}>
          {notification.msg}
        </div>
      )}

      {/* Sidebar */}
      <aside style={S.sidebar}>
        <div style={S.logo}>
          <div style={S.logoMark}>tap<span style={{ color: '#7C6AF7' }}>via</span></div>
          <div style={S.logoSub}>Admin Dashboard</div>
        </div>
        <nav>
          {[
            { id: 'dashboard', label: '📊 Dashboard' },
            { id: 'clients', label: '👥 Clients' },
            { id: 'finances', label: '💰 Finances' },
            { id: 'alerts', label: `🚨 Alertes${unreadAlerts > 0 ? ` (${unreadAlerts})` : ''}` },
            { id: 'inactive', label: '💤 Inactifs' },
            { id: 'promos', label: '🎁 Promos' },
          ].map(item => (
            <div key={item.id} style={{ ...S.navItem, ...(activeSection === item.id || (activeSection === 'client-detail' && item.id === 'clients') ? S.navActive : {}) }}
              onClick={() => setActiveSection(item.id)}>
              <span style={S.navDot}></span>{item.label}
            </div>
          ))}
        </nav>
        <div style={S.sidebarBottom}>
          <div style={S.planBadge}>✦ TAPVIA ADMIN</div>
          <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#6B6880', marginTop: 6 }}>
            {clients.length} clients · {mrr}€ MRR
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={S.main}>

        {/* ===== DASHBOARD ===== */}
        {activeSection === 'dashboard' && (
          <>
            <div style={S.topbar}>
              <div>
                <div style={S.topbarTitle}>Vue d'ensemble</div>
                <div style={S.topbarSub}>{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
              </div>
              <button style={S.btnPrimary} onClick={openNew}>+ Nouveau client</button>
            </div>
            <div style={S.content}>

              {/* Métriques */}
              <div style={S.metrics}>
                {[
                  { label: 'MRR', value: `${mrr}€`, color: '#5EE8B0', sub: `ARR: ${mrr * 12}€` },
                  { label: 'Clients actifs', value: clients.length, color: '#7C6AF7', sub: `+${finances?.newThisMonth || 0} ce mois` },
                  { label: 'Alertes non lues', value: unreadAlerts, color: unreadAlerts > 0 ? '#F05252' : '#5EE8B0', sub: 'Avis négatifs' },
                  { label: 'Churn rate', value: `${finances?.churnRate || 0}%`, color: '#F0A050', sub: `LTV: ${finances?.ltv || 0}€` },
                ].map((m, i) => (
                  <div key={i} style={S.metricCard}>
                    <div style={S.metricLabel}>{m.label}</div>
                    <div style={{ ...S.metricValue, color: m.color }}>{m.value}</div>
                    <div style={S.metricSub}>{m.sub}</div>
                  </div>
                ))}
              </div>

              {/* Top clients */}
              <div style={S.card}>
                <div style={S.cardTitle}>🏆 Top clients ce mois</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {topClients.map((c, i) => (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#1A1A24', borderRadius: 8, cursor: 'pointer' }}
                      onClick={() => fetchClientDetail(c)}>
                      <div style={{ fontSize: 20, width: 32 }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{c.client_name}</div>
                        <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#6B6880' }}>{c.plan}</div>
                      </div>
                      <div style={{ fontFamily: 'monospace', fontSize: 13, color: '#7C6AF7', fontWeight: 700 }}>
                        {c.scans?.[0]?.count || 0} scans
                      </div>
                    </div>
                  ))}
                  {topClients.length === 0 && <div style={S.empty}>Aucun client encore.</div>}
                </div>
              </div>

              {/* Alertes récentes */}
              {unreadAlerts > 0 && (
                <div style={{ ...S.card, border: '1px solid #F0525230' }}>
                  <div style={{ ...S.cardTitle, color: '#F05252' }}>🚨 {unreadAlerts} avis négatif{unreadAlerts > 1 ? 's' : ''} non traité{unreadAlerts > 1 ? 's' : ''}</div>
                  {negativeAlerts.filter(a => a.status === 'unread').slice(0, 3).map(alert => (
                    <div key={alert.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #ffffff08' }}>
                      <div style={{ color: '#F0A050', fontSize: 16 }}>{'★'.repeat(alert.rating)}{'☆'.repeat(5 - alert.rating)}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{alert.client_name}</div>
                        <div style={{ fontSize: 11, color: '#6B6880' }}>{alert.review_text?.slice(0, 60)}...</div>
                      </div>
                      <button style={{ ...S.btnDanger, ...S.btnSm }} onClick={() => { setActiveSection('alerts') }}>Voir →</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ===== CLIENTS ===== */}
        {activeSection === 'clients' && (
          <>
            <div style={S.topbar}>
              <div>
                <div style={S.topbarTitle}>Clients <span style={S.pill}>{clients.length}</span></div>
                <div style={S.topbarSub}>Gestion de tous vos clients</div>
              </div>
              <button style={S.btnPrimary} onClick={openNew}>+ Nouveau client</button>
            </div>
            <div style={S.content}>
              <div style={S.tableWrap}>
                {loading ? (
                  <div style={{ padding: 40, textAlign: 'center', color: '#6B6880', fontFamily: 'monospace', fontSize: 12 }}>Chargement...</div>
                ) : clients.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: '#6B6880', fontFamily: 'monospace', fontSize: 12 }}>Aucun client.</div>
                ) : (
                  <table style={S.table}>
                    <thead>
                      <tr>{['Client', 'Lien NFC', 'Plan', 'Scans', 'Invitation', 'Paiement', 'Actions'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {clients.map(c => (
                        <tr key={c.id} style={{ ...S.tr, cursor: 'pointer' }}>
                          <td style={S.td} onClick={() => fetchClientDetail(c)}>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>{c.client_name}</div>
                            <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#6B6880', marginTop: 2 }}>{c.client_email || 'Pas d\'email'}</div>
                          </td>
                          <td style={S.td}>
                            <div style={S.linkCell} onClick={() => copyLink(c.slug)}>
                              /c/{c.slug} <span style={{ fontSize: 10, color: copied === c.slug ? '#5EE8B0' : '#6B6880' }}>{copied === c.slug ? '✓' : '⎘'}</span>
                            </div>
                          </td>
                          <td style={S.td}>
                            <select style={{ background: '#1A1A24', border: '1px solid #ffffff1a', color: '#F0EEF8', borderRadius: 4, padding: '4px 8px', fontSize: 11, cursor: 'pointer' }}
                              value={c.plan} onChange={e => changePlan(c.id, e.target.value)}>
                              <option value="Starter">Starter 19€</option>
                              <option value="Business">Business 39€</option>
                              <option value="Pro">Pro 69€</option>
                            </select>
                          </td>
                          <td style={S.td}><div style={{ fontWeight: 700 }}>{c.scans?.[0]?.count || 0}</div></td>
                          <td style={S.td}>
                            <button style={{ ...S.btnInvite, opacity: inviteLoading === c.id ? 0.6 : 1 }}
                              onClick={() => sendInvite(c)} disabled={inviteLoading === c.id}>
                              {inviteLoading === c.id ? '...' : '✉️ Inviter'}
                            </button>
                          </td>
                          <td style={S.td}>
                            <button style={{ ...S.btnStripe, opacity: stripeLoading === c.id ? 0.6 : 1 }}
                              onClick={() => sendStripeLink(c)} disabled={stripeLoading === c.id}>
                              {stripeLoading === c.id ? '...' : '💳 Paiement'}
                            </button>
                          </td>
                          <td style={S.td}>
                            <button style={{ ...S.btnGhost, ...S.btnSm, marginRight: 4 }} onClick={() => fetchClientDetail(c)}>Fiche</button>
                            <button style={{ ...S.btnGhost, ...S.btnSm, marginRight: 4 }} onClick={() => openEdit(c)}>✏️</button>
                            <button style={{ ...S.btnDanger, ...S.btnSm }} onClick={() => deleteClient(c.id, c.client_name)}>✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        )}

        {/* ===== FICHE CLIENT ===== */}
        {activeSection === 'client-detail' && selectedClient && (
          <>
            <div style={S.topbar}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button style={{ ...S.btnGhost, ...S.btnSm }} onClick={() => setActiveSection('clients')}>← Retour</button>
                <div>
                  <div style={S.topbarTitle}>{selectedClient.client_name}</div>
                  <div style={S.topbarSub}>Fiche client détaillée</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <a href={`/client`} target="_blank" style={{ ...S.btnGhost, textDecoration: 'none', fontSize: 12, padding: '8px 14px' }}>
                  👁 Voir dashboard client ↗
                </a>
                <button style={S.btnPrimary} onClick={() => sendInvite(selectedClient)}>✉️ Envoyer invitation</button>
              </div>
            </div>
            <div style={S.content}>
              {clientDetailLoading ? (
                <div style={S.empty}>Chargement de la fiche...</div>
              ) : clientDetail ? (
                <>
                  {/* Infos principales */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={S.card}>
                      <div style={S.cardTitle}>Informations</div>
                      {[
                        { label: 'Email', value: clientDetail.client?.client_email || '—' },
                        { label: 'Plan', value: clientDetail.client?.plan },
                        { label: 'Lien NFC', value: `/c/${clientDetail.client?.slug}` },
                        { label: 'Compte activé', value: clientDetail.user?.invite_accepted ? '✅ Oui' : '❌ Non' },
                        { label: 'Dernière connexion', value: clientDetail.user?.last_login ? new Date(clientDetail.user.last_login).toLocaleDateString('fr-FR') : 'Jamais' },
                        { label: 'Client depuis', value: clientDetail.client?.created_at ? new Date(clientDetail.client.created_at).toLocaleDateString('fr-FR') : '—' },
                      ].map((row, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #ffffff08', fontSize: 13 }}>
                          <span style={{ color: '#6B6880' }}>{row.label}</span>
                          <span style={{ fontWeight: 600 }}>{row.value}</span>
                        </div>
                      ))}
                      <div style={{ marginTop: 12 }}>
                        <div style={{ fontSize: 11, color: '#6B6880', marginBottom: 6, fontFamily: 'monospace', textTransform: 'uppercase' }}>Changer de plan</div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {['Starter', 'Business', 'Pro'].map(plan => (
                            <button key={plan} onClick={() => changePlan(selectedClient.id, plan)}
                              style={{ ...S.btnGhost, ...S.btnSm, flex: 1, background: clientDetail.client?.plan === plan ? '#7C6AF720' : 'transparent', border: clientDetail.client?.plan === plan ? '1px solid #7C6AF7' : '1px solid #ffffff1a', color: clientDetail.client?.plan === plan ? '#7C6AF7' : '#6B6880' }}>
                              {plan}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div style={S.card}>
                      <div style={S.cardTitle}>Performances</div>
                      {[
                        { label: 'Scans ce mois', value: clientDetail.scansThisMonth, color: '#7C6AF7' },
                        { label: 'Scans mois dernier', value: clientDetail.scansLastMonth, color: '#6B6880' },
                        { label: 'Évolution', value: `${clientDetail.scansDelta >= 0 ? '+' : ''}${clientDetail.scansDelta}%`, color: clientDetail.scansDelta >= 0 ? '#5EE8B0' : '#F05252' },
                        { label: 'Note Google', value: clientDetail.client?.avg_rating > 0 ? `${clientDetail.client.avg_rating}★` : '—', color: '#F0A050' },
                        { label: 'Avis total', value: clientDetail.client?.total_reviews || 0, color: '#5EE8B0' },
                        { label: 'Risque churn', value: `${clientDetail.client?.churn_risk || 0}/100`, color: clientDetail.client?.churn_risk > 60 ? '#F05252' : clientDetail.client?.churn_risk > 30 ? '#F0A050' : '#5EE8B0' },
                      ].map((row, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #ffffff08', fontSize: 13 }}>
                          <span style={{ color: '#6B6880' }}>{row.label}</span>
                          <span style={{ fontWeight: 700, color: row.color }}>{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Notes CRM */}
                  <div style={S.card}>
                    <div style={S.cardTitle}>📝 Notes CRM</div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                      <input
                        style={{ ...S.input, flex: 1 }}
                        placeholder="Ajoute une note sur ce client..."
                        value={newNote}
                        onChange={e => setNewNote(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addNote()}
                      />
                      <button style={S.btnPrimary} onClick={addNote}>Ajouter</button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {clientDetail.notes?.length === 0 && (
                        <div style={S.empty}>Aucune note pour ce client.</div>
                      )}
                      {clientDetail.notes?.map(note => (
                        <div key={note.id} style={{ display: 'flex', gap: 10, padding: '10px 14px', background: '#1A1A24', borderRadius: 8, alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, color: '#F0EEF8', lineHeight: 1.5 }}>{note.content}</div>
                            <div style={{ fontSize: 10, color: '#6B6880', marginTop: 4, fontFamily: 'monospace' }}>
                              {new Date(note.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                          <button style={{ background: 'transparent', border: 'none', color: '#6B6880', cursor: 'pointer', fontSize: 12 }} onClick={() => deleteNote(note.id)}>✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </>
        )}

        {/* ===== FINANCES ===== */}
        {activeSection === 'finances' && (
          <>
            <div style={S.topbar}>
              <div>
                <div style={S.topbarTitle}>Finances</div>
                <div style={S.topbarSub}>MRR, ARR, churn et projections</div>
              </div>
            </div>
            <div style={S.content}>
              {/* Métriques principales */}
              <div style={S.metrics}>
                {[
                  { label: 'MRR', value: `${finances?.mrr || 0}€`, color: '#5EE8B0', sub: `${finances?.mrrGrowth >= 0 ? '+' : ''}${finances?.mrrGrowth || 0}% vs mois dernier` },
                  { label: 'ARR', value: `${finances?.arr || 0}€`, color: '#7C6AF7', sub: 'Revenu annuel récurrent' },
                  { label: 'Churn rate', value: `${finances?.churnRate || 0}%`, color: finances?.churnRate > 5 ? '#F05252' : '#5EE8B0', sub: `${finances?.churned || 0} client(s) perdu(s)` },
                  { label: 'LTV estimée', value: `${finances?.ltv || 0}€`, color: '#F0A050', sub: 'Valeur vie client' },
                ].map((m, i) => (
                  <div key={i} style={S.metricCard}>
                    <div style={S.metricLabel}>{m.label}</div>
                    <div style={{ ...S.metricValue, color: m.color }}>{m.value}</div>
                    <div style={S.metricSub}>{m.sub}</div>
                  </div>
                ))}
              </div>

              {/* Répartition par plan */}
              <div style={S.card}>
                <div style={S.cardTitle}>Répartition par plan</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[
                    { plan: 'Starter', color: '#6B6880', price: 19 },
                    { plan: 'Business', color: '#7C6AF7', price: 39 },
                    { plan: 'Pro', color: '#5EE8B0', price: 69 },
                  ].map(({ plan, color, price }) => {
                    const data = finances?.byPlan?.[plan]
                    const pct = clients.length > 0 ? Math.round(((data?.count || 0) / clients.length) * 100) : 0
                    return (
                      <div key={plan}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                          <span style={{ fontWeight: 600, color }}>{plan} — {price}€/mois</span>
                          <span style={{ fontFamily: 'monospace', color: '#6B6880' }}>{data?.count || 0} clients · {data?.mrr || 0}€ MRR ({pct}%)</span>
                        </div>
                        <div style={{ height: 8, background: '#1A1A24', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4 }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Projections */}
              <div style={S.card}>
                <div style={S.cardTitle}>📈 Projections</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                  {[
                    { label: 'Dans 3 mois', value: Math.round((finances?.mrr || 0) * Math.pow(1 + (finances?.mrrGrowth || 5) / 100, 3)) },
                    { label: 'Dans 6 mois', value: Math.round((finances?.mrr || 0) * Math.pow(1 + (finances?.mrrGrowth || 5) / 100, 6)) },
                    { label: 'Dans 12 mois', value: Math.round((finances?.mrr || 0) * Math.pow(1 + (finances?.mrrGrowth || 5) / 100, 12)) },
                  ].map((proj, i) => (
                    <div key={i} style={{ background: '#1A1A24', borderRadius: 8, padding: '16px', textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: '#6B6880', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>{proj.label}</div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: '#5EE8B0' }}>{proj.value}€</div>
                      <div style={{ fontSize: 11, color: '#6B6880', marginTop: 4 }}>MRR estimé</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: '#6B6880', marginTop: 12, fontFamily: 'monospace' }}>
                  * Projections basées sur le taux de croissance actuel de {finances?.mrrGrowth || 0}%/mois
                </div>
              </div>
            </div>
          </>
        )}

        {/* ===== ALERTES ===== */}
        {activeSection === 'alerts' && (
          <>
            <div style={S.topbar}>
              <div>
                <div style={S.topbarTitle}>🚨 Alertes avis négatifs</div>
                <div style={S.topbarSub}>{unreadAlerts} non traité{unreadAlerts > 1 ? 's' : ''} · {negativeAlerts.length} au total</div>
              </div>
              <button style={S.btnGhost} onClick={fetchNegativeAlerts}>↺ Actualiser</button>
            </div>
            <div style={S.content}>
              {negativeAlerts.length === 0 ? (
                <div style={{ ...S.card, textAlign: 'center' }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
                  <div style={{ color: '#5EE8B0', fontWeight: 700 }}>Aucun avis négatif !</div>
                  <div style={{ color: '#6B6880', fontSize: 12, marginTop: 6 }}>Les alertes apparaissent automatiquement quand un client reçoit un avis ≤ 2★</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {/* Filtres */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                    {['Tous', 'Non traités', 'En cours', 'Résolus'].map(filter => (
                      <button key={filter} style={{ ...S.btnGhost, ...S.btnSm }}>{filter}</button>
                    ))}
                  </div>

                  {negativeAlerts.map(alert => (
                    <div key={alert.id} style={{
                      ...S.card,
                      borderLeft: `3px solid ${alert.status === 'resolved' ? '#5EE8B0' : alert.status === 'in_progress' ? '#F0A050' : '#F05252'}`,
                      opacity: alert.status === 'resolved' ? 0.7 : 1,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{alert.client_name}</div>
                          <div style={{ color: '#F0A050', fontSize: 16, marginTop: 2 }}>{'★'.repeat(alert.rating)}{'☆'.repeat(5 - alert.rating)}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{
                            fontFamily: 'monospace', fontSize: 10, padding: '3px 8px', borderRadius: 4,
                            background: alert.status === 'resolved' ? '#5EE8B020' : alert.status === 'in_progress' ? '#F0A05020' : '#F0525220',
                            color: alert.status === 'resolved' ? '#5EE8B0' : alert.status === 'in_progress' ? '#F0A050' : '#F05252',
                          }}>
                            {alert.status === 'resolved' ? '✓ Résolu' : alert.status === 'in_progress' ? '⏳ En cours' : '⚠️ Non traité'}
                          </span>
                          <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#6B6880' }}>
                            {new Date(alert.created_at).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      </div>

                      {alert.review_text && (
                        <div style={{ fontSize: 13, color: '#C8C4D8', lineHeight: 1.6, background: '#1A1A24', padding: '10px 12px', borderRadius: 6, marginBottom: 10 }}>
                          "{alert.review_text}"
                          {alert.author && <div style={{ fontSize: 11, color: '#6B6880', marginTop: 4 }}>— {alert.author}</div>}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: 6 }}>
                        {alert.status !== 'in_progress' && alert.status !== 'resolved' && (
                          <button style={{ ...S.btnGhost, ...S.btnSm }} onClick={() => updateAlertStatus(alert.id, 'in_progress')}>
                            ⏳ En cours
                          </button>
                        )}
                        {alert.status !== 'resolved' && (
                          <button style={{ ...S.btnGhost, ...S.btnSm, color: '#5EE8B0', borderColor: '#5EE8B030' }} onClick={() => updateAlertStatus(alert.id, 'resolved')}>
                            ✓ Résolu
                          </button>
                        )}
                        {alert.status === 'resolved' && (
                          <button style={{ ...S.btnGhost, ...S.btnSm }} onClick={() => updateAlertStatus(alert.id, 'unread')}>
                            ↺ Rouvrir
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ===== CLIENTS INACTIFS ===== */}
        {activeSection === 'inactive' && (
          <>
            <div style={S.topbar}>
              <div>
                <div style={S.topbarTitle}>💤 Clients inactifs</div>
                <div style={S.topbarSub}>{inactiveClients.length} client{inactiveClients.length > 1 ? 's' : ''} sans scan depuis {inactiveDays} jours</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[7, 14, 30].map(d => (
                  <button key={d} style={{ ...S.btnGhost, ...S.btnSm, ...(inactiveDays === d ? { background: '#7C6AF720', color: '#7C6AF7', borderColor: '#7C6AF7' } : {}) }}
                    onClick={() => setInactiveDays(d)}>{d} jours</button>
                ))}
              </div>
            </div>
            <div style={S.content}>
              {inactiveClients.length === 0 ? (
                <div style={{ ...S.card, textAlign: 'center' }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>🎉</div>
                  <div style={{ color: '#5EE8B0', fontWeight: 700 }}>Tous vos clients sont actifs !</div>
                  <div style={{ color: '#6B6880', fontSize: 12, marginTop: 6 }}>Aucun client inactif depuis {inactiveDays} jours.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {inactiveClients.map(client => (
                    <div key={client.id} style={{
                      ...S.card,
                      borderLeft: `3px solid ${client.urgency === 'critical' ? '#F05252' : client.urgency === 'high' ? '#F0A050' : '#F0A050'}`,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{client.client_name}</div>
                          <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#6B6880', marginTop: 2 }}>
                            {client.never_scanned
                              ? '🔴 Jamais scanné'
                              : `Dernier scan il y a ${client.days_inactive} jour${client.days_inactive > 1 ? 's' : ''}`}
                          </div>
                          <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#6B6880', marginTop: 2 }}>
                            Plan {client.plan} · {client.client_email || 'Pas d\'email'}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button style={{ ...S.btnInvite, fontSize: 11 }} onClick={() => sendInvite(client)}>
                            ✉️ Relancer
                          </button>
                          <button style={{ ...S.btnGhost, ...S.btnSm }} onClick={() => fetchClientDetail(client)}>
                            Fiche →
                          </button>
                        </div>
                      </div>

                      {/* Suggestion de relance */}
                      <div style={{ background: '#1A1A24', borderRadius: 6, padding: '8px 12px', marginTop: 10, fontSize: 12, color: '#6B6880' }}>
                        💡 {client.never_scanned
                          ? 'Ce client n\'a jamais utilisé sa carte. Vérifie que la carte NFC est bien encodée et envoyée.'
                          : client.days_inactive > 30
                          ? 'Inactif depuis plus d\'un mois. Propose un appel ou offre 1 mois gratuit pour le réengager.'
                          : 'Envoie un email de rappel avec ses statistiques récentes pour le remotiver.'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* ===== PROMOS ===== */}
      {activeSection === 'promos' && (
        <>
          <div style={S.topbar}>
            <div>
              <div style={S.topbarTitle}>🎁 Promos & Coupons</div>
              <div style={S.topbarSub}>{promos.length} promo{promos.length > 1 ? 's' : ''} créée{promos.length > 1 ? 's' : ''}</div>
            </div>
            <button style={S.btnPrimary} onClick={() => { setPromoTarget(null); setPromoResult(null); setPromoModal(true) }}>+ Nouvelle promo</button>
          </div>
          <div style={S.content}>
            {/* Sélecteur client rapide */}
            <div style={S.card}>
              <div style={S.cardTitle}>Créer une promo pour un client</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
                {clients.map(c => (
                  <div key={c.id} style={{ background: '#1A1A24', borderRadius: 8, padding: '12px 14px', cursor: 'pointer', border: promoTarget?.id === c.id ? '1px solid #7C6AF7' : '1px solid transparent' }}
                    onClick={() => { setPromoTarget(c); setPromoResult(null); setPromoModal(true) }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{c.client_name}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#6B6880', marginTop: 2 }}>{c.plan} · {c.client_email || 'Pas d'email'}</div>
                  </div>
                ))}
                {clients.length === 0 && <div style={S.empty}>Aucun client.</div>}
              </div>
            </div>

            {/* Liste des promos */}
            <div style={S.card}>
              <div style={S.cardTitle}>Historique des promos</div>
              {promos.length === 0 ? (
                <div style={S.empty}>Aucune promo créée.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {promos.map(promo => (
                    <div key={promo.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: '#1A1A24', borderRadius: 8, border: `1px solid ${promo.status === 'active' ? '#7C6AF730' : '#ffffff08'}` }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{promo.client_name}</div>
                        <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#6B6880', marginTop: 3 }}>
                          {promo.type === 'trial'
                            ? `🎁 Essai gratuit ${promo.value} jours`
                            : promo.value
                            ? `💸 -${promo.value}% de réduction`
                            : `💸 -${promo.amount_off}€ de réduction`}
                          {promo.code && <span style={{ marginLeft: 8, background: '#7C6AF720', color: '#7C6AF7', padding: '1px 6px', borderRadius: 4 }}>Code: {promo.code}</span>}
                        </div>
                        {promo.expires_at && (
                          <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#6B6880', marginTop: 2 }}>
                            Expire le {new Date(promo.expires_at).toLocaleDateString('fr-FR')}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 10, padding: '3px 8px', borderRadius: 4, background: promo.status === 'active' ? '#5EE8B020' : '#F0525215', color: promo.status === 'active' ? '#5EE8B0' : '#F05252' }}>
                          {promo.status === 'active' ? '✓ Active' : '✕ Inactive'}
                        </span>
                        {promo.status === 'active' ? (
                          <button style={{ ...S.btnDanger, ...S.btnSm }} onClick={() => updatePromoStatus(promo.id, 'expired')}>Désactiver</button>
                        ) : (
                          <button style={{ ...S.btnGhost, ...S.btnSm }} onClick={() => updatePromoStatus(promo.id, 'active')}>Réactiver</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Modal création promo */}
      {promoModal && (
        <div style={S.overlay} onClick={e => e.target === e.currentTarget && setPromoModal(false)}>
          <div style={S.modal}>
            <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 8 }}>🎁</div>
            <div style={S.modalTitle}>
              {promoTarget ? `Promo pour ${promoTarget.client_name}` : 'Nouvelle promo'}
            </div>

            {!promoTarget && (
              <>
                <label style={S.formLabel}>Client</label>
                <select style={S.input} onChange={e => setPromoTarget(clients.find(c => c.id === e.target.value))}>
                  <option value="">Sélectionne un client</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.client_name}</option>)}
                </select>
              </>
            )}

            {!promoResult ? (
              <>
                <label style={S.formLabel}>Type de promo</label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                  {[
                    { id: 'trial', label: '🎁 Essai gratuit' },
                    { id: 'discount', label: '💸 Réduction' },
                  ].map(t => (
                    <button key={t.id} onClick={() => setPromoForm(f => ({ ...f, type: t.id }))}
                      style={{ ...S.btnGhost, flex: 1, ...(promoForm.type === t.id ? { background: '#7C6AF720', color: '#7C6AF7', borderColor: '#7C6AF7' } : {}) }}>
                      {t.label}
                    </button>
                  ))}
                </div>

                {promoForm.type === 'trial' && (
                  <>
                    <label style={S.formLabel}>Durée de l'essai</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[7, 14, 30].map(d => (
                        <button key={d} onClick={() => setPromoForm(f => ({ ...f, value: d }))}
                          style={{ ...S.btnGhost, ...S.btnSm, flex: 1, ...(promoForm.value === d ? { background: '#7C6AF720', color: '#7C6AF7', borderColor: '#7C6AF7' } : {}) }}>
                          {d} jours
                        </button>
                      ))}
                    </div>
                    <div style={{ fontSize: 12, color: '#6B6880', marginTop: 8, fontFamily: 'monospace' }}>
                      Le client aura accès au service gratuitement pendant {promoForm.value} jours.
                    </div>
                  </>
                )}

                {promoForm.type === 'discount' && (
                  <>
                    <label style={S.formLabel}>Réduction en % (ex: 50 = 50%)</label>
                    <input style={S.input} type="number" placeholder="ex: 50" min="1" max="100"
                      value={promoForm.value} onChange={e => setPromoForm(f => ({ ...f, value: e.target.value, amount_off: '' }))} />
                    <div style={{ textAlign: 'center', color: '#6B6880', fontSize: 12, margin: '4px 0' }}>— ou —</div>
                    <label style={S.formLabel}>Réduction en € (ex: 10 = 10€ de réduction)</label>
                    <input style={S.input} type="number" placeholder="ex: 10" min="1"
                      value={promoForm.amount_off} onChange={e => setPromoForm(f => ({ ...f, amount_off: e.target.value, value: '' }))} />
                    <label style={S.formLabel}>Expire dans (jours) — optionnel</label>
                    <input style={S.input} type="number" placeholder="ex: 30" min="1"
                      value={promoForm.expires_in_days} onChange={e => setPromoForm(f => ({ ...f, expires_in_days: e.target.value }))} />
                    <div style={{ fontSize: 12, color: '#6B6880', marginTop: 4, fontFamily: 'monospace' }}>
                      Un code promo unique sera généré et utilisable une seule fois.
                    </div>
                  </>
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <button style={S.btnGhost} onClick={() => setPromoModal(false)}>Annuler</button>
                  <button style={{ ...S.btnPrimary, flex: 1, opacity: promoLoading ? 0.6 : 1 }}
                    onClick={() => promoTarget && createPromo(promoTarget)}
                    disabled={promoLoading || !promoTarget}>
                    {promoLoading ? 'Création...' : 'Créer la promo →'}
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Résultat de la promo créée */}
                <div style={{ background: '#5EE8B010', border: '1px solid #5EE8B030', borderRadius: 8, padding: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>✅</div>
                  <div style={{ fontWeight: 700, color: '#5EE8B0', marginBottom: 12 }}>Promo créée avec succès !</div>

                  {promoResult.type === 'trial' && (
                    <div style={{ fontSize: 13, color: '#F0EEF8', lineHeight: 1.8 }}>
                      <div>🎁 <strong>{promoResult.value} jours d'essai gratuit</strong></div>
                      <div style={{ fontSize: 11, color: '#6B6880', marginTop: 4 }}>
                        Expire le {new Date(promoResult.expires_at).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                  )}

                  {promoResult.type === 'discount' && promoResult.code && (
                    <div>
                      <div style={{ fontSize: 13, color: '#F0EEF8', marginBottom: 10 }}>
                        {promoResult.value ? `💸 -${promoResult.value}% de réduction` : `💸 -${promoResult.amount_off}€ de réduction`}
                      </div>
                      <div style={{ background: '#0A0A0F', border: '1px solid #7C6AF740', borderRadius: 8, padding: '12px', fontFamily: 'monospace', fontSize: 18, fontWeight: 800, color: '#7C6AF7', letterSpacing: 2, userSelect: 'all', cursor: 'text' }}>
                        {promoResult.code}
                      </div>
                      <div style={{ fontSize: 11, color: '#6B6880', marginTop: 8 }}>
                        Envoie ce code au client — il le saisit lors du paiement Stripe
                      </div>
                    </div>
                  )}
                </div>

                <button style={{ ...S.btnPrimary, marginTop: 12 }} onClick={() => { setPromoModal(false); setPromoResult(null); setPromoTarget(null) }}>
                  Fermer
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal nouveau/modifier client */}
      {modal && (
        <div style={S.overlay} onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div style={S.modal}>
            <div style={S.modalTitle}>{editTarget ? 'Modifier le client' : '+ Nouveau client'}</div>
            {!editTarget && (
              <>
                <label style={S.formLabel}>Nom du client *</label>
                <input style={S.input} placeholder="ex: Pizza Bella" value={form.client_name} onChange={e => handleNameChange(e.target.value)} />
                <label style={S.formLabel}>Slug (URL) *</label>
                <input style={S.input} placeholder="pizza-bella" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} />
                <div style={S.slugPreview}>Lien NFC → <span style={{ color: '#7C6AF7' }}>{typeof window !== 'undefined' ? window.location.origin : ''}/c/{form.slug || '...'}</span></div>
              </>
            )}
            <label style={S.formLabel}>Lien Google Reviews *</label>
            <input style={S.input} placeholder="https://search.google.com/local/writereview?placeid=..." value={form.destination} onChange={e => setForm(f => ({ ...f, destination: e.target.value }))} />
            <label style={S.formLabel}>Email du client</label>
            <input style={S.input} placeholder="contact@client.fr" value={form.client_email} onChange={e => setForm(f => ({ ...f, client_email: e.target.value }))} />
            <label style={S.formLabel}>Plan</label>
            <select style={S.input} value={form.plan} onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}>
              <option value="Starter">Starter — 19€/mois</option>
              <option value="Business">Business — 39€/mois</option>
              <option value="Pro">Pro — 69€/mois</option>
            </select>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button style={S.btnGhost} onClick={() => setModal(false)}>Annuler</button>
              <button style={S.btnPrimary} onClick={saveClient}>{editTarget ? 'Enregistrer →' : 'Créer →'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal invitation */}
      {inviteLink && (
        <div style={S.overlay} onClick={e => e.target === e.currentTarget && setInviteLink(null)}>
          <div style={S.modal}>
            <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 8 }}>✉️</div>
            <div style={S.modalTitle}>Lien d'invitation — {inviteLink.client_name}</div>
            <div style={{ fontSize: 12, color: '#6B6880', marginBottom: 12 }}>Envoie ce lien à <strong style={{ color: '#F0EEF8' }}>{inviteLink.email}</strong>. Valable <strong style={{ color: '#F0A050' }}>7 jours</strong>.</div>
            <div style={{ background: '#0A0A0F', border: '1px solid #5EE8B040', borderRadius: 8, padding: '12px 14px', fontFamily: 'monospace', fontSize: 11, color: '#5EE8B0', wordBreak: 'break-all', userSelect: 'all', cursor: 'text', marginBottom: 8 }}
              onClick={e => { const r = document.createRange(); r.selectNodeContents(e.currentTarget); window.getSelection().removeAllRanges(); window.getSelection().addRange(r) }}>
              {inviteLink.url}
            </div>
            <div style={{ fontSize: 11, color: '#6B6880', marginBottom: 12, fontFamily: 'monospace' }}>💡 Clique pour sélectionner, puis Ctrl+C pour copier</div>
            <div style={{ background: '#1A1A24', borderRadius: 8, padding: '12px', marginBottom: 14 }}>
              <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#6B6880', textTransform: 'uppercase', marginBottom: 8 }}>📱 Message WhatsApp prêt à copier</div>
              <div style={{ fontSize: 12, color: '#F0EEF8', lineHeight: 1.6, userSelect: 'all', cursor: 'text' }}
                onClick={e => { const r = document.createRange(); r.selectNodeContents(e.currentTarget); window.getSelection().removeAllRanges(); window.getSelection().addRange(r) }}>
                {`Bonjour ! 👋\n\nVoici votre accès à votre dashboard Tapvia pour suivre vos avis Google en temps réel.\n\n🔗 Activez votre compte (valable 7 jours) :\n${inviteLink.url}\n\nÀ bientôt ! 🚀`}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <a href={inviteLink.url} target="_blank" rel="noopener noreferrer" style={{ ...S.btnPrimary, textDecoration: 'none', flex: 1, textAlign: 'center', background: '#5EE8B0', color: '#0A0A0F' }}>Tester ↗</a>
              <button style={{ ...S.btnGhost, flex: 1 }} onClick={() => setInviteLink(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Stripe */}
      {stripeLink && (
        <div style={S.overlay} onClick={e => e.target === e.currentTarget && setStripeLink(null)}>
          <div style={S.modal}>
            <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 8 }}>💳</div>
            <div style={S.modalTitle}>Lien de paiement — {stripeLink.client_name}</div>
            <div style={{ background: '#0A0A0F', border: '1px solid #7C6AF740', borderRadius: 8, padding: '12px 14px', fontFamily: 'monospace', fontSize: 11, color: '#7C6AF7', wordBreak: 'break-all', userSelect: 'all', cursor: 'text', marginBottom: 14 }}
              onClick={e => { const r = document.createRange(); r.selectNodeContents(e.currentTarget); window.getSelection().removeAllRanges(); window.getSelection().addRange(r) }}>
              {stripeLink.url}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <a href={stripeLink.url} target="_blank" rel="noopener noreferrer" style={{ ...S.btnPrimary, textDecoration: 'none', flex: 1, textAlign: 'center' }}>Ouvrir ↗</a>
              <button style={{ ...S.btnGhost, flex: 1 }} onClick={() => setStripeLink(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const S = {
  page: { display: 'grid', gridTemplateColumns: '220px 1fr', minHeight: '100vh', background: '#0A0A0F', color: '#F0EEF8', fontFamily: 'system-ui, sans-serif' },
  loginPage: { minHeight: '100vh', background: '#0A0A0F', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  loginBox: { background: '#111118', border: '1px solid #ffffff0f', borderRadius: 12, padding: 36, width: 340, display: 'flex', flexDirection: 'column', gap: 12 },
  sidebar: { background: '#111118', borderRight: '1px solid #ffffff0f', padding: '24px 0', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh' },
  logo: { padding: '0 20px 24px', borderBottom: '1px solid #ffffff0f', marginBottom: 16 },
  logoMark: { fontSize: 18, fontWeight: 800 },
  logoSub: { fontFamily: 'monospace', fontSize: 10, color: '#6B6880', marginTop: 2 },
  navItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', cursor: 'pointer', color: '#6B6880', fontSize: 13, fontWeight: 600, borderLeft: '2px solid transparent', transition: 'all .1s' },
  navActive: { color: '#F0EEF8', borderLeftColor: '#7C6AF7', background: '#7C6AF710' },
  navDot: { width: 6, height: 6, borderRadius: '50%', background: 'currentColor', opacity: 0.5, flexShrink: 0 },
  sidebarBottom: { marginTop: 'auto', padding: '16px 20px', borderTop: '1px solid #ffffff0f' },
  planBadge: { background: '#7C6AF720', border: '1px solid #7C6AF740', color: '#7C6AF7', fontFamily: 'monospace', fontSize: 10, padding: '4px 8px', borderRadius: 4, display: 'inline-block' },
  main: { overflow: 'auto' },
  topbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 28px', borderBottom: '1px solid #ffffff0f', position: 'sticky', top: 0, background: '#0A0A0F', zIndex: 10 },
  topbarTitle: { fontSize: 16, fontWeight: 700 },
  topbarSub: { fontFamily: 'monospace', fontSize: 11, color: '#6B6880', marginTop: 2 },
  content: { padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 },
  metrics: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 },
  metricCard: { background: '#111118', border: '1px solid #ffffff0f', borderRadius: 10, padding: '16px 18px' },
  metricLabel: { fontFamily: 'monospace', fontSize: 10, color: '#6B6880', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  metricValue: { fontSize: 28, fontWeight: 800, letterSpacing: -1, lineHeight: 1 },
  metricSub: { fontSize: 11, color: '#6B6880', marginTop: 6 },
  card: { background: '#111118', border: '1px solid #ffffff0f', borderRadius: 10, padding: '20px 24px' },
  cardTitle: { fontSize: 13, fontWeight: 700, marginBottom: 14 },
  pill: { fontFamily: 'monospace', fontSize: 10, padding: '2px 7px', borderRadius: 20, background: '#1A1A24', color: '#6B6880' },
  tableWrap: { background: '#111118', border: '1px solid #ffffff0f', borderRadius: 10, overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { fontFamily: 'monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, color: '#6B6880', padding: '10px 16px', textAlign: 'left', borderBottom: '1px solid #ffffff0f' },
  tr: { borderBottom: '1px solid #ffffff08' },
  td: { padding: '12px 16px', verticalAlign: 'middle', fontSize: 13 },
  linkCell: { fontFamily: 'monospace', fontSize: 11, color: '#7C6AF7', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 },
  empty: { color: '#6B6880', fontFamily: 'monospace', fontSize: 12, textAlign: 'center', padding: 32 },
  btnPrimary: { background: '#7C6AF7', color: '#fff', border: 'none', borderRadius: 6, padding: '9px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  btnGhost: { background: 'transparent', color: '#6B6880', border: '1px solid #ffffff1a', borderRadius: 6, padding: '8px 14px', cursor: 'pointer', fontSize: 13 },
  btnDanger: { background: '#F0525215', color: '#F05252', border: '1px solid #F0525230', borderRadius: 6, padding: '8px 10px', cursor: 'pointer', fontSize: 12 },
  btnStripe: { background: '#7C6AF720', color: '#7C6AF7', border: '1px solid #7C6AF740', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 11, fontWeight: 600 },
  btnInvite: { background: '#5EE8B015', color: '#5EE8B0', border: '1px solid #5EE8B030', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 11, fontWeight: 600 },
  btnSm: { padding: '5px 10px', fontSize: 12 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: '#111118', border: '1px solid #ffffff1a', borderRadius: 12, padding: 28, width: 460, maxWidth: '95vw', display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '90vh', overflowY: 'auto' },
  modalTitle: { fontSize: 16, fontWeight: 800, marginBottom: 10 },
  formLabel: { fontFamily: 'monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, color: '#6B6880', display: 'block', marginBottom: 4, marginTop: 4 },
  input: { width: '100%', background: '#0A0A0F', border: '1px solid #ffffff1a', borderRadius: 6, color: '#F0EEF8', fontFamily: 'monospace', fontSize: 12, padding: '10px 12px', outline: 'none' },
  slugPreview: { fontFamily: 'monospace', fontSize: 11, color: '#6B6880', marginTop: 4 },
}
