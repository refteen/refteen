import { useState, useEffect } from 'react'

const phrases = [
  'Создавать классные продукты',
  'Решать сложные задачи',
  'Писать чистый код',
  'Разрабатывать с нуля',
  'Играть в доту',
  'Воплощать идеи в жизнь',
  'Слушать Джизуса',
]

export function useTypewriter() {
  const [text, setText] = useState('')
  const [phase, setPhase] = useState('typing') // typing | pause | erasing | pause2
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const current = phrases[index]

    if (phase === 'typing') {
      if (text.length < current.length) {
        const t = setTimeout(() => setText(current.slice(0, text.length + 1)), 55)
        return () => clearTimeout(t)
      } else {
        const t = setTimeout(() => setPhase('erasing'), 1500)
        return () => clearTimeout(t)
      }
    }

    if (phase === 'erasing') {
      if (text.length > 0) {
        const t = setTimeout(() => setText(text.slice(0, -1)), 35)
        return () => clearTimeout(t)
      } else {
        const t = setTimeout(() => {
          setIndex(i => (i + 1) % phrases.length)
          setPhase('typing')
        }, 250)
        return () => clearTimeout(t)
      }
    }
  }, [text, phase, index])

  return text
}
