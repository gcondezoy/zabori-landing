import { useEffect, useState } from 'react'
import { site } from '../config/site'

const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const hh = (h) => `${String(h).padStart(2, '0')}:00`

// Próximo día de atención a partir de mañana
function nextOpenDay(from) {
  for (let i = 1; i <= 7; i++) {
    const d = (from + i) % 7
    if (site.openDays.includes(d)) return i === 1 ? 'mañana' : `el ${DAYS[d]}`
  }
  return 'pronto'
}

export function todayStatus(now = new Date()) {
  const day = now.getDay()
  const h = now.getHours() + now.getMinutes() / 60
  const date = `${DAYS[day]} ${now.getDate()} de ${now.toLocaleDateString('es-PE', { month: 'long' })}`
  if (!site.openDays.includes(day)) return { date, open: false, text: `Hoy descansamos · volvemos ${nextOpenDay(day)} desde las ${hh(site.openHour)}` }
  if (h < site.openHour) return { date, open: false, text: `Abrimos hoy a las ${hh(site.openHour)} · ya puedes armar tu pedido` }
  if (h < site.closeHour) return { date, open: true, text: `Abierto ahora · pedidos hasta las ${hh(site.closeHour)}` }
  return { date, open: false, text: `Cerrado por hoy · volvemos ${nextOpenDay(day)} desde las ${hh(site.openHour)}` }
}

// Fecha del menú + estado de atención; se actualiza cada minuto
export default function TodayBadge() {
  const [s, setS] = useState(() => todayStatus())
  useEffect(() => {
    const t = setInterval(() => setS(todayStatus()), 60000)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="today">
      <span className="today-date">Menú del {s.date}</span>
      <span className={`today-status${s.open ? ' open' : ''}`}><i aria-hidden="true" />{s.text}</span>
    </div>
  )
}
