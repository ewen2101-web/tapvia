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
  const [notification, setNotification] = useState(null)
  const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123'

  useEffect(() => { if (auth) fetchClients() }, [auth])

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

  async function saveClient() {
    if (!form.client_name || !form.slug || !form.destination) {
      alert('Remplis tous les champs obligatoires.')
      return
    }
    if (editTarget) {
      await fetch('/api/redirects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editTarget.id, destination: form.destination, plan: form.plan, active: true })
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
  }

  async function sendStripeLink(client) {
    if (!client.client_email) {
      const email = prompt(`Email du client "${client.client_name}" pour envoyer le lien de paiement :`)
      if (!email) return
      client = { ...client, client_email: email }
    }
    setStripeLoading(client.id)
    try {
      const res = await fetch('/api/stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: client.client_name,
          client_email: client.client_email,
          plan: client.plan,
        })
      })
      const data = await res.json()
      if (data.url) {
        navigator.clipboard?.writeText(data.url)
        notify(`Lien Stripe copié ! Envoie-le à ${client.client_name} 📋`)
      } else {
        notify('Erreur : ' + (data.error || 'inconnue'), 'error')
      }
    } catch (e) {
      notify('Erreur réseau', 'error')
    }
    setStripeLoading(null)
  }

  async function deleteClient(id, name) {
    if (!confirm(`Supprimer "${name}" ?`)) return
    await fetch('/api/redirects', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    fetchClients()
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

  const totalScans = clients.reduce((acc, c) => acc + (c.scans?.[0]?.count || 0), 0)
  const mrr = clients.reduce((acc, c) => acc + (PLAN_MRR[c.plan] || 0), 0)

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
      <Head><title>Tapvia — Dashboard</title></Head>

      {/* Notification */}
      {notification && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 200,
          background: notification.type === 'error' ? '#F0525220' : '#5EE8B020',
          border: `1px solid ${notification.type === 'error' ? '#F05252' : '#5EE8B0'}`,
          color: notification.type === 'error' ? '#F05252' : '#5EE8B0',
          padding: '12px 20px', borderRadius: 8, fontFamily: 'monospace', fontSize: 13,
          boxShadow: '0 4px 20px #00000040'
        }}>
          {notification.msg}
        </div>
      )}

      {/* Sidebar */}
      <aside style={S.sidebar}>
        <div style={S.logo}>
          <div style={S.logoMark}>tap<span style={{ color: '#7C6AF7' }}>via</span></div>
          <div style={S.logoSub}>NFC Review Platform</div>
        </div>
        <nav>
          {['Dashboard', 'Clients', 'Paiements', 'Paramètres'].map(item => (
            <div key={item} style={{ ...S.navItem, ...(item === 'Dashboard' ? S.navActive : {}) }}>
              <span style={S.navDot}></span>{item}
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
        <div style={S.topbar}>
          <div>
            <div style={S.topbarTitle}>Vue d'ensemble</div>
            <div style={S.topbarSub}>{new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })} · {clients.length} clients</div>
          </div>
          <button style={S.btnPrimary} onClick={openNew}>+ Nouveau client</button>
        </div>

        <div style={S.content}>
          {/* Métriques */}
          <div style={S.metrics}>
            {[
              { label: 'Total scans', value: totalScans.toLocaleString('fr'), color: '#7C6AF7' },
              { label: 'Clients actifs', value: clients.length, color: '#5EE8B0' },
              { label: 'MRR', value: `${mrr}€`, color: '#5EE8B0' },
              { label: 'Revenu annuel', value: `${mrr * 12}€`, color: '#7C6AF7' },
            ].map(m => (
              <div key={m.label} style={S.metricCard}>
                <div style={S.metricLabel}>{m.label}</div>
                <div style={{ ...S.metricValue, color: m.color }}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* Table clients */}
          <div>
            <div style={S.sectionHead}>
              <div style={S.sectionTitle}>Clients <span style={S.pill}>{clients.length}</span></div>
            </div>
            <div style={S.tableWrap}>
              {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#6B6880', fontFamily: 'monospace', fontSize: 12 }}>Chargement...</div>
              ) : clients.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#6B6880', fontFamily: 'monospace', fontSize: 12 }}>Aucun client. Crée ton premier lien →</div>
              ) : (
                <table style={S.table}>
                  <thead>
                    <tr>
                      {['Client', 'Lien NFC', 'Plan', 'Scans', 'Paiement', ''].map(h => (
                        <th key={h} style={S.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map(c => (
                      <tr key={c.id} style={S.tr}>
                        <td style={S.td}>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{c.client_name}</div>
                          <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#6B6880', marginTop: 2 }}>
                            {c.client_email || 'Pas d\'email'}
                          </div>
                        </td>
                        <td style={S.td}>
                          <div style={S.linkCell} onClick={() => copyLink(c.slug)} title="Copier le lien NFC">
                            /c/{c.slug}
                            <span style={{ fontSize: 10, color: copied === c.slug ? '#5EE8B0' : '#6B6880' }}>
                              {copied === c.slug ? ' ✓' : ' ⎘'}
                            </span>
                          </div>
                        </td>
                        <td style={S.td}>
                          <span style={{ fontFamily: 'monospace', fontSize: 11, color: c.plan === 'Pro' ? '#5EE8B0' : c.plan === 'Business' ? '#7C6AF7' : '#6B6880' }}>
                            {c.plan} · {PLAN_MRR[c.plan]}€/mois
                          </span>
                        </td>
                        <td style={S.td}>
                          <div style={{ fontWeight: 700 }}>{c.scans?.[0]?.count || 0}</div>
                        </td>
                        <td style={S.td}>
                          <button
                            style={{ ...S.btnStripe, opacity: stripeLoading === c.id ? 0.6 : 1 }}
                            onClick={() => sendStripeLink(c)}
                            disabled={stripeLoading === c.id}
                            title="Générer et copier le lien de paiement Stripe"
                          >
                            {stripeLoading === c.id ? '...' : '💳 Lien paiement'}
                          </button>
                        </td>
                        <td style={S.td}>
                          <button style={{ ...S.btnGhost, ...S.btnSm, marginRight: 6 }} onClick={() => openEdit(c)}>Modifier</button>
                          <button style={{ ...S.btnDanger, ...S.btnSm }} onClick={() => deleteClient(c.id, c.client_name)}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Bloc info Stripe */}
          <div style={{ background: '#111118', border: '1px solid #7C6AF730', borderRadius: 10, padding: '16px 20px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, color: '#7C6AF7' }}>💳 Comment fonctionne le paiement</div>
            <div style={{ fontSize: 12, color: '#6B6880', lineHeight: 1.7 }}>
              1. Crée un client avec son email · 2. Clique "Lien paiement" → le lien Stripe est copié dans ton presse-papier · 3. Envoie-le au client par WhatsApp ou email · 4. Le client paie en ligne · 5. Stripe prélève automatiquement chaque mois
            </div>
          </div>
        </div>
      </main>

      {/* Modal */}
      {modal && (
        <div style={S.overlay} onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div style={S.modal}>
            <div style={S.modalTitle}>{editTarget ? 'Modifier le client' : '+ Nouveau client'}</div>

            {!editTarget && (
              <>
                <label style={S.formLabel}>Nom du client *</label>
                <input style={S.input} placeholder="ex: Pizza Bella" value={form.client_name}
                  onChange={e => handleNameChange(e.target.value)} />

                <label style={S.formLabel}>Slug (URL) *</label>
                <input style={S.input} placeholder="pizza-bella" value={form.slug}
                  onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} />
                <div style={S.slugPreview}>
                  Lien NFC → <span style={{ color: '#7C6AF7' }}>
                    {typeof window !== 'undefined' ? window.location.origin : 'https://tapvia.vercel.app'}/c/{form.slug || '...'}
                  </span>
                </div>
              </>
            )}

            <label style={S.formLabel}>Lien Google Reviews *</label>
            <input style={S.input} placeholder="https://search.google.com/local/writereview?placeid=..." value={form.destination}
              onChange={e => setForm(f => ({ ...f, destination: e.target.value }))} />

            <label style={S.formLabel}>Email du client (pour Stripe)</label>
            <input style={S.input} placeholder="contact@pizzabella.fr" value={form.client_email}
              onChange={e => setForm(f => ({ ...f, client_email: e.target.value }))} />

            <label style={S.formLabel}>Plan *</label>
            <select style={S.input} value={form.plan} onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}>
              <option value="Starter">Starter — 19€/mois</option>
              <option value="Business">Business — 39€/mois</option>
              <option value="Pro">Pro — 69€/mois</option>
            </select>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button style={S.btnGhost} onClick={() => setModal(false)}>Annuler</button>
              <button style={S.btnPrimary} onClick={saveClient}>
                {editTarget ? 'Enregistrer →' : 'Créer →'}
              </button>
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
  sidebar: { background: '#111118', borderRight: '1px solid #ffffff0f', padding: '24px 0', display: 'flex', flexDirection: 'column' },
  logo: { padding: '0 20px 24px', borderBottom: '1px solid #ffffff0f', marginBottom: 16 },
  logoMark: { fontSize: 18, fontWeight: 800, letterSpacing: -0.5 },
  logoSub: { fontFamily: 'monospace', fontSize: 10, color: '#6B6880', marginTop: 2 },
  navItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', cursor: 'pointer', color: '#6B6880', fontSize: 13, fontWeight: 600, borderLeft: '2px solid transparent' },
  navActive: { color: '#F0EEF8', borderLeftColor: '#7C6AF7', background: '#7C6AF710' },
  navDot: { width: 6, height: 6, borderRadius: '50%', background: 'currentColor', opacity: 0.5, flexShrink: 0 },
  sidebarBottom: { marginTop: 'auto', padding: '16px 20px', borderTop: '1px solid #ffffff0f' },
  planBadge: { background: '#7C6AF720', border: '1px solid #7C6AF740', color: '#7C6AF7', fontFamily: 'monospace', fontSize: 10, padding: '4px 8px', borderRadius: 4, display: 'inline-block' },
  main: { overflow: 'auto' },
  topbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 28px', borderBottom: '1px solid #ffffff0f', position: 'sticky', top: 0, background: '#0A0A0F', zIndex: 10 },
  topbarTitle: { fontSize: 16, fontWeight: 700 },
  topbarSub: { fontFamily: 'monospace', fontSize: 11, color: '#6B6880', marginTop: 2 },
  content: { padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 24 },
  metrics: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 },
  metricCard: { background: '#111118', border: '1px solid #ffffff0f', borderRadius: 10, padding: '16px 18px' },
  metricLabel: { fontFamily: 'monospace', fontSize: 10, color: '#6B6880', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  metricValue: { fontSize: 28, fontWeight: 800, letterSpacing: -1, lineHeight: 1 },
  sectionHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle: { fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 },
  pill: { fontFamily: 'monospace', fontSize: 10, padding: '2px 7px', borderRadius: 20, background: '#1A1A24', color: '#6B6880' },
  tableWrap: { background: '#111118', border: '1px solid #ffffff0f', borderRadius: 10, overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { fontFamily: 'monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, color: '#6B6880', padding: '10px 16px', textAlign: 'left', borderBottom: '1px solid #ffffff0f' },
  tr: { borderBottom: '1px solid #ffffff08' },
  td: { padding: '13px 16px', verticalAlign: 'middle', fontSize: 13 },
  linkCell: { fontFamily: 'monospace', fontSize: 11, color: '#7C6AF7', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 },
  btnPrimary: { background: '#7C6AF7', color: '#fff', border: 'none', borderRadius: 6, padding: '9px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  btnGhost: { background: 'transparent', color: '#6B6880', border: '1px solid #ffffff1a', borderRadius: 6, padding: '8px 14px', cursor: 'pointer', fontSize: 13 },
  btnDanger: { background: '#F0525215', color: '#F05252', border: '1px solid #F0525230', borderRadius: 6, padding: '8px 10px', cursor: 'pointer', fontSize: 12 },
  btnStripe: { background: '#7C6AF720', color: '#7C6AF7', border: '1px solid #7C6AF740', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 11, fontWeight: 600 },
  btnSm: { padding: '5px 10px', fontSize: 12 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: '#111118', border: '1px solid #ffffff1a', borderRadius: 12, padding: 28, width: 460, maxWidth: '95vw', display: 'flex', flexDirection: 'column', gap: 10 },
  modalTitle: { fontSize: 16, fontWeight: 800, marginBottom: 10 },
  formLabel: { fontFamily: 'monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, color: '#6B6880', display: 'block', marginBottom: 4, marginTop: 4 },
  input: { width: '100%', background: '#0A0A0F', border: '1px solid #ffffff1a', borderRadius: 6, color: '#F0EEF8', fontFamily: 'monospace', fontSize: 12, padding: '10px 12px', outline: 'none' },
  slugPreview: { fontFamily: 'monospace', fontSize: 11, color: '#6B6880', marginTop: 4 },
}
