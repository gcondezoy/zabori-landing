import { lazy, Suspense, useEffect, useId, useRef, useState } from 'react'
import { MapPin, Crosshair, CheckCircle } from '@phosphor-icons/react'
import { searchAddress, reverseAddress } from '../lib/geo'

const MiniMap = lazy(() => import('./MiniMap')) // el mapa se descarga solo si se usa

const DEBOUNCE_MS = 450

// Dirección de entrega: se puede escribir libre; las sugerencias y el mapa son opcionales
export default function AddressPicker({ address, lat, lng, onChange }) {
  const id = useId()
  const [list, setList] = useState([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [locating, setLocating] = useState(false)
  const [msg, setMsg] = useState('')
  const typed = useRef(false) // solo se busca cuando el cliente escribe (no al elegir una sugerencia)

  useEffect(() => {
    if (!typed.current || address.trim().length < 4) { setList([]); return }
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      try {
        const r = await searchAddress(address.trim(), ctrl.signal)
        setList(r); setOpen(true); setActive(-1)
      } catch { /* sin sugerencias: igual se puede escribir */ }
    }, DEBOUNCE_MS)
    return () => { clearTimeout(t); ctrl.abort() }
  }, [address])

  const type = (e) => {
    typed.current = true
    setMsg('')
    onChange({ address: e.target.value, lat: null, lng: null }) // la ubicación anterior ya no corresponde
  }

  const pick = (r) => {
    typed.current = false
    setOpen(false); setList([])
    onChange({ address: r.full, lat: r.lat, lng: r.lng })
  }

  const locate = () => {
    if (!navigator.geolocation) { setMsg('Tu navegador no permite compartir la ubicación.'); return }
    setLocating(true); setMsg('')
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude: la, longitude: lo } = pos.coords
      const text = await reverseAddress(la, lo)
      typed.current = false
      onChange({ address: address.trim() || text || 'Mi ubicación actual', lat: la, lng: lo })
      setMsg(text && address.trim() ? `Ubicación detectada cerca de: ${text}` : '')
      setLocating(false)
    }, () => {
      setMsg('No pudimos obtener tu ubicación. Escribe tu dirección.')
      setLocating(false)
    }, { enableHighAccuracy: true, timeout: 10000 })
  }

  const onKey = (e) => {
    if (!open || !list.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => (a + 1) % list.length) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => (a - 1 + list.length) % list.length) }
    if (e.key === 'Enter' && active >= 0) { e.preventDefault(); pick(list[active]) }
    if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div className="addr">
      <label htmlFor={id}>Dirección de entrega</label>
      <div className="addr-row">
        <div className="addr-input">
          <MapPin size={18} aria-hidden="true" />
          <input id={id} required value={address} onChange={type} onKeyDown={onKey} autoComplete="street-address"
            placeholder="Calle, número y distrito"
            role="combobox" aria-expanded={open && list.length > 0} aria-controls={`${id}-list`} aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `${id}-opt-${active}` : undefined}
            onFocus={() => list.length && setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} />
        </div>
        <button type="button" className="addr-gps" onClick={locate} disabled={locating}>
          <Crosshair size={18} weight="bold" /> {locating ? 'Buscando…' : 'Usar mi ubicación'}
        </button>
      </div>

      {open && list.length > 0 && (
        <ul className="addr-list" id={`${id}-list`} role="listbox">
          {list.map((r, i) => (
            <li key={r.full} id={`${id}-opt-${i}`} role="option" aria-selected={i === active}
              className={i === active ? 'on' : ''} onMouseDown={(e) => { e.preventDefault(); pick(r) }}>
              <b>{r.main}</b><small>{r.area}</small>
            </li>
          ))}
        </ul>
      )}

      {msg && <p className="addr-msg">{msg}</p>}

      {lat != null && lng != null && (
        <div className="addr-map">
          <Suspense fallback={<div className="minimap loading">Cargando mapa…</div>}>
            <MiniMap lat={lat} lng={lng} onMove={(la, lo) => onChange({ address, lat: la, lng: lo })} />
          </Suspense>
          <p className="addr-ok"><CheckCircle size={16} weight="fill" /> Ubicación marcada. Mueve el pin si no es tu puerta exacta.</p>
        </div>
      )}
    </div>
  )
}
