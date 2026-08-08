import { useState, useEffect } from 'react'
import { Link } from 'react-scroll'
import { motion, AnimatePresence } from 'framer-motion'
import './Navbar.css'

const links = [
  { id: 'home', label: 'Главная' },
  { id: 'about', label: 'Обо мне' },
  { id: 'skills', label: 'Навыки' },
  { id: 'projects', label: 'Проекты' },
  { id: 'contact', label: 'Контакты' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <motion.nav
      className={`nav ${scrolled ? 'nav--scrolled' : ''}`}
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <div className="nav__logo">
        <span className="logo-bracket">&lt;</span>refteen<span className="logo-bracket">/&gt;</span>
      </div>

      <ul className="nav__links">
        {links.map(l => (
          <li key={l.id}>
            <Link to={l.id} smooth spy offset={-70} duration={500} activeClass="nav__link--active">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>

      <a href="#contact" className="nav__cta">Нанять меня</a>

      <button className="nav__burger" onClick={() => setOpen(!open)} aria-label="menu">
        <span className={open ? 'x' : ''} />
        <span className={open ? 'x' : ''} />
        <span className={open ? 'x' : ''} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="nav__mobile"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
          >
            {links.map(l => (
              <Link
                key={l.id}
                to={l.id}
                smooth spy offset={-70} duration={500}
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            <a href="#contact" className="nav__cta-mobile" onClick={() => setOpen(false)}>Нанять меня</a>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}
