import { useState, useEffect } from 'react'
  import Head from 'next/head'
  import { createClient } from '@supabase/supabase-js'

  // ✅ INITIALISATION SUPABASE CÔTÉ CLIENT (utilise les variables NEXT_PUBLIC_)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  // Constants for pricing display (hardcoded)
  const PLAN_MRR = { Starter: 19, Business: 39, Pro: 69 }

  export default function Admin() {
    // State variables
    const [clients, setClients] = useState([])
    const [loading, setLoading] = useState(true)
    const [modal, setModal] = useState(false)
    const [editTarget, setEditTarget] = useState(null)
    const [form, setForm] = useState({
      client_name: '',
      slug: '',
      destination: '',
      plan: 'Starter',
      client_email: ''
    })
    const [copied, setCopied] = useState(null)
    const [password, setPassword] = useState('')
    const [auth, setAuth] = useState(false)
    const [stripeLoading, setStripeLoading] = useState(null)
    const [notification, setNotification] = useState(null)
    const [stripeLink, setStripeLink] = useState(null) // { url, client_name }
    const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123'

    // Load clients from Supabase on mount
    useEffect(() => {
      const loadClients = async () => {
        try {
          setLoading(true)
          const { data, error } = await supabase
            .from('redirects')
            .select('*')
            .order('created_at', { ascending: false })

          if (error) throw error
          setClients(data)
        } catch (err) {
          console.error('Error loading clients:', err)
          setNotification({ type: 'error', message: 'Failed to load clients' })
        } finally {
          setLoading(false)
        }
      }

      loadClients()
    }, [])

    // Handle form submission (add new client)
    const handleSubmit = async (e) => {
      e.preventDefault()
      if (!form.client_name || !form.destination || !form.client_email) {
        setNotification({ type: 'error', message: 'All fields are required' })
        return
      }

      try {
        const slug = form.client_name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')

        const { data, error } = await supabase
          .from('redirects')
          .insert([
            {
              slug,
              destination: form.destination,
              client_name: form.client_name,
              plan: form.plan,
              client_email: form.client_email
            }
          ])
          .select()

        if (error) throw error

        // Add to local state
        setClients([data[0], ...clients])
        // Reset form
        setForm({
          client_name: '',
          slug: '',
          destination: '',
          plan: 'Starter',
          client_email: ''
        })
        setNotification({ type: 'success', message: 'Client added successfully!' })
      } catch (err) {
        console.error('Error adding client:', err)
        setNotification({ type: 'error', message: 'Failed to add client' })
      }
    }

    // Generate Stripe payment link
    const handleGenerateStripeLink = async (client) => {
      try {
        setStripeLoading(client.id)
        // Hardcoded price IDs (matching stripe.js)
        const PRICE_IDS = {
          Starter: 'price_1TZGupHIjP9Yl8eI3nR5PvLx',
          Business: 'price_1TZGvQHIjP9Yl8eIB10ZyB7k',
          Pro: 'price_1TZGvrHIjP9Yl8eI6FJSj25s'
        }

        const priceId = PRICE_IDS[client.plan]
        if (!priceId) throw new Error(`Invalid plan: ${client.plan}`)

        // Import Stripe only when needed (to avoid build issues)
        const Stripe = require('stripe')
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

        const session = await stripe.checkout.sessions.create({
          mode: 'subscription',
          payment_method_types: ['card'],
          line_items: [{ price: priceId, quantity: 1 }],
          customer_email: client.client_email,
          metadata: { client_name: client.client_name, plan: client.plan },
          success_url: `${process.env.NEXT_PUBLIC_APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}`,
          locale: 'fr',
        })

        setStripeLink({ url: session.url, client_name: client.client_name })
        setNotification({
          type: 'success',
          message: `Payment link generated for ${client.client_name}`
        })
      } catch (err) {
        console.error('Stripe error:', err)
        setNotification({ type: 'error', message: 'Failed to generate payment link' })
      } finally {
        setStripeLoading(null)
      }
    }

    // Copy to clipboard handler
    const handleCopyToClipboard = (text) => {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(text)
        setTimeout(() => setCopied(null), 2000)
      }).catch(() => {
        setNotification({ type: 'error', message: 'Failed to copy to clipboard' })
      })
    }

    // Delete client
    const handleDeleteClient = async (id) => {
      if (!window.confirm('Are you sure you want to delete this client?')) return
      try {
        await supabase.from('redirects').delete().match({ id })
        setClients(clients.filter(client => client.id !== id))
        setNotification({ type: 'success', message: 'Client deleted' })
      } catch (err) {
        console.error('Error deleting client:', err)
        setNotification({ type: 'error', message: 'Failed to delete client' })
      }
    }

    // Auth handling
    const handleLogin = (e) => {
      e.preventDefault()
      if (password === ADMIN_PASSWORD) {
        setAuth(true)
        setPassword('')
        setNotification({ type: 'success', message: 'Logged in successfully' })
      } else {
        setNotification({ type: 'error', message: 'Invalid password' })
      }
    }

    const handleLogout = () => {
      setAuth(false)
      setPassword('')
    }

    // Notification cleanup
    useEffect(() => {
      if (notification) {
        const timer = setTimeout(() => setNotification(null), 3000)
        return () => clearTimeout(timer)
      }
    }, [notification])

    if (!auth) {
      return (
        <div style={{ 
          minHeight: '100vh',
          background: '#0A0A0F',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          color: '#F0EEF8'
        }}>
          <Head><title>Admin Login — Tapvia</title></Head>
          <div style={{ 
            background: '#111118',
            padding: '32px',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '400px'
          }}>
            <h1 style={{ 
              fontSize: '24px',
              fontWeight: '700',
              marginBottom: '24px',
              textAlign: 'center'
            }}>Admin Login</h1>
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ 
                marginBottom: '8px',
                fontSize: '14px',
                color: '#6B6880'
              }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                style={{
                  padding: '12px',
                  marginBottom: '24px',
                  border: '1px solid #333',
                  borderRadius: '6px',
                  background: '#0A0A0F',
                  color: '#F0EEF8',
                  fontSize: '16px'
                }}
              />
              <button
                type="submit"
                style={{
                  padding: '12px',
                  background: '#6366F1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Login
              </button>
            </form>
          </div>
        </div>
      )
    }

    return (
      <div style={{ minHeight: '100vh', background: '#0A0A0F', color: '#F0EEF8', fontFamily: 'system-ui, sans-serif' }}>
        <Head><title>Admin Dashboard — Tapvia</title></Head>

        {/* Notification Banner */}
        {notification && (
          <div style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: notification.type === 'success' ? '#10B981' : '#EF4444',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '6px',
            zIndex: 1000,
            fontSize: '14px'
          }}>
            {notification.message}
          </div>
        )}

        {/* Main Content */}
        <div style={{ padding: '24px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px'
          }}>
            <h1 style={{ fontSize: '28px', fontWeight: '700' }}>Tapvia Admin</h1>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setModal(true)}
                style={{
                  padding: '8px 16px',
                  background: '#6366F1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                + Nouveau client
              </button>
              <button
                onClick={handleLogout}
                style={{
                  padding: '8px 16px',
                  background: '#EF4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Déconnexion
              </button>
            </div>
          </div>

          {/* Add Client Modal */}
          {modal && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}>
              <div style={{
                background: '#111118',
                padding: '24px',
                borderRadius: '12px',
                width: '100%',
                maxWidth: '500px'
              }}>
                <h2 style={{ marginBottom: '20px', fontSize: '20px' }}>Nouveau client</h2>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Nom du client</label>
                    <input
                      type="text"
                      value={form.client_name}
                      onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                      placeholder="Ex: Pizza Bella"
                      style={{
                        padding: '12px',
                        border: '1px solid #333',
                        borderRadius: '6px',
                        background: '#0A0A0F',
                        color: '#F0EEF8',
                        fontSize: '16px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Lien Google Reviews</label>
                    <input
                      type="text"
                      value={form.destination}
                      onChange={(e) => setForm({ ...form, destination: e.target.value })}
                      placeholder="https://search.google.com/local/writereview?placeid=..."
                      style={{
                        padding: '12px',
                        border: '1px solid #333',
                        borderRadius: '6px',
                        background: '#0A0A0F',
                        color: '#F0EEF8',
                        fontSize: '16px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Email du client</label>
                    <input
                      type="email"
                      value={form.client_email}
                      onChange={(e) => setForm({ ...form, client_email: e.target.value })}
                      placeholder="client@email.com"
                      style={{
                        padding: '12px',
                        border: '1px solid #333',
                        borderRadius: '6px',
                        background: '#0A0A0F',
                        color: '#F0EEF8',
                        fontSize: '16px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Plan</label>
                    <select
                      value={form.plan}
                      onChange={(e) => setForm({ ...form, plan: e.target.value })}
                      style={{
                        padding: '12px',
                        border: '1px solid #333',
                        borderRadius: '6px',
                        background: '#0A0A0F',
                        color: '#F0EEF8',
                        fontSize: '16px'
                      }}
                    >
                      <option value="Starter">Starter (19€/mois)</option>
                      <option value="Business">Business (39€/mois)</option>
                      <option value="Pro">Pro (69€/mois)</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button
                      type="button"
                      onClick={() => setModal(false)}
                      style={{
                        padding: '8px 16px',
                        background: '#6B6880',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '14px',
                        cursor: 'pointer'
                      }}
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      style={{
                        padding: '8px 16px',
                        background: '#10B981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '14px',
                        cursor: loading ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {loading ? 'Ajout...' : 'Créer client'}
                    }
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Clients List */}
          <div style={{ marginTop: '24px' }}>
            <h2 style={{ marginBottom: '16px', fontSize: '20px' }}>Clients ({clients.length})</h2>
            {loading ? (
              <p style={{ textAlign: 'center', color: '#6B6880' }}>Chargement...</p>
            ) : clients.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#6B6880' }}>Aucun client enregistré</p>
            ) : (
              <div style={{
                background: '#111118',
                borderRadius: '8px',
                overflow: 'hidden'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#1A1A22' }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', color: '#6B6880' }}>Nom</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', color: '#6B6880' }}>Plan</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', color: '#6B6880' }}>Email</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', color: '#6B6880' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map((client) => (
                      <tr key={client.id} style={{ borderBottom: '1px solid #222' }}>
                        <td style={{ padding: '12px', fontSize: '14px' }}>{client.client_name}</td>
                        <td style={{ padding: '12px', fontSize: '14px' }}>{client.plan}</td>
                        <td style={{ padding: '12px', fontSize: '14px' }}>{client.client_email}</td>
                        <td style={{ padding: '12px', fontSize: '14px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => handleGenerateStripeLink(client)}
                            disabled={stripeLoading === client.id}
                            style={{
                              padding: '6px 10px',
                              background: stripeLoading === client.id ? '#6B6880' : '#F59E0B',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '12px',
                              cursor: stripeLoading === client.id ? 'not-allowed' : 'pointer'
                            }}
                          >
                            {stripeLoading === client.id ? 'Génération...' : '💳 Lien paiement'}
                          </button>
                          {stripeLink && stripeLink.client_name === client.client_name && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <button
                                onClick={() => handleCopyToClipboard(stripeLink.url)}
                                style={{
                                  padding: '6px 10px',
                                  background: '#6366F1',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  cursor: 'pointer'
                                }}
                              >
                                Copier
                              </button>
                              <button
                                onClick={() => window.open(stripeLink.url, '_blank')}
                                style={{
                                  padding: '6px 10px',
                                  background: '#10B981',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  cursor: 'pointer'
                                }}
                              >
                                Ouvrir
                              </button>
                              {copied === stripeLink.url && (
                                <span style={{ fontSize: '12px', color: '#10B981' }}>Copié !</span>
                              )}
                            </div>
                          )}
                          <button
                            onClick={() => handleDeleteClient(client.id)}
                            style={{
                              padding: '6px 10px',
                              background: '#EF4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                          >
                            🗑️  Supprimer
                          </button>
                        </td>
                      )
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }
