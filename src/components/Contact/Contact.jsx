import { motion } from 'framer-motion'
import { FaTelegram, FaGithub, FaVk } from 'react-icons/fa'
import './Contact.css'

const contacts = [
  {
    icon: <FaVk />,
    label: 'ВКонтакте',
    value: 'vk.ru/refteenyt',
    href: 'https://vk.ru/refteenyt',
    color: '#4680c2',
  },
  {
    icon: <FaTelegram />,
    label: 'Telegram',
    value: '@ewiwt',
    href: 'https://t.me/ewiwt',
    color: '#38bdf8',
  },
  {
    icon: <FaGithub />,
    label: 'GitHub',
    value: 'github.com/refteen',
    href: 'https://github.com/refteen',
    color: '#e2e8f0',
  },
]

export default function Contact() {
  return (
    <section id="contact" className="contact">
      <div className="contact__blob blob" style={{ width: 380, height: 380, background: '#38bdf8', top: '-60px', left: '-80px' }} />
      <div className="contact__inner">
        <h2 className="section-title">Давайте <span>поговорим</span></h2>

        <motion.div
          className="contact__card-grid"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="contact__tagline">Готов к новым проектам</p>
          <p className="contact__body">
            Есть идея? Нужен разработчик на проект или в команду?
            Пишите — отвечу быстро.
          </p>

          <div className="contact__list">
            {contacts.map((c, i) => (
              <motion.a
                key={c.label}
                href={c.href}
                target="_blank"
                rel="noreferrer"
                className="contact__item"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                whileHover={{ x: 6 }}
                style={{ '--cc': c.color }}
              >
                <span className="contact__item-icon" style={{ color: c.color }}>{c.icon}</span>
                <div>
                  <p className="contact__item-label">{c.label}</p>
                  <p className="contact__item-value">{c.value}</p>
                </div>
                <span className="contact__item-arrow">→</span>
              </motion.a>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
