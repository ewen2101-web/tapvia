export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0A0A0F',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'sans-serif',
      color: '#F0EEF8',
      textAlign: 'center',
      padding: '20px'
    }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>📵</div>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Lien introuvable</h1>
      <p style={{ color: '#6B6880', fontSize: 14 }}>
        Ce lien NFC n'est pas configuré ou a été désactivé.
      </p>
    </div>
  )
}
