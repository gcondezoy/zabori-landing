import { useEffect } from 'react'
import { ArrowLeft, WarningCircle } from '@phosphor-icons/react'
import { LEGAL_PAGES, LEGAL_VERSION } from '../data/legal'
import { site } from '../config/site'

// [[pendiente]] se resalta para que el negocio vea qué falta definir
function Rich({ text }) {
  return text.split(/(\[\[.*?\]\])/).filter(Boolean).map((part, i) => (
    part.startsWith('[[') ? <mark key={i} className="legal-todo">{part.slice(2, -2)}</mark> : part
  ))
}

export default function LegalPage({ page }) {
  const doc = LEGAL_PAGES[page]

  useEffect(() => {
    const previous = document.title
    document.title = `${doc.title} | ${site.name}`
    return () => { document.title = previous }
  }, [doc.title])

  return (
    <main className="section legal">
      <div className="wrap legal-in">
        <a href="#top" className="back-link"><ArrowLeft size={16} weight="bold" /> Volver a la web</a>
        <h1>{doc.title}</h1>
        <p className="sub">{doc.intro}</p>
        {site.legal.draft && (
          <p className="legal-draft" role="note">
            <WarningCircle size={20} weight="fill" aria-hidden="true" />
            <span>Borrador pendiente de revisión legal y de los datos del negocio.</span>
          </p>
        )}
        {doc.sections.map((s) => (
          <section key={s.title}>
            <h2>{s.title}</h2>
            {s.blocks.map((b, i) => (b.list
              ? <ul key={i}>{b.list.map((item) => <li key={item}><Rich text={item} /></li>)}</ul>
              : <p key={i}><Rich text={b} /></p>))}
          </section>
        ))}
        <p className="legal-version">Versión: {LEGAL_VERSION}</p>
      </div>
    </main>
  )
}
