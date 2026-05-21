export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { business_name, rating, review_text, admin_email } = req.body

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'alertes@tapvia.fr',
      to: admin_email,
      subject: `⚠️ Avis négatif ${rating}★ — ${business_name}`,
      html: `
        <h2>Nouvel avis négatif reçu</h2>
        <p><strong>Commerce :</strong> ${business_name}</p>
        <p><strong>Note :</strong> ${'★'.repeat(rating)}${'☆'.repeat(5-rating)}</p>
        <p><strong>Avis :</strong> "${review_text}"</p>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}">Répondre depuis le dashboard →</a></p>
      `
    })
  })

  return res.status(200).json({ sent: true })
}
