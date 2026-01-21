import type { Metadata } from 'next'
import './bigwheel.css'

export const metadata: Metadata = {
  title: 'Big Wheel | Morbius Casino',
  description: 'Classic Big Six Money Wheel casino game with real physics',
}

export default function BigWheelLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
