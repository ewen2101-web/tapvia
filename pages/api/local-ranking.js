const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  const { place_id } = req.query
  if (!place_id) return res.status(400).json({ error: 'place_id requis' })

  try {
    // Détails de l'établissement principal
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=name,rating,user_ratings_total,geometry,types&language=fr&key=${GOOGLE_API_KEY}`
    const detailsRes = await fetch(detailsUrl)
    const detailsData = await detailsRes.json()

    if (detailsData.status !== 'OK') {
      return res.status(400).json({ error: `Google API: ${detailsData.status}` })
    }

    const main = detailsData.result
    const { lat, lng } = main.geometry.location

    // Types à exclure (trop génériques)
    const excludedTypes = ['point_of_interest', 'establishment', 'store', 'premise', 'political', 'locality', 'country', 'route']

    // Trouve le type le plus spécifique
    const specificType = main.types?.find(t => !excludedTypes.includes(t)) || 'establishment'

    // Tous les établissements du même type dans 1km
    const nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=1000&type=${specificType}&language=fr&key=${GOOGLE_API_KEY}`
    const nearbyRes = await fetch(nearbyUrl)
    const nearbyData = await nearbyRes.json()

    // Inclut l'établissement principal dans le classement
    const mainEntry = {
      place_id,
      name: main.name,
      rating: main.rating || 0,
      total_reviews: main.user_ratings_total || 0,
      isMain: true,
    }

    const allPlaces = [
      mainEntry,
      ...(nearbyData.results || [])
        .filter(p => p.place_id !== place_id && p.rating && p.user_ratings_total > 0)
        .map(p => ({
          place_id: p.place_id,
          name: p.name,
          rating: p.rating || 0,
          total_reviews: p.user_ratings_total || 0,
          isMain: false,
        }))
    ].sort((a, b) => b.rating - a.rating || b.total_reviews - a.total_reviews)

    const rank = allPlaces.findIndex(p => p.place_id === place_id) + 1
    const total = allPlaces.length

    return res.status(200).json({
      rank,
      total,
      type: specificType,
      main: {
        name: main.name,
        rating: main.rating || 0,
        total_reviews: main.user_ratings_total || 0,
      },
      top5: allPlaces.slice(0, 5),
    })

  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
