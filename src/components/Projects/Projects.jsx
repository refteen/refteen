import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FaGithub, FaExternalLinkAlt, FaMap, FaServer, FaEnvelope, FaGamepad, FaYoutube, FaCode, FaKeyboard, FaPalette, FaTimes, FaPlay, FaLaptopCode, FaBookOpen, FaRegImage, FaTelegramPlane, FaFish, FaExpand } from 'react-icons/fa'
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
    title: 'Natura viva',
    desc: '3D-инсталляция в реальном времени: живой аквариум в тёмном музейном зале. Постучи по стеклу, выключи свет или фильтр, покорми рыб, слей воду — и посмотри, как ответит этот маленький мир.',
    tags: ['Three.js', 'WebGL', 'GLSL', 'Web Audio', 'JavaScript'],
    live: null,
    github: 'https://github.com/refteen/aquarium',
    icon: <FaFish />,
    color: '#5eead4',
    bg: 'linear-gradient(135deg, #03262a 0%, #020c10 100%)',
    app: '/refteen/apps/aquarium/index.html',
    // большое окно: полноценная 3D-сцена, а не мини-игра
    appWide: true,
    // обложка баннера; пока файла нет — обычный баннер с иконкой
    poster: '/refteen/cases/aquarium/poster.jpg',
    caseStudy: {
      slug: 'aquarium',
      tagline: 'Живой аквариум в браузере: 3D, свет и звук в реальном времени — без единого файла ассетов',
      meta: [
        { k: 'Роль', v: 'Автор — от идеи до шейдеров и звука' },
        { k: 'Формат', v: 'Интерактивная 3D-инсталляция' },
        { k: 'Ассеты', v: 'Ноль: всё генерируется кодом' },
        { k: 'Платформы', v: 'Браузер — десктоп и телефон' },
      ],
      problem:
        'Хотелось сделать не очередную демку шейдеров, а маленький мир, который живёт сам по себе и честно отвечает зрителю. ' +
        'Аквариум для этого идеален: вода, свет, растения и рыбы связаны между собой — потянешь за одну нить, и меняется всё остальное. ' +
        'Условие я поставил себе жёсткое: ни одного файла ассетов. Камни, трава, рыбы, текстуры и звук рождаются из кода прямо в браузере — и всё это должно работать даже на телефоне.',
      solution: [
        {
          title: 'Стая на boids',
          desc: '64 кардинала держат дистанцию, выравнивают курс и не отбиваются от своих. Стук по стеклу пугает ближайших, и страх волной прокатывается по всей стае. У трёх скалярий и пяти коридорасов — собственное поведение.',
        },
        {
          title: 'Вода и каустики на GPU',
          desc: 'Поверхность — симуляция волнового уравнения в шейдере: каждая капля и каждый пузырёк рисуют свои круги. Каустики на песке не нарисованы — они считаются из света, преломлённого этой самой поверхностью.',
        },
        {
          title: 'Свет и картинка',
          desc: 'Ивагуми из камней, ковёр травы и валлиснерия под лампой; лучи света в толще воды, HDR и bloom. Адаптивное разрешение подстраивает рендер под устройство, чтобы картинка оставалась плавной и на телефоне.',
        },
        {
          title: 'День и ночь',
          desc: 'Лампу можно выключить. Ночью кардиналы бледнеют и засыпают, как настоящие, а пузырьки кислорода «жемчужат» на траве только под светом.',
        },
        {
          title: 'Фильтр и экосистема',
          desc: 'Без фильтра поверхность становится зеркалом, течение замирает, вода медленно мутнеет и зеленеет, а рыбы поднимаются к поверхности — им не хватает кислорода.',
        },
        {
          title: 'Natura morta',
          desc: 'Если слить воду, время для рыб останавливается: они застывают в воздухе белыми фарфоровыми фигурками, как мобиль Колдера. Нальёшь снова — сверху обрушивается столб воды, и цвет возвращается к каждой рыбе, как только до неё поднимается вода.',
        },
        {
          title: 'Жители с именами',
          desc: 'Рыб можно покормить, а по клику — познакомиться. Скалярии и коридорасы носят имена Пегги Гуггенхайм и художников её круга: Пегги, Макс, Леонора — и Джексон, Марсель, Александр, Василий, Пит.',
        },
        {
          title: 'Звук без сэмплов',
          desc: 'Гул фильтра, бульканье, стук по стеклу, шум наливаемой воды — всё синтезируется через Web Audio в реальном времени, без единого аудиофайла.',
        },
      ],
      stack: [
        { group: 'Графика', items: ['Three.js', 'WebGL', 'GLSL-шейдеры'] },
        { group: 'Симуляция', items: ['Boids', 'Волновое уравнение на GPU', 'Каустики'] },
        { group: 'Рендер', items: ['HDR', 'Bloom', 'Адаптивное разрешение'] },
        { group: 'Звук', items: ['Web Audio API'] },
        { group: 'Язык', items: ['JavaScript'] },
      ],
      shots: [
        { file: 'viva.jpg', caption: 'Natura viva: день, ивагуми, стая кардиналов и каустики на песке' },
        { file: 'night.jpg', caption: 'Ночь: лампа погашена, кардиналы бледнеют и засыпают' },
        { file: 'murk.jpg', caption: 'Без фильтра: вода мутнеет и зеленеет, рыбы жмутся к поверхности' },
        { file: 'morta.jpg', caption: 'Natura morta: воды нет, рыбы застыли в воздухе фарфоровыми фигурками' },
      ],
      links: [
        // action: 'app' — не ссылка, а переключение модалки на саму инсталляцию
        { label: 'Запустить инсталляцию', action: 'app', icon: <FaPlay />, primary: true },
        { label: 'Открыть на весь экран', href: '/refteen/apps/aquarium/', icon: <FaExpand /> },
        { label: 'Исходный код', href: 'https://github.com/refteen/aquarium', icon: <FaGithub /> },
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
    title: 'TG MTProto Proxy Parser',
    desc: 'Десктопный парсер MTProto-прокси из публичных Telegram-каналов. Проверяет каждый прокси настоящим MTProto-хендшейком, а не пингом: в список попадают только живые — с задержкой и страной. Подключение в Telegram одним кликом.',
    tags: ['Python', 'asyncio', 'tkinter', 'MTProto', 'PyInstaller'],
    live: null,
    github: 'https://github.com/refteen/telegram-mtproto-proxy-parser',
    icon: <FaTelegramPlane />,
    color: '#2aabee',
    bg: 'linear-gradient(135deg, #062b40 0%, #03131f 100%)',
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

// Баннер карточки. Постер (если указан) проявляется поверх иконки, как только загрузится;
// нет файла или он не открылся — остаётся обычный баннер с иконкой.
function Banner({ project: p, onOpen }) {
  const [poster, setPoster] = useState('loading') // loading → ready | failed

  return (
    <div
      className={poster === 'ready' ? 'project-card__banner project-card__banner--poster' : 'project-card__banner'}
      style={{ background: p.bg }}
    >
      <div className="project-card__banner-glow" style={{ background: p.color }} />
      <span className="project-card__banner-icon" style={{ color: p.color }}>{p.icon}</span>
      {p.poster && poster !== 'failed' && (
        <div className="project-card__poster">
          <img src={p.poster} alt="" loading="lazy" onLoad={() => setPoster('ready')} onError={() => setPoster('failed')} />
        </div>
      )}
      <div className="project-card__banner-dots">
        {[...Array(12)].map((_, j) => (
          <span key={j} className="banner-dot" style={{ opacity: 0.06 + (j % 3) * 0.06 }} />
        ))}
      </div>
      {(p.app || p.caseStudy) && (
        <div className="banner-actions">
          {p.app && (
            <button className="banner-play-btn" onClick={() => onOpen(p, 'app')} style={{ '--pc': p.color }}>
              <FaPlay /> Запустить
            </button>
          )}
          {p.caseStudy && (
            <button className="banner-play-btn" onClick={() => onOpen(p, 'case')} style={{ '--pc': p.color }}>
              <FaBookOpen /> Смотреть кейс
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function CaseBody({ project, onLaunch }) {
  const c = project.caseStudy
  const color = project.color

  return (
    <div className="case">
      <header className="case__head">
        <h3 className="case__title">{project.title}</h3>
        <p className="case__tagline">{c.tagline}</p>

        <div className="case__links">
          {c.links.map(l => {
            const cls = l.primary ? 'case__link case__link--primary' : 'case__link'
            // action: 'app' — кнопка, которая переключает эту же модалку на приложение
            if (l.action === 'app') {
              return (
                <button key={l.label} type="button" className={cls} style={{ '--lc': color }} onClick={onLaunch}>
                  {l.icon} {l.label}
                </button>
              )
            }
            return (
              <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className={cls} style={{ '--lc': color }}>
                {l.icon} {l.label}
              </a>
            )
          })}
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

// Та же страница приложения без index.html — для отдельной вкладки на весь экран
const fullscreenUrl = p => p.app.replace(/index\.html$/, '')

export default function Projects() {
  // { project, mode: 'app' | 'case' } — какой проект открыт и что в окне: само приложение или кейс
  const [modal, setModal] = useState(null)
  const isOpen = modal !== null

  const open = (project, mode) => setModal({ project, mode })
  const close = () => setModal(null)

  // Esc закрывает модалку, инерционный скролл страницы под ней замирает
  useEffect(() => {
    if (!isOpen) return
    const onEsc = e => { if (e.key === 'Escape') setModal(null) }
    window.addEventListener('keydown', onEsc)
    window.__lenis?.stop()
    return () => {
      window.removeEventListener('keydown', onEsc)
      window.__lenis?.start()
    }
  }, [isOpen])

  // Открыть проект из другого блока сайта — например, командой aquarium в терминале:
  // window.dispatchEvent(new CustomEvent('portfolio:open', { detail: { title, mode } }))
  useEffect(() => {
    const onOpen = e => {
      const { title, mode } = e.detail || {}
      const p = projects.find(x => x.title === title)
      if (!p) return
      // просили то, чего у проекта нет, — показываем то, что есть
      const m = (mode === 'case' && p.caseStudy) || !p.app ? 'case' : 'app'
      if (m === 'case' && !p.caseStudy) return

      let shown = false
      const show = () => {
        if (shown) return
        shown = true
        setModal({ project: p, mode: m })
      }

      // Сначала доезжаем до «Проектов», потом открываем окно: открытая модалка останавливает Lenis
      const lenis = window.__lenis
      if (lenis && !lenis.isStopped) {
        lenis.scrollTo('#projects', { onComplete: show })
        setTimeout(show, 1600) // прокрутку перебили колесом — окно всё равно откроется
      } else {
        document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth' })
        show()
      }
    }
    window.addEventListener('portfolio:open', onOpen)
    return () => window.removeEventListener('portfolio:open', onOpen)
  }, [])

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

  const active = modal?.project
  const isCase = modal?.mode === 'case'
  // большое окно — только для самого приложения, кейс остаётся обычной ширины
  const wide = !isCase && active?.appWide
  const windowClass = isCase ? 'app-modal__window app-modal__window--case'
    : wide ? 'app-modal__window app-modal__window--wide'
    : 'app-modal__window'

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
                <Banner project={p} onOpen={open} />

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
            className={wide ? 'app-modal app-modal--wide' : 'app-modal'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          >
            <motion.div
              className={windowClass}
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="app-modal__bar" style={{ '--mc': active.color }}>
                <span className="dot red" />
                <span className="dot yellow" />
                <span className="dot green" />
                <span className="app-modal__title">
                  {isCase ? `${active.title} — кейс` : active.title}
                </span>
                {isCase && active.app && (
                  <button className="app-modal__action" onClick={() => open(active, 'app')}>
                    <FaPlay /> Запустить
                  </button>
                )}
                {!isCase && active.caseStudy && (
                  <button className="app-modal__action app-modal__action--ghost" onClick={() => open(active, 'case')}>
                    <FaBookOpen /> Кейс
                  </button>
                )}
                {wide && (
                  // отдельная вкладка; окно здесь закрываем, чтобы сцена и звук не работали дважды
                  <a className="app-modal__full" href={fullscreenUrl(active)} target="_blank" rel="noreferrer" onClick={close}>
                    на весь экран ↗
                  </a>
                )}
                <button className="app-modal__close" onClick={close}>
                  <FaTimes />
                </button>
              </div>

              {isCase ? (
                // data-lenis-prevent — иначе остановленный Lenis глотает колесо мыши
                <div className="app-modal__scroll" data-lenis-prevent>
                  <CaseBody project={active} onLaunch={() => open(active, 'app')} />
                </div>
              ) : (
                // большим 3D-приложениям — полноэкранный режим и звук без лишних кликов
                <iframe
                  key={active.app}
                  src={active.app}
                  title={active.title}
                  className="app-modal__frame"
                  sandbox="allow-scripts allow-same-origin allow-forms"
                  allow={wide ? 'fullscreen; autoplay' : undefined}
                  allowFullScreen={wide}
                />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
