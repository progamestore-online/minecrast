import { useState, useEffect, useCallback } from 'react'

interface TextItem {
  id: number
  text: string
  color: string
  timestamp: number
}

let nextId = 0

export function useFloatingTexts() {
  const [texts, setTexts] = useState<TextItem[]>([])

  useEffect(() => {
    const interval = setInterval(() => {
      setTexts(prev => prev.filter(t => Date.now() - t.timestamp < 2000))
    }, 100)
    return () => clearInterval(interval)
  }, [])

  const addText = useCallback((text: string, color = 'text-green-400') => {
    setTexts(prev => [...prev, { id: nextId++, text, color, timestamp: Date.now() }])
  }, [])

  return { texts, addText }
}

interface FloatingTextsProps {
  texts: TextItem[]
}

export function FloatingTexts({ texts }: FloatingTextsProps) {
  return (
    <div className="absolute top-1/3 left-1/2 -translate-x-1/2 pointer-events-none select-none flex flex-col items-center gap-1">
      {texts.map(t => {
        const age = (Date.now() - t.timestamp) / 2000
        return (
          <span
            key={t.id}
            className={`${t.color} font-bold text-sm transition-all`}
            style={{
              opacity: 1 - age,
              transform: `translateY(${-age * 40}px)`,
            }}
          >
            {t.text}
          </span>
        )
      })}
    </div>
  )
}
