import './AuroraBackground.css'

// Живой градиентный фон: медленно переливающиеся тёмные пятна за контентом.
// screen-blend + низкая насыщенность — подсвечивает фон, не мешая читаемости.
export default function AuroraBackground() {
  return (
    <div className="aurora" aria-hidden="true">
      <span className="aurora__layer aurora__layer--1" />
      <span className="aurora__layer aurora__layer--2" />
      <span className="aurora__layer aurora__layer--3" />
    </div>
  )
}
