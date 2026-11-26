import { useProgress } from '@react-three/drei'
import { useEffect, useState } from 'react'

export default function Loader() {
  const { active, progress } = useProgress()
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (!active) {
      const t = setTimeout(() => setVisible(false), 400)
      return () => clearTimeout(t)
    }
    setVisible(true)
  }, [active])

  if (!visible) return null

  return (
    <div className={'loader' + (active ? '' : ' loader--fuera')}>
      <span className="loader__titulo">Casa Jardín</span>
      <div className="loader__barra">
        <div style={{ width: `${progress}%` }} />
      </div>
      <span className="loader__pct">{Math.round(progress)}%</span>
    </div>
  )
}
