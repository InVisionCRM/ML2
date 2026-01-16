import type { Metadata } from 'next'
import './plinko.css'

export const metadata: Metadata = {
  title: 'Plinko Classic',
  description: 'Classic Plinko game with physics simulation',
}

export default function PlinkoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
