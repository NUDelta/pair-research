import type { CSSProperties } from 'react'
import { useEffect } from 'react'

interface PairingSuccessConfettiProps {
  onComplete: () => void
}

const COLORS = ['#f97316', '#eab308', '#22c55e', '#0ea5e9', '#ef4444']
const PIECES = Array.from({ length: 28 }, (_, index) => ({
  id: index,
  left: 4 + (index * 3.3) % 92,
  rotation: (index * 29) % 360,
  delay: (index % 7) * 0.06,
  duration: 1.8 + (index % 5) * 0.18,
  color: COLORS[index % COLORS.length],
}))

const PairingSuccessConfetti = ({ onComplete }: PairingSuccessConfettiProps) => {
  useEffect(() => {
    const timeout = window.setTimeout(onComplete, 2600)
    return () => window.clearTimeout(timeout)
  }, [onComplete])

  return (
    <>
      <style>
        {`
          @keyframes groups-confetti-fall {
            0% {
              transform: translate3d(0, -12vh, 0) rotate(0deg);
              opacity: 0;
            }
            15% {
              opacity: 1;
            }
            100% {
              transform: translate3d(0, 110vh, 0) rotate(540deg);
              opacity: 0;
            }
          }
        `}
      </style>
      <div
        className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
        aria-hidden="true"
        data-testid="pairing-success-confetti"
      >
        {PIECES.map(piece => (
          <span
            key={piece.id}
            className="absolute top-[-12vh] block rounded-sm opacity-0"
            style={{
              left: `${piece.left}%`,
              width: piece.id % 2 === 0 ? '0.45rem' : '0.35rem',
              height: piece.id % 3 === 0 ? '0.95rem' : '0.7rem',
              backgroundColor: piece.color,
              animationName: 'groups-confetti-fall',
              animationTimingFunction: 'linear',
              animationFillMode: 'forwards',
              animationDuration: `${piece.duration}s`,
              animationDelay: `${piece.delay}s`,
              transform: `rotate(${piece.rotation}deg)`,
            } satisfies CSSProperties}
          />
        ))}
      </div>
    </>
  )
}

export default PairingSuccessConfetti
