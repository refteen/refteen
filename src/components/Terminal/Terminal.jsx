import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import './Terminal.css'
import RevealText from '../Effects/RevealText'

const BOOT = [
  'refteen OS v1.0.0 — загрузка ядра...',
  'Инициализация модулей разработчика... ok',
  'Загрузка стека: React · Node · PostgreSQL... ok',
  'Система готова. Введи help и жми Enter.',
]

const HINTS = ['help', 'about', 'projects', 'hire', 'github', 'theme', 'matrix', 'clear']

const ALL_CMDS = ['help', 'about', 'whoami', 'skills', 'projects', 'contact', 'social', 'hire', 'neofetch', 'github', 'theme', 'matrix', 'ls', 'dota', 'clear', 'exit']

const PROMPT = 'refteen@portfolio:~$'

const THEMES = [
  { name: 'neon-purple', a: '#c770f0', b: '#38bdf8' },
  { name: 'matrix-green', a: '#22c55e', b: '#4ade80' },
  { name: 'cyber-cyan', a: '#22d3ee', b: '#818cf8' },
  { name: 'sunset', a: '#fb7185', b: '#fbbf24' },
]

// PLACEHOLDER_HELPERS
function MatrixRain({ onExit }) {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const parent = canvas.parentElement
    canvas.width = parent.clientWidth
    canvas.height = parent.clientHeight
    const size = 14
    const cols = Math.floor(canvas.width / size)
    const drops = Array(cols).fill(0)
    const chars = 'アイウエオカキ0123456789<>{}[]refteen'.split('')
    let raf, last = 0, running = true
    const draw = t => {
      if (t - last > 45) {
        last = t
        ctx.fillStyle = 'rgba(6,6,18,0.12)'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.fillStyle = '#22c55e'
        ctx.font = size + 'px monospace'
        drops.forEach((y, i) => {
          const ch = chars[Math.floor(Math.random() * chars.length)]
          ctx.fillText(ch, i * size, y * size)
          if (y * size > canvas.height && Math.random() > 0.975) drops[i] = 0
          drops[i]++
        })
      }
      if (running) raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    const timer = setTimeout(onExit, 7000)
    return () => { running = false; cancelAnimationFrame(raf); clearTimeout(timer) }
  }, [onExit])
  return <canvas ref={ref} className="term-matrix" onClick={onExit} />
}

function TypeText({ text, play }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (n >= text.length) return
    const t = setTimeout(() => {
      setN(v => v + 1)
      if (n % 2 === 0) play?.()
      const el = document.querySelector('.terminal__body')
      if (el) el.scrollTop = el.scrollHeight
    }, 16)
    return () => clearTimeout(t)
  }, [n, text, play])
  return (
    <span className="type-text">
      {text.slice(0, n)}
      {n < text.length && <span className="type-cursor">▋</span>}
    </span>
  )
}

// PLACEHOLDER_COMPONENT
export default function Terminal() {
  const [history, setHistory] = useState([])
  const [value, setValue] = useState('')
  const [cmdLog, setCmdLog] = useState([])
  const [histIdx, setHistIdx] = useState(-1)
  const [bootLine, setBootLine] = useState(0)
  const [muted, setMuted] = useState(false)
  const [matrix, setMatrix] = useState(false)
  const [themeIdx, setThemeIdx] = useState(0)
  const booted = useRef(false)
  const bodyRef = useRef(null)
  const inputRef = useRef(null)
  const audioRef = useRef(null)

  const playKey = (kind = 'key') => {
    if (muted) return
    try {
      if (!audioRef.current) audioRef.current = new (window.AudioContext || window.webkitAudioContext)()
      const ctx = audioRef.current
      if (ctx.state === 'suspended') ctx.resume()
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'square'
      o.frequency.value = kind === 'enter' ? 90 : 140 + Math.random() * 80
      const peak = kind === 'enter' ? 0.06 : 0.03
      g.gain.setValueAtTime(peak, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + (kind === 'enter' ? 0.09 : 0.045))
      o.connect(g)
      g.connect(ctx.destination)
      o.start()
      o.stop(ctx.currentTime + 0.1)
    } catch { /* audio not supported */ }
  }

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [history, bootLine])

  const startBoot = () => {
    if (booted.current) return
    booted.current = true
    let i = 0
    const iv = setInterval(() => {
      i++
      setBootLine(i)
      if (i >= BOOT.length) clearInterval(iv)
    }, 480)
  }

  const push = (input, output) => setHistory(h => [...h, { input, output }])

  const run = raw => {
    const cmd = raw.trim().toLowerCase()
    if (!cmd) { push(raw, null); return }
    setCmdLog(l => [...l, raw])
    setHistIdx(-1)

    if (cmd === 'clear') { setHistory([]); return }

    if (cmd === 'matrix') {
      setMatrix(true)
      push(raw, <p className="t-dim">Добро пожаловать в Матрицу. Клик — выход.</p>)
      return
    }

    if (cmd.split(' ')[0] === 'theme') {
      const next = (themeIdx + 1) % THEMES.length
      setThemeIdx(next)
      const th = THEMES[next]
      document.documentElement.style.setProperty('--accent', th.a)
      document.documentElement.style.setProperty('--accent2', th.b)
      push(raw, <p>Тема сайта изменена → <span className="t-accent">{th.name}</span> <span className="t-dim">(введи theme ещё раз)</span></p>)
      return
    }

    if (cmd === 'github') {
      const id = 'gh-' + Date.now()
      setHistory(h => [...h, { input: raw, id, output: <p className="t-dim">Запрос к api.github.com...</p> }])
      fetch('https://api.github.com/users/refteen')
        .then(r => r.json())
        .then(d => {
          const out = (
            <div className="term-grid">
              <span className="t-key">repos</span><span>{d.public_repos ?? '—'} публичных репозиториев</span>
              <span className="t-key">followers</span><span>{d.followers ?? '—'} подписчиков</span>
              <span className="t-key">since</span><span>на GitHub с {d.created_at ? new Date(d.created_at).getFullYear() : '—'}</span>
              <span className="t-key">link</span><span><a href="https://github.com/refteen" target="_blank" rel="noreferrer" className="t-link">github.com/refteen</a></span>
            </div>
          )
          setHistory(h => h.map(e => e.id === id ? { ...e, output: out } : e))
        })
        .catch(() => setHistory(h => h.map(e => e.id === id ? { ...e, output: <p className="t-warn">Не удалось получить данные (лимит API?)</p> } : e)))
      return
    }

    push(raw, resolve(cmd))
  }
  // PLACEHOLDER_RESOLVE2
  const resolve = cmd => {
    const first = cmd.split(' ')[0]
    switch (first) {
      case 'help':
        return (
          <div className="term-grid">
            <span className="t-key">about</span><span>кто я и чем занимаюсь</span>
            <span className="t-key">skills</span><span>мой технологический стек</span>
            <span className="t-key">projects</span><span>над чем я работал</span>
            <span className="t-key">contact</span><span>как со мной связаться</span>
            <span className="t-key">github</span><span>живая статистика профиля</span>
            <span className="t-key">neofetch</span><span>инфо-карточка обо мне</span>
            <span className="t-key">theme</span><span>сменить цвет сайта</span>
            <span className="t-key">matrix</span><span>👾 цифровой дождь</span>
            <span className="t-key">hire</span><span>🔥 обсудить твой проект</span>
            <span className="t-key">clear</span><span>очистить консоль</span>
            <span className="t-dim">Tab</span><span className="t-dim">— автодополнение · ↑↓ — история команд</span>
          </div>
        )
      case 'about':
      case 'whoami':
        return <TypeText play={playKey} text={'Вячеслав Погуляйченко — Full Stack разработчик.\nСобираю веб-приложения целиком: база данных, API, интерфейс, деплой.\nЛюблю чистый код, продуманный UX и задачи со звёздочкой.'} />
      case 'skills':
        return (
          <p>
            <span className="t-accent">Frontend:</span> React, Next.js, TypeScript, Tailwind<br />
            <span className="t-accent">Backend:</span> Node.js, PostgreSQL, REST API<br />
            <span className="t-accent">Инструменты:</span> Git, Python, Canvas API
          </p>
        )
      case 'projects':
        return (
          <p>
            <span className="t-accent">→</span> <a href="https://derevnya-map.ru" target="_blank" rel="noreferrer" className="t-link">derevnya-map.ru</a> — платформа бронирования жилья<br />
            <span className="t-accent">→</span> Snake · Memory · Gradient Generator — мини-приложения<br />
            <span className="t-accent">→</span> Telegram-боты на Python<br />
            <span className="t-dim">Прокрути вверх к разделу «Проекты», чтобы запустить их прямо здесь.</span>
          </p>
        )
      case 'contact':
      case 'social':
        return (
          <p>
            <span className="t-accent">Telegram:</span> <a href="https://t.me/ewiwt" target="_blank" rel="noreferrer" className="t-link">@ewiwt</a><br />
            <span className="t-accent">ВКонтакте:</span> <a href="https://vk.ru/refteenyt" target="_blank" rel="noreferrer" className="t-link">vk.ru/refteenyt</a><br />
            <span className="t-accent">GitHub:</span> <a href="https://github.com/refteen" target="_blank" rel="noreferrer" className="t-link">github.com/refteen</a>
          </p>
        )
      case 'hire':
        return (
          <div className="term-hire">
            <p className="term-hire__line">🚀 Отличный выбор. Давай превратим твою идею в рабочий продукт.</p>
            <a href="https://t.me/ewiwt" target="_blank" rel="noreferrer" className="term-hire__btn">Написать в Telegram →</a>
          </div>
        )
      case 'neofetch':
        return (
          <div className="term-neofetch">
            <pre className="term-ascii">{`   /\\_/\\
  ( o.o )
   > ^ <`}</pre>
            <div className="term-nf-info">
              <div><span className="t-accent">refteen</span>@<span className="t-accent">portfolio</span></div>
              <div className="t-dim">─────────────────</div>
              <div><span className="t-accent">OS:</span> refteen OS 1.0.0</div>
              <div><span className="t-accent">Role:</span> Full Stack Developer</div>
              <div><span className="t-accent">Stack:</span> React · Node · PostgreSQL</div>
              <div><span className="t-accent">Опыт:</span> 2+ года в продакшене</div>
              <div><span className="t-accent">Статус:</span> <span style={{ color: '#4ade80' }}>● открыт для проектов</span></div>
            </div>
          </div>
        )
      case 'ls':
        return <TypeText play={playKey} text={'about.md   skills.json   projects/   contact.txt   secrets.env'} />
      case 'cat':
        if (cmd.includes('secrets')) return <p className="t-warn">🔒 Доступ запрещён. Хорошая попытка 😏</p>
        return <p className="t-dim">Укажи файл: cat about.md</p>
      case 'sudo':
        return <p className="t-warn">Права root не нужны — я и так всё сделаю за тебя 😎</p>
      case 'rm':
        return <p className="t-warn">Обошлось. Ничего не сломалось 😄</p>
      case 'dota':
        return <TypeText play={playKey} text={'MMR засекречен. AutoAccept уже принял катку за тебя ✦'} />
      case 'exit':
        return <p className="t-dim">Отсюда так просто не выйти. Лучше введи hire 😉</p>
      default:
        return <TypeText play={playKey} text={`command not found: ${first} — введи help`} />
    }
  }

  const onKey = e => {
    if (e.key === 'Enter') {
      playKey('enter')
      run(value)
      setValue('')
    } else if (e.key === 'Tab') {
      e.preventDefault()
      const typed = value.trim().toLowerCase()
      if (!typed) return
      const match = ALL_CMDS.find(c => c.startsWith(typed))
      if (match) { playKey(); setValue(match) }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (!cmdLog.length) return
      const idx = histIdx < 0 ? cmdLog.length - 1 : Math.max(0, histIdx - 1)
      setHistIdx(idx)
      setValue(cmdLog[idx])
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (histIdx < 0) return
      const idx = histIdx + 1
      if (idx >= cmdLog.length) { setHistIdx(-1); setValue('') }
      else { setHistIdx(idx); setValue(cmdLog[idx]) }
    }
  }

  const runHint = c => { run(c); setValue(''); inputRef.current?.focus() }

  return (
    <section id="terminal" className="terminal">
      <div className="terminal__blob blob" style={{ width: 420, height: 420, background: '#38bdf8', top: '20%', left: '-100px' }} />

      <div className="terminal__inner">
        <RevealText text="Живой терминал" accent="терминал" />
        <p className="terminal__sub">Не просто текст — попробуй сам. Вводи команды или жми на подсказки ниже.</p>

        <motion.div
          className="terminal__window"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          onViewportEnter={startBoot}
          transition={{ duration: 0.6 }}
          onClick={() => inputRef.current?.focus()}
        >
          <div className="terminal__bar">
            <span className="dot red" />
            <span className="dot yellow" />
            <span className="dot green" />
            <span className="terminal__bar-title">bash — refteen dev</span>
            <button
              className="terminal__mute"
              onClick={e => { e.stopPropagation(); setMuted(m => !m) }}
              title={muted ? 'Включить звук печати' : 'Выключить звук печати'}
              aria-label="toggle sound"
            >
              {muted ? '🔇' : '🔊'}
            </button>
          </div>

          <div className="terminal__body" ref={bodyRef}>
            {matrix && <MatrixRain onExit={() => setMatrix(false)} />}

            {BOOT.slice(0, bootLine).map((line, i) => (
              <div key={i} className="term-boot">{line}</div>
            ))}

            {bootLine >= BOOT.length && history.map((h, i) => (
              <div key={i} className="term-entry">
                <div className="term-cmd">
                  <span className="term-prompt">{PROMPT}</span>
                  <span className="term-input">{h.input}</span>
                </div>
                {h.output && <div className="term-out">{h.output}</div>}
              </div>
            ))}

            {bootLine >= BOOT.length && (
              <div className="term-cmd term-live">
                <span className="term-prompt">{PROMPT}</span>
                <input
                  ref={inputRef}
                  className="term-field"
                  value={value}
                  onChange={e => { if (e.target.value.length > value.length) playKey(); setValue(e.target.value) }}
                  onKeyDown={onKey}
                  spellCheck={false}
                  autoComplete="off"
                  aria-label="terminal input"
                />
                <span className="term-caret" />
              </div>
            )}
          </div>
        </motion.div>

        <div className="terminal__hints">
          {HINTS.map(c => (
            <button key={c} className="term-hint" onClick={() => runHint(c)}>{c}</button>
          ))}
        </div>
      </div>
    </section>
  )
}
