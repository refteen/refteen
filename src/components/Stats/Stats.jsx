import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import './Stats.css'

const STATS = [
  { to: 2, suffix: '+', label: 'года опыта' },
  { to: 10, suffix: '+', label: 'проектов' },
  { to: 100, suffix: '%', label: 'довожу до конца' },
  { to: 8, suffix: '+', label: 'технологий' },
]

function Counter({ to, suffix }) {
  const [n, setN] = useState(0)
  const started = useRef(false)

  const start = () => {
    if (started.current) return
    started.current = true
    const dur = 1500
    const t0 = performance.now()
    const tick = now => {
      const p = Math.min((now - t0) / dur, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setN(Math.round(to * eased))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }

  return (
    <motion.span
      className="stat-num"
      onViewportEnter={start}
      viewport={{ once: true, amount: 0.6 }}
    >
      {n}{suffix}
    </motion.span>
  )
}

export default function Stats() {
  return (
    <section className="stats">
      <div className="stats__inner">
        {STATS.map((s, i) => (
          <motion.div
            key={s.label}
            className="stats__item"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
          >
            <Counter to={s.to} suffix={s.suffix} />
            <span className="stat-label">{s.label}</span>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
