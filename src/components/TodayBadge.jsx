import { useEffect, useState } from 'react'
import { site } from '../config/site'
import { useMenu } from '../context/MenuContext'
import { DAY_NAMES as DAYS } from '../lib/week'

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
  if (!site.openDays.includes(day)) return { open: false, text: `Hoy descansamos · volvemos ${nextOpenDay(day)} desde las ${hh(site.openHour)}` }
  if (h < site.openHour) return { open: false, text: `Abrimos hoy a las ${hh(site.openHour)} · ya puedes armar tu pedido` }
  if (h < site.closeHour) return { open: true, text: `Abierto ahora · pedidos hasta las ${hh(site.closeHour)}` }
  return { open: false, text: `Cerrado por hoy · volvemos ${nextOpenDay(day)} desde las ${hh(site.openHour)}` }
}

// Fecha del menú + estado de atención; se actualiza cada minuto
export default function TodayBadge() {
  const { day } = useMenu()
  const date = `${DAYS[day.day]} ${day.date.getDate()} de ${day.date.toLocaleDateString('es-PE', { month: 'long' })}`
  const [s, setS] = useState(() => todayStatus())
  useEffect(() => {
    const t = setInterval(() => setS(todayStatus()), 60000)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="today">
      <span className="today-date">Menú del {date}</span>
      <span className={`today-status${s.open ? ' open' : ''}`}><i aria-hidden="true" />{s.text}</span>
    </div>
  )
}
