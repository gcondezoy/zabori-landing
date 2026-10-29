import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Pin con los colores de Zabori (evita las imágenes por defecto de Leaflet)
const pin = L.divIcon({
  className: 'zb-pin',
  html: '<span></span>',
  iconSize: [30, 42],
  iconAnchor: [15, 40],
})

// Mapa pequeño con un pin que el cliente puede arrastrar hasta su puerta
export default function MiniMap({ lat, lng, onMove }) {
  const box = useRef(null)
  const map = useRef(null)
  const marker = useRef(null)
  const move = useRef(onMove)
  move.current = onMove

  useEffect(() => {
    const m = L.map(box.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: false }).setView([lat, lng], 17)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
    }).addTo(m)
    const mk = L.marker([lat, lng], { draggable: true, icon: pin, keyboard: true, title: 'Mueve el pin a tu puerta' }).addTo(m)
    mk.on('dragend', () => { const p = mk.getLatLng(); move.current(p.lat, p.lng) })
    m.on('click', (e) => { mk.setLatLng(e.latlng); move.current(e.latlng.lat, e.latlng.lng) })
    map.current = m
    marker.current = mk
    return () => m.remove()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Si cambia la dirección elegida, el mapa se centra en el nuevo punto
  useEffect(() => {
    if (!map.current) return
    const cur = marker.current.getLatLng()
    if (Math.abs(cur.lat - lat) > 1e-6 || Math.abs(cur.lng - lng) > 1e-6) {
      marker.current.setLatLng([lat, lng])
      map.current.setView([lat, lng], 17)
    }
  }, [lat, lng])

  return <div ref={box} className="minimap" role="application" aria-label="Mapa: arrastra el pin o toca el lugar exacto de entrega" />
}
