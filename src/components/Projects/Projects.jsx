import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FaGithub, FaExternalLinkAlt, FaMap, FaServer, FaEnvelope, FaGamepad, FaYoutube, FaCode, FaKeyboard, FaPalette, FaTimes, FaPlay, FaLaptopCode, FaBookOpen, FaRegImage } from 'react-icons/fa'
import { FaCow } from 'react-icons/fa6'
import './Projects.css'
import RevealText from '../Effects/RevealText'

// Папка со скриншотами кейсов: public/cases/<slug>/ → /refteen/cases/<slug>/
const CASES_URL = '/refteen/cases/'

const projects = [
  {
    title: 'Derevnya Map',
    desc: 'Платформа для поиска и бронирования загородного жилья в Ставропольском крае. Карта с кластеризацией, маршруты, онлайн-бронирование, кабинеты гостя и владельца, подписка на тарифы.',
    tags: ['React', 'JavaScript', 'Tailwind CSS','NextJS', 'TypeScript', 'PostgreSQL'],
    live: 'https://derevnya-map.ru',
    github: 'https://github.com/refteen/DerevnyaMap',
    icon: <FaMap />,
    color: '#38bdf8',
    bg: 'linear-gradient(135deg, #0c2a3a 0%, #0a1628 100%)',
    app: null,
    // Подробный кейс — открывается кнопкой «Смотреть кейс» на баннере
    caseStudy: {
      slug: 'derevnyamap',
      tagline: 'Платформа поиска и бронирования загородного жилья в Ставропольском крае',
      meta: [
        { k: 'Роль', v: 'Fullstack — от схемы БД до деплоя' },
        { k: 'Статус', v: 'В продакшене' },
        { k: 'Модель', v: 'Подписка для владельцев' },
        { k: 'Домен', v: 'derevnya-map.ru' },
      ],
      problem:
        'Гостевые дома, базы отдыха и отели Ставрополья живут в разрозненных объявлениях: соцсети, доски, сарафанное радио. ' +
        'У большинства владельцев нет своего сайта, а у туриста нет карты — непонятно, что где расположено, свободно ли и сколько стоит. ' +
        'Любое бронирование в итоге упирается в переписку в личных сообщениях.',
      solution: [
        {
          title: 'Карта с кластеризацией',
          desc: 'Объекты на Яндекс.Картах: при отдалении сходятся в кластеры, по клику на метку всплывает карточка с фото, типом жилья, рейтингом, удобствами и ценой — не уходя с карты.',
        },
        {
          title: 'Маршруты',
          desc: 'Отдельный раздел для планирования поездки по краю сразу по нескольким местам, а не по одному объекту за раз.',
        },
        {
          title: 'Страница объекта',
          desc: 'Полноэкранное фото, описание, список удобств, галерея, контакты владельца, отзывы с рейтингом, избранное и шаринг.',
        },
        {
          title: 'Бронирование с живым расчётом',
          desc: 'Даты заезда и выезда, число гостей, телефон и пожелания. Примерная стоимость пересчитывается на лету — до отправки заявки видно сумму.',
        },
        {
          title: 'Две роли на одном аккаунте',
          desc: 'Гость собирает избранное и пишет отзывы, владелец объекта управляет своими размещениями. Интерфейс кабинета зависит от роли.',
        },
        {
          title: 'Тарифы и подписка',
          desc: 'Монетизация вшита в продукт: тариф с месячной ценой, дата подключения, срок действия и остаток дней, смена тарифа прямо из кабинета.',
        },
        {
          title: 'Личный кабинет',
          desc: 'Мои объекты, избранное, мои отзывы, уведомления и настройки — пять разделов под одной навигацией.',
        },
        {
          title: 'Тёмная и светлая тема',
          desc: 'Переключатель в шапке: весь интерфейс, включая карту и карточки, продуман в двух палитрах.',
        },
        {
          title: 'Собственный REST API',
          desc: 'Бэкенд вынесен в отдельный сервис и репозиторий: авторизация, объекты, бронирования, загрузка изображений. Фронтенд и API развиваются независимо.',
        },
      ],
      stack: [
        { group: 'Frontend', items: ['Next.js', 'React', 'TypeScript', 'Tailwind CSS', 'Яндекс.Карты API'] },
        { group: 'Backend', items: ['Node.js', 'TypeScript', 'REST API'] },
        { group: 'База данных', items: ['PostgreSQL'] },
      ],
      shots: [
        { file: 'map.jpg', caption: 'Карта мест: кластеры и карточка объекта прямо на карте' },
        { file: 'listing.jpg', caption: 'Страница объекта: фото, рейтинг, цена за сутки' },
        { file: 'booking.jpg', caption: 'Бронирование: даты, гости, живой расчёт стоимости' },
        { file: 'account.jpg', caption: 'Кабинет владельца: тариф, объекты, избранное, отзывы' },
      ],
      links: [
        { label: 'Открыть derevnya-map.ru', href: 'https://derevnya-map.ru', icon: <FaExternalLinkAlt />, primary: true },
        { label: 'Frontend', href: 'https://github.com/refteen/DerevnyaMap', icon: <FaGithub /> },
        { label: 'Backend', href: 'https://github.com/refteen/derevnyamap-backend', icon: <FaGithub /> },
      ],
    },
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
    title: 'AnimalFeedPlanner',
    desc: 'Десктопное Java-приложение для расчёта рационов сельхозживотных. Подбор кормов под потребности животного, график питательных веществ, сохранение рациона в JSON. Курсовой проект.',
    tags: ['Java', 'Maven', 'Swing', 'ООП'],
    live: null,
    github: 'https://github.com/refteen/AnimalFeedPlanner',
    icon: <FaCow />,
    color: '#f59e0b',
    bg: 'linear-gradient(135deg, #2a1a05 0%, #140c02 100%)',
    app: null,
  },
  {
    title: 'Snake Game',
    desc: 'Аркадная змейка прямо в браузере. Управление стрелками/WASD, нарастающая скорость, сохранение рекорда в localStorage.',
    tags: ['HTML', 'CSS', 'JavaScript', 'Canvas'],
    live: null,
    github: 'https://github.com/refteen/snake-game',
    icon: <FaGamepad />,
    color: '#4ade80',
    bg: 'linear-gradient(135deg, #0a1e0e 0%, #060f08 100%)',
    app: '/refteen/apps/snake/index.html',
  },
  {
    title: 'Memory Game',
    desc: 'Игра на память: переворачивай карточки с иконками технологий и находи пары. Счётчик ходов, таймер и ранг по результату.',
    tags: ['HTML', 'CSS', 'JavaScript'],
    live: null,
    github: 'https://github.com/refteen/memory-game',
    icon: <FaKeyboard />,
    color: '#f59e0b',
    bg: 'linear-gradient(135deg, #1e1500 0%, #110c00 100%)',
    app: '/refteen/apps/typing/index.html',
  },
  {
    title: 'CSS Gradient Generator',
    desc: 'Генератор CSS-градиентов с живым превью. Два/три цвета, угол, linear/radial, 6 пресетов, копирование CSS одной кнопкой.',
    tags: ['HTML', 'CSS', 'JavaScript'],
    live: null,
    github: 'https://github.com/refteen/css-gradient-generator',
    icon: <FaPalette />,
    color: '#c770f0',
    bg: 'linear-gradient(135deg, #1a0a24 0%, #0f0614 100%)',
    app: '/refteen/apps/gradient/index.html',
  },
  {
    title: 'AutoAccept Dota 2',
    desc: 'Python-скрипт, который автоматически принимает найденный матч в Dota 2.',
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
  {
    title: 'ООП на C#',
    desc: 'Лабораторные работы по объектно-ориентированному программированию на C#: наследование, интерфейсы, полиморфизм, обработка исключений и паттерны проектирования.',
    tags: ['C#', '.NET', 'ООП'],
    live: null,
    github: 'https://github.com/refteen/labs-object-oriented-programming',
    icon: <FaLaptopCode />,
    color: '#a179dc',
    bg: 'linear-gradient(135deg, #1a1030 0%, #0d0818 100%)',
    app: null,
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
]

// Скриншот кейса. Пока файла нет — на его месте слот с подсказкой, куда его положить.
function Shot({ src, path, caption, color }) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <figure className="case-shot case-shot--empty" style={{ '--sc': color }}>
        <div className="case-shot__ph">
          <FaRegImage />
          <p className="case-shot__ph-caption">{caption}</p>
          <code className="case-shot__ph-path">{path}</code>
        </div>
      </figure>
    )
  }

  return (
    <figure className="case-shot">
      <img src={src} alt={caption} loading="lazy" onError={() => setFailed(true)} />
      <figcaption>{caption}</figcaption>
    </figure>
  )
}

function CaseBody({ project }) {
  const c = project.caseStudy
  const color = project.color

  return (
    <div className="case">
      <header className="case__head">
        <h3 className="case__title">{project.title}</h3>
        <p className="case__tagline">{c.tagline}</p>

        <div className="case__links">
          {c.links.map(l => (
            <a
              key={l.href}
              href={l.href}
              target="_blank"
              rel="noreferrer"
              className={l.primary ? 'case__link case__link--primary' : 'case__link'}
              style={{ '--lc': color }}
            >
              {l.icon} {l.label}
            </a>
          ))}
        </div>
      </header>

      <div className="case__meta">
        {c.meta.map(m => (
          <div key={m.k} className="case__meta-item">
            <span className="case__meta-k">{m.k}</span>
            <span className="case__meta-v">{m.v}</span>
          </div>
        ))}
      </div>

      <section className="case__block">
        <h4 className="case__h" style={{ '--hc': color }}>Задача</h4>
        <p className="case__text">{c.problem}</p>
      </section>

      <section className="case__block">
        <h4 className="case__h" style={{ '--hc': color }}>Что построил</h4>
        <div className="case__solution">
          {c.solution.map(s => (
            <div key={s.title} className="case__item">
              <span className="case__item-mark" style={{ background: color }} />
              <div>
                <p className="case__item-title">{s.title}</p>
                <p className="case__item-desc">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="case__block">
        <h4 className="case__h" style={{ '--hc': color }}>Стек</h4>
        <div className="case__stack">
          {c.stack.map(g => (
            <div key={g.group} className="case__stack-row">
              <span className="case__stack-group">{g.group}</span>
              <div className="case__stack-tags">
                {g.items.map(t => (
                  <span key={t} className="tag" style={{ '--tc': color }}>{t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="case__block">
        <h4 className="case__h" style={{ '--hc': color }}>Как это выглядит</h4>
        <div className="case__shots">
          {c.shots.map(s => (
            <Shot
              key={s.file}
              src={CASES_URL + c.slug + '/' + s.file}
              path={`public/cases/${c.slug}/${s.file}`}
              caption={s.caption}
              color={color}
            />
          ))}
        </div>
      </section>
    </div>
  )
}

export default function Projects() {
  const [modal, setModal] = useState(null)

  // Esc закрывает модалку, инерционный скролл страницы под ней замирает
  useEffect(() => {
    if (!modal) return
    const onEsc = e => { if (e.key === 'Escape') setModal(null) }
    window.addEventListener('keydown', onEsc)
    window.__lenis?.stop()
    return () => {
      window.removeEventListener('keydown', onEsc)
      window.__lenis?.start()
    }
  }, [modal])

  const handleTilt = e => {
    const card = e.currentTarget
    const inner = card.querySelector('.project-card__tilt')
    const glare = card.querySelector('.project-card__glare')
    const r = card.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    if (inner) inner.style.transform = `rotateX(${(0.5 - py) * 11}deg) rotateY(${(px - 0.5) * 11}deg)`
    if (glare) glare.style.background = `radial-gradient(circle at ${px * 100}% ${py * 100}%, rgba(255,255,255,0.16), transparent 46%)`
  }

  const resetTilt = e => {
    const inner = e.currentTarget.querySelector('.project-card__tilt')
    const glare = e.currentTarget.querySelector('.project-card__glare')
    if (inner) inner.style.transform = ''
    if (glare) glare.style.background = 'transparent'
  }

  return (
    <section id="projects" className="projects">
      <div className="projects__blob blob" style={{ width: 400, height: 400, background: '#c770f0', bottom: 0, right: '-80px' }} />

      <div className="projects__inner">
        <RevealText text="Мои проекты" accent="проекты" />

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
              onMouseMove={handleTilt}
              onMouseLeave={resetTilt}
            >
              <div className="project-card__tilt">
                <span className="project-card__glare" />
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
                {p.caseStudy && (
                  <button className="banner-play-btn" onClick={() => setModal(p)} style={{ '--pc': p.color }}>
                    <FaBookOpen /> Смотреть кейс
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
              className={modal.caseStudy ? 'app-modal__window app-modal__window--case' : 'app-modal__window'}
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
                <span className="app-modal__title">
                  {modal.caseStudy ? `${modal.title} — кейс` : modal.title}
                </span>
                <button className="app-modal__close" onClick={() => setModal(null)}>
                  <FaTimes />
                </button>
              </div>

              {modal.caseStudy ? (
                // data-lenis-prevent — иначе остановленный Lenis глотает колесо мыши
                <div className="app-modal__scroll" data-lenis-prevent>
                  <CaseBody project={modal} />
                </div>
              ) : (
                <iframe
                  key={modal.app}
                  src={modal.app}
                  title={modal.title}
                  className="app-modal__frame"
                  sandbox="allow-scripts allow-same-origin allow-forms"
                />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
