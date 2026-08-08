import { useState } from 'react'
import { FaMusic, FaTimes } from 'react-icons/fa'
import './MusicPlayer.css'

export default function MusicPlayer() {
  const [open, setOpen] = useState(false)

  return (
    <div className={`music-player ${open ? 'music-player--open' : ''}`}>
      <button
        className="music-player__toggle"
        onClick={() => setOpen(o => !o)}
        title={open ? 'Закрыть' : 'Джизус — Автомат 🎵'}
      >
        {open ? <FaTimes /> : <FaMusic />}
      </button>

      {open && (
        <div className="music-player__card">
          <p className="music-player__label">Сейчас слушаю 🎧</p>
          <iframe
            frameBorder="0"
            allow="clipboard-write"
            style={{ border: 'none', width: '100%', height: '200px', display: 'block', borderRadius: '10px' }}
            src="https://music.yandex.ru/iframe/album/24033394/track/105560935"
            title="Джизус — Автомат"
          />
        </div>
      )}
    </div>
  )
}
