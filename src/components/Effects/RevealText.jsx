import { motion } from 'framer-motion'
import './RevealText.css'

// Заголовок, который «всплывает» пословно при попадании в зону видимости.
// Финальное состояние — обычное (opacity 1, y 0), поэтому вёрстка не смещается.
export default function RevealText({ text, accent, className = '', style }) {
  const words = text.split(' ')

  return (
    <motion.h2
      className={`reveal-title ${className}`}
      style={style}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.5 }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
    >
      {words.map((w, i) => (
        <motion.span
          key={i}
          className={`reveal-word${accent && w === accent ? ' reveal-grad' : ''}`}
          variants={{ hidden: { opacity: 0, y: '0.7em' }, show: { opacity: 1, y: 0 } }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {w}
        </motion.span>
      ))}
    </motion.h2>
  )
}
