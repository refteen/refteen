import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { FaGithub, FaHammer, FaHeadphones, FaCircle, FaArrowRight } from 'react-icons/fa'
import './Now.css'

// Что происходит прямо сейчас. Статичные пункты правятся здесь,
// активность на GitHub подтягивается живьём из публичного API.
const NOW = {
  doing: {
    title: 'Natura viva',
    text: '3D-аквариум на WebGL: шлифую звук и детали поведения рыб',
    project: 'Natura viva',
  },
  listening: { artist: 'Джизус', track: 'Автомат' },
  status: 'Открыт к новым проектам',
}

const GH_USER = 'refteen'
const CACHE_KEY = 'now:github'

function ago(iso) {
  const s = Math.max(1, (Date.now() - new Date(iso)) / 1000)
  const units = [[86400 * 30, 'мес.'], [86400, 'дн.'], [3600, 'ч'], [60, 'мин']]
  for (const [sec, u] of units) if (s >= sec) return `${Math.floor(s / sec)} ${u} назад`
  return 'только что'
}

function useGithubActivity() {
  const [data, setData] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(CACHE_KEY)) } catch { return null }
  })

  useEffect(() => {
    if (data) return
    let alive = true
    const api = path => fetch('https://api.github.com/' + path).then(r => (r.ok ? r.json() : Promise.reject(r.status)))
    // последний запушенный репозиторий и его свежий коммит
    api(`users/${GH_USER}/repos?sort=pushed&per_page=1`)
      .then(([repo]) => repo && api(`repos/${GH_USER}/${repo.name}/commits?per_page=1`).then(([c]) => ({
        repo: repo.name,
        message: c?.commit?.message?.split('\n')[0] || null,
        at: c?.commit?.committer?.date || repo.pushed_at,
      })))
      .then(d => {
        if (!d) return
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(d))
        if (alive) setData(d)
      })
      .catch(() => {})
    return () => { alive = false }
  }, [data])

  return data
}

const card = i => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { delay: i * 0.08, duration: 0.5 },
})

export default function Now() {
  const gh = useGithubActivity()

  return (
    <section className="now" id="now">
      <div className="now__inner">
        <motion.p className="now__eyebrow" {...card(0)}>
          <span className="now__pulse" /> Сейчас
        </motion.p>

        <div className="now__grid">
          <motion.button
            type="button"
            className="now-card now-card--doing" data-no-magnet
            {...card(1)}
            onClick={() => window.dispatchEvent(new CustomEvent('portfolio:open', { detail: { title: NOW.doing.project, mode: 'app' } }))}
          >
            <span className="now-card__k"><FaHammer /> Делаю</span>
            <span className="now-card__title">{NOW.doing.title}</span>
            <span className="now-card__text">{NOW.doing.text}</span>
            <span className="now-card__go">Открыть <FaArrowRight /></span>
          </motion.button>

          <motion.a
            className="now-card now-card--gh" data-no-magnet
            href={gh ? `https://github.com/${GH_USER}/${gh.repo}` : `https://github.com/${GH_USER}`}
            target="_blank"
            rel="noreferrer"
            {...card(2)}
          >
            <span className="now-card__k"><FaGithub /> Последний коммит</span>
            {gh ? (
              <>
                <span className="now-card__title">{gh.repo}</span>
                {gh.message && <span className="now-card__text now-card__mono">{gh.message}</span>}
                <span className="now-card__go">{ago(gh.at)}</span>
              </>
            ) : (
              <>
                <span className="now-card__title">github.com/{GH_USER}</span>
                <span className="now-card__text">Все репозитории и история коммитов</span>
                <span className="now-card__go">Перейти <FaArrowRight /></span>
              </>
            )}
          </motion.a>

          <motion.button
            type="button"
            className="now-card now-card--music" data-no-magnet
            {...card(3)}
            onClick={() => window.dispatchEvent(new CustomEvent('portfolio:music'))}
          >
            <span className="now-card__k"><FaHeadphones /> Слушаю</span>
            <span className="now-card__title">{NOW.listening.track}</span>
            <span className="now-card__text">{NOW.listening.artist}</span>
            <span className="now-eq" aria-hidden="true">
              {[...Array(5)].map((_, i) => <i key={i} style={{ animationDelay: `${i * -0.23}s` }} />)}
            </span>
          </motion.button>

          <motion.a className="now-card now-card--status" data-no-magnet href="#contact" {...card(4)}>
            <span className="now-card__k"><FaCircle className="now-card__dot" /> Статус</span>
            <span className="now-card__title">{NOW.status}</span>
            <span className="now-card__text">Веб-приложения, интерфейсы, 3D в браузере</span>
            <span className="now-card__go">Обсудить проект <FaArrowRight /></span>
          </motion.a>
        </div>
      </div>
    </section>
  )
}
