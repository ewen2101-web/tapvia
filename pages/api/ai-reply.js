export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { review_text, rating, business_name } = req.body

  const prompt = rating <= 2
    ? `Tu es le gérant de "${business_name}". Un client a laissé un avis négatif (${rating}/5) : "${review_text}". Rédige une réponse professionnelle, empathique et constructive en français, en moins de 100 mots. Ne sois pas défensif.`
    : `Tu es le gérant de "${business_name}". Un client a laissé un avis positif (${rating}/5) : "${review_text}". Rédige une réponse chaleureuse et personnalisée en français, en moins de 60 mots.`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }]
    })
  })

  const data = await response.json()
  return res.status(200).json({ reply: data.content[0].text })
}
