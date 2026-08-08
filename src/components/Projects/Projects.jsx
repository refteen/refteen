import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FaGithub, FaExternalLinkAlt, FaMap, FaServer, FaEnvelope, FaGamepad, FaYoutube, FaCode, FaKeyboard, FaPalette, FaTimes, FaPlay } from 'react-icons/fa'
import './Projects.css'

const projects = [
  {
    title: 'Derevnya Map',
    desc: 'Платформа для поиска и бронирования загородного жилья в Ставропольском крае. Карта объектов, фильтрация, онлайн-бронирование и личный кабинет.',
    tags: ['React', 'JavaScript', 'Tailwind CSS','NextJS', 'TypeScript', 'PostgreSQL'],
    live: 'https://derevnya-map.ru',
    github: 'https://github.com/refteen/DerevnyaMap',
    icon: <FaMap />,
    color: '#38bdf8',
    bg: 'linear-gradient(135deg, #0c2a3a 0%, #0a1628 100%)',
    app: null,
  },
  {
    title: 'DerevnyaMap Backend',
    desc: 'REST API бэкенд платформы DerevnyaMap. Авторизация, управление объектами, бронирования, загрузка изображений.',
    tags: ['TypeScript', 'Node.js', 'PostgreSQL'],
    live: null,
    github: 'https://github.com/refteen/derevnyamap-backend',
    icon: <FaServer />,
    color: '#3178c6',
    bg: 'linear-gradient(135deg, #0a1a2e 0%, #080f1e 100%)',
    app: null,
  },
  {
    title: 'Snake Game',
    desc: 'Аркадная змейка прямо в браузере. Управление стрелками/WASD, нарастающая скорость, сохранение рекорда в localStorage.',
    tags: ['HTML', 'CSS', 'JavaScript', 'Canvas'],
    live: null,
    github: 'https://github.com/refteen',
    icon: <FaGamepad />,
    color: '#4ade80',
    bg: 'linear-gradient(135deg, #0a1e0e 0%, #060f08 100%)',
    app: '/apps/snake/index.html',
  },
  {
    title: 'Memory Game',
    desc: 'Игра на память: переворачивай карточки с иконками технологий и находи пары. Счётчик ходов, таймер и ранг по результату.',
    tags: ['HTML', 'CSS', 'JavaScript'],
    live: null,
    github: 'https://github.com/refteen',
    icon: <FaKeyboard />,
    color: '#f59e0b',
    bg: 'linear-gradient(135deg, #1e1500 0%, #110c00 100%)',
    app: '/apps/typing/index.html',
  },
  {
    title: 'CSS Gradient Generator',
    desc: 'Генератор CSS-градиентов с живым превью. Два/три цвета, угол, linear/radial, 6 пресетов, копирование CSS одной кнопкой.',
    tags: ['HTML', 'CSS', 'JavaScript'],
    live: null,
    github: 'https://github.com/refteen',
    icon: <FaPalette />,
    color: '#c770f0',
    bg: 'linear-gradient(135deg, #1a0a24 0%, #0f0614 100%)',
    app: '/apps/gradient/index.html',
  },
  {
    title: '1sec Email Telegram Bot',
    desc: 'Telegram-бот для генерации временных email-адресов. Получай и читай письма прямо в Telegram без регистрации.',
    tags: ['Python', 'Telegram Bot API'],
    live: null,
    github: 'https://github.com/refteen/1secEmail-Telegram-BOT',
    icon: <FaEnvelope />,
    color: '#ffd43b',
    bg: 'linear-gradient(135deg, #1e1a00 0%, #120f00 100%)',
    app: null,
  },
  {
    title: 'AutoAccept Dota 2',
    desc: 'Python-скрипт, который автоматически принимает найденный матч в Dota 2. Никогда не пропускай очередь.',
    tags: ['Python', 'Computer Vision'],
    live: null,
    github: 'https://github.com/refteen/AutoAccept-Dota2',
    icon: <FaCode />,
    color: '#c770f0',
    bg: 'linear-gradient(135deg, #1a0a24 0%, #0f0614 100%)',
    app: null,
  },
  {
    title: 'YouTube Downloader Bot',
    desc: 'Telegram-бот для скачивания YouTube-видео. Отправляешь ссылку — получаешь файл прямо в чате.',
    tags: ['Python', 'Telegram Bot API', 'yt-dlp'],
    live: null,
    github: 'https://github.com/refteen/TelegramBOT-YouTube-video-installer-',
    icon: <FaYoutube />,
    color: '#f05032',
    bg: 'linear-gradient(135deg, #1e0a06 0%, #120400 100%)',
    app: null,
  },
]

export default function Projects() {
  const [modal, setModal] = useState(null)

  return (
    <section id="projects" className="projects">
      <div className="projects__blob blob" style={{ width: 400, height: 400, background: '#c770f0', bottom: 0, right: '-80px' }} />

      <div className="projects__inner">
        <h2 className="section-title">Мои <span>проекты</span></h2>

        <div className="projects__grid">
          {projects.map((p, i) => (
            <motion.div
              key={p.title}
              className="project-card"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              whileHover={{ y: -6 }}
            >
              <div className="project-card__banner" style={{ background: p.bg }}>
                <div className="project-card__banner-glow" style={{ background: p.color }} />
                <span className="project-card__banner-icon" style={{ color: p.color }}>{p.icon}</span>
                <div className="project-card__banner-dots">
                  {[...Array(12)].map((_, j) => (
                    <span key={j} className="banner-dot" style={{ opacity: 0.06 + (j % 3) * 0.06 }} />
                  ))}
                </div>
                {p.app && (
                  <button className="banner-play-btn" onClick={() => setModal(p)} style={{ '--pc': p.color }}>
                    <FaPlay /> Запустить
                  </button>
                )}
              </div>

              <div className="project-card__body">
                <div className="project-card__top">
                  <h3 className="project-card__title">{p.title}</h3>
                  <div className="project-card__links">
                    {p.github && (
                      <a href={p.github} target="_blank" rel="noreferrer" title="GitHub"><FaGithub /></a>
                    )}
                    {p.live && (
                      <a href={p.live} target="_blank" rel="noreferrer" title="Открыть сайт"><FaExternalLinkAlt /></a>
                    )}
                  </div>
                </div>
                <p className="project-card__desc">{p.desc}</p>
                <div className="project-card__tags">
                  {p.tags.map(t => (
                    <span key={t} className="tag" style={{ '--tc': p.color }}>{t}</span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {modal && (
          <motion.div
            className="app-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setModal(null)}
          >
            <motion.div
              className="app-modal__window"
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="app-modal__bar" style={{ '--mc': modal.color }}>
                <span className="dot red" />
                <span className="dot yellow" />
                <span className="dot green" />
                <span className="app-modal__title">{modal.title}</span>
                <button className="app-modal__close" onClick={() => setModal(null)}>
                  <FaTimes />
                </button>
              </div>
              <iframe
                key={modal.app}
                src={modal.app}
                title={modal.title}
                className="app-modal__frame"
                sandbox="allow-scripts allow-same-origin allow-forms"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
