// Direcciones con OpenStreetMap (Photon): gratis y sin llave, uso razonable.
// Se consulta solo cuando el cliente deja de escribir y se priorizan resultados cerca de Lima.
const PHOTON = 'https://photon.komoot.io'
export const LIMA = { lat: -12.0464, lng: -77.0428 }

// Texto legible a partir de las propiedades de Photon
function label(p) {
  const street = [p.street || (p.type === 'street' ? p.name : ''), p.housenumber].filter(Boolean).join(' ')
  const place = p.name && p.name !== p.street && p.type !== 'street' ? p.name : ''
  const area = [p.district || p.locality, p.city || p.county].filter(Boolean)
  const main = [place, street].filter(Boolean).join(', ') || p.name || ''
  return { main, area: [...new Set(area)].join(', '), full: [main, ...new Set(area)].filter(Boolean).join(', ') }
}

const toResult = (f) => {
  const [lng, lat] = f.geometry.coordinates
  return { ...label(f.properties), lat, lng }
}

export async function searchAddress(q, signal) {
  const url = `${PHOTON}/api/?q=${encodeURIComponent(q + ', Lima')}&lat=${LIMA.lat}&lon=${LIMA.lng}&limit=8`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error('No se pudo buscar la dirección')
  const data = await res.json()
  return data.features
    .filter((f) => f.properties.countrycode === 'PE')
    .map(toResult)
    .filter((r, i, arr) => r.main && arr.findIndex((x) => x.full === r.full) === i)
    .slice(0, 5)
}

export async function reverseAddress(lat, lng) {
  try {
    const res = await fetch(`${PHOTON}/reverse?lat=${lat}&lon=${lng}`)
    if (!res.ok) return null
    const data = await res.json()
    return data.features?.[0] ? toResult(data.features[0]).full : null
  } catch {
    return null
  }
}

export const mapsLink = (lat, lng) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
