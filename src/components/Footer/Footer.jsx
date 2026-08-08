import { FaGithub, FaTelegram, FaHeart } from 'react-icons/fa'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__logo">
          <span className="logo-bracket">&lt;</span>refteen<span className="logo-bracket">/&gt;</span>
        </div>
        <p className="footer__copy">
          Сделано с <FaHeart className="footer__heart" /> · Погуляйченко Вячеслав · {new Date().getFullYear()}
        </p>
        <div className="footer__links">
          <a href="https://github.com/refteen" target="_blank" rel="noreferrer"><FaGithub /></a>
          <a href="https://t.me/ewiwt" target="_blank" rel="noreferrer"><FaTelegram /></a>
        </div>
      </div>
    </footer>
  )
}
