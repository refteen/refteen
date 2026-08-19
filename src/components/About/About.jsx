import { motion } from 'framer-motion'
import { FaMapMarkerAlt, FaCode, FaRocket, FaGraduationCap } from 'react-icons/fa'
import RevealText from '../Effects/RevealText'
import './About.css'

const facts = [
  { icon: <FaCode />, label: 'Full Stack', sub: 'Frontend + Backend' },
  { icon: <FaMapMarkerAlt />, label: 'Россия', sub: 'Работаю удалённо' },
  { icon: <FaRocket />, label: '2+ года', sub: 'Коммерческий опыт' },
  { icon: <FaGraduationCap />, label: 'ИСиТ в бизнесе', sub: 'Студент-программист' },
]

export default function About() {
  return (
    <section id="about" className="about">
      <div className="about__blob blob" style={{ width: 450, height: 450, background: '#c770f0', top: '10%', left: '-100px' }} />

      <div className="about__inner">
        <motion.div
          className="about__left"
          initial={{ opacity: 0, x: -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <div className="about__avatar-wrap">
            <img
              className="about__avatar"
              src="https://github.com/refteen.png?size=400"
              alt="refteen"
              loading="lazy"
            />
            <div className="about__avatar-ring" />
          </div>

          <div className="about__facts">
            {facts.map(f => (
              <div key={f.label} className="about__fact">
                <span className="about__fact-icon">{f.icon}</span>
                <div>
                  <p className="about__fact-label">{f.label}</p>
                  <p className="about__fact-sub">{f.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          className="about__right"
          initial={{ opacity: 0, x: 40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.15 }}
        >
          <RevealText className="reveal-title--left" text="Обо мне" accent="мне" style={{ textAlign: 'left', marginBottom: 28 }} />

          <p className="about__text">
            Меня зовут <strong>Вячеслав</strong> — Full Stack разработчик с фокусом на создание
            продуктов, которые реально работают. Занимаюсь всем циклом разработки: архитектура,
            backend, frontend, деплой.
          </p>
          <p className="about__text">
            Один из моих крупных проектов —{' '}
            <a href="https://derevnya-map.ru" target="_blank" rel="noreferrer" className="about__link">
              derevnya-map.ru
            </a>{' '}
            — платформа для поиска загородного жилья в Ставропольском крае с картой и онлайн-бронированием.
          </p>
          <p className="about__text">
            Параллельно учусь по направлению <strong>Информационные системы и технологии в бизнесе</strong> — это даёт понимание не только технической стороны, но и бизнес-логики продуктов.
          </p>
          <p className="about__text">
            Люблю решать нетривиальные задачи, не боюсь сложных требований и всегда довожу дело до конца.
          </p>

          <div className="about__ctas">
            <a href="#contact" className="btn-grad">Обсудить проект</a>
            <a href="https://github.com/refteen" target="_blank" rel="noreferrer" className="btn-ghost">GitHub</a>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
