import Particles from './Particles'
import { motion } from 'framer-motion'
import { FaGithub, FaTelegram } from 'react-icons/fa'
import { HiArrowDown } from 'react-icons/hi'
import { Link } from 'react-scroll'
import { useTypewriter } from '../../hooks/useTypewriter'
import './Home.css'

export default function Home() {
  const passion = useTypewriter()

  return (
    <section id="home" className="home">
      <Particles />
      <div className="home__blob blob" style={{ width: 500, height: 500, background: '#c770f0', top: -100, right: -100 }} />
      <div className="home__blob blob" style={{ width: 400, height: 400, background: '#38bdf8', bottom: -80, left: -80 }} />

      <div className="home__content">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <div className="home__badge">
            <span className="home__dot" />
            Открыт для новых проектов
          </div>

          <h1 className="home__title">
            Full Stack<br />
            <span className="home__title--grad">разработчик</span>
          </h1>

          <p className="home__name">Погуляйченко Вячеслав</p>

          <p className="home__desc">
            Проектирую и разрабатываю современные веб-приложения — от идеи до продакшена.
            Чистый код, продуманный UX, реальные результаты.
          </p>

          <div className="home__actions">
            <a href="#projects" className="btn-grad">Смотреть проекты</a>
            <div className="home__socials">
              <a href="https://github.com/refteen" target="_blank" rel="noreferrer"><FaGithub /></a>
              <a href="https://t.me/ewiwt" target="_blank" rel="noreferrer"><FaTelegram /></a>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="home__code-card"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="code-card__header">
            <span className="dot red" /><span className="dot yellow" /><span className="dot green" />
            <span className="code-card__filename">dev.js</span>
          </div>
          <pre className="code-card__body">{`const developer = {
  name: "Вячеслав Погуляйченко",
  role: "Full Stack Developer",
  stack: ["React", "Node.js", "PostgreSQL"],
  location: "Россия",
  available: true,
  passion: "`}<span className="code-typewriter">{passion}</span><span className="code-cursor">|</span>{`",
};

developer.build("your_idea");`}</pre>
        </motion.div>
      </div>

      <Link to="about" smooth duration={500} className="home__scroll-hint">
        <HiArrowDown />
      </Link>
    </section>
  )
}
