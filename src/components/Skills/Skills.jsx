import { motion } from 'framer-motion'
import {
  FaReact, FaNodeJs, FaGitAlt, FaPython, FaHtml5, FaCss3Alt,
} from 'react-icons/fa'
import {
  SiJavascript, SiTypescript, SiPostgresql,
  SiNextdotjs, SiTailwindcss,
} from 'react-icons/si'
import './Skills.css'

const tiles = [
  { icon: <FaHtml5 />,       name: 'HTML',       color: '#e34f26', size: 'md' },
  { icon: <FaCss3Alt />,     name: 'CSS',        color: '#1572b6', size: 'md' },
  { icon: <SiJavascript />,  name: 'JavaScript', color: '#f7df1e', size: 'md' },
  { icon: <FaReact />,       name: 'React',      color: '#61dafb', size: 'lg' },
  { icon: <FaNodeJs />,      name: 'Node.js',    color: '#83cd29', size: 'lg' },
  { icon: <SiTypescript />,  name: 'TypeScript', color: '#3178c6', size: 'md' },
  { icon: <SiNextdotjs />,   name: 'Next.js',    color: '#fff',    size: 'md' },
  { icon: <SiPostgresql />,  name: 'PostgreSQL', color: '#336791', size: 'md' },
  { icon: <SiTailwindcss />, name: 'Tailwind',   color: '#38bdf8', size: 'sm' },
  { icon: <FaPython />,      name: 'Python',     color: '#ffd43b', size: 'sm' },
  { icon: <FaGitAlt />,      name: 'Git',        color: '#f05032', size: 'sm' },
]

export default function Skills() {
  return (
    <section id="skills" className="skills">
      <div className="skills__blob blob" style={{ width: 400, height: 400, background: '#38bdf8', top: '30%', right: '-80px' }} />
      <div className="skills__inner">
        <h2 className="section-title">Мой <span>стек</span></h2>

        <div className="skills__bento">
          {tiles.map((t, i) => (
            <motion.div
              key={t.name}
              className={`skill-tile skill-tile--${t.size}`}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04, duration: 0.35 }}
              whileHover={{ y: -4, scale: 1.04 }}
            >
              <span className="skill-tile__icon" style={{ color: t.color }}>{t.icon}</span>
              <span className="skill-tile__name">{t.name}</span>
            </motion.div>
          ))}
        </div>

        <motion.div
          className="skills__summary"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <div className="skills__sum-item">
            <span className="skills__sum-num">2+</span>
            <span className="skills__sum-label">Года в разработке</span>
          </div>
          <div className="skills__sum-divider" />
          <div className="skills__sum-item">
            <span className="skills__sum-num">5+</span>
            <span className="skills__sum-label">Публичных проектов</span>
          </div>
          <div className="skills__sum-divider" />
          <div className="skills__sum-item">
            <span className="skills__sum-num">Full</span>
            <span className="skills__sum-label">Stack разработка</span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
