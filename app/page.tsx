'use client'

import { HomeHeader } from '@/components/home/header'
import { HeroSection } from '@/components/home/hero-section'
import { GamesSection } from '@/components/home/games-section'
import Footer from '@/components/PLINKO/Footer'

export default function HomePage() {

  return (
    <div className="min-h-screen text-white bg-black relative">
      {/* Header */}
      <HomeHeader />

      {/* Hero Section */}
      <HeroSection />

      {/* Games Section */}
      <GamesSection />

      {/* Footer */}
      <Footer />
    </div>
  )
}
