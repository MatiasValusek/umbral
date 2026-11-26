import { useEffect, type ReactNode } from 'react'

type Props = { titulo: string; onClose: () => void; children: ReactNode; className?: string }

export default function Modal({ titulo, onClose, children, className = '' }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={titulo} onClick={onClose}>
      <div className={'modal__caja ' + className} onClick={(e) => e.stopPropagation()}>
        <header className="modal__cabecera">
          <h2>{titulo}</h2>
          <button className="modal__cerrar" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </header>
        {children}
      </div>
    </div>
  )
}
