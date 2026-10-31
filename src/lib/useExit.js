import { useEffect, useState } from 'react'

// Mantiene algo en pantalla un momento después de cerrarse, para que salga con una animación.
// shown: el valor que se sigue dibujando. leaving: true mientras sale.
export function useExit(value, ms = 220) {
  const [last, setLast] = useState(null)

  useEffect(() => {
    if (value) { setLast(value); return undefined }
    const t = setTimeout(() => setLast(null), ms)
    return () => clearTimeout(t)
  }, [value, ms])

  return { shown: value || last, leaving: !value && Boolean(last) }
}
