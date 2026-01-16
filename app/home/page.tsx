'use client'

import Image from 'next/image'
import Link from 'next/link'
import { HomeHeader } from '@/components/home/header'
import { PaymentBadges } from '@/components/home/payment-badges'
import { DottedGlowBackground } from '@/components/ui/dotted-glow-background'
import Footer from '@/components/PLINKO/Footer'

export default function HomePage() {

  return (
    <div className="min-h-screen text-white bg-black relative">
      {/* Animated Dotted Background */}
      <DottedGlowBackground
        className="pointer-events-none z-0"
        gap={35}
        radius={5}
        color="rgba(255, 255, 255, 0.32)"
        glowColor="rgba(255, 255, 255, 0.66)"
        opacity={0.8}
        backgroundOpacity={0.1}
        speedMin={0.3}
        speedMax={1.2}
        speedScale={1}
      />

      {/* Header */}
      <HomeHeader />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-16 min-h-screen">
        {/* Large Title */}
        <div className="text-center mb-16">
          {/* Title removed as requested */}
        </div>

        {/* Games Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto relative">

          {/* Lottery Card */}
          <Link href="/" className="group block">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-900/20 to-purple-600/20 backdrop-blur-sm border border-purple-500/30 hover:border-transparent transition-all duration-300 hover:scale-105 h-80 w-80 group-hover:shadow-[0_0_30px_rgba(168,85,247,0.4)] before:absolute before:inset-0 before:rounded-2xl before:p-[2px] before:bg-gradient-to-r before:from-red-500 before:via-yellow-500 before:via-green-500 before:via-blue-500 before:via-purple-500 before:to-red-500 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300">
              <div className="relative h-full w-full rounded-2xl overflow-hidden">
                <Image
                  src="/morbius/c1771d59-f602-438e-85b8-0c55b4938c9a.png"
                  alt="Mega Morbius Lotto"
                  fill
                  className="object-cover opacity-60 group-hover:opacity-70 transition-opacity duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <PaymentBadges />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className="text-2xl font-bold text-white mb-2">Mega Morbius Lotto</h3>
                  <p className="text-white/60">Pick 6 numbers and win big prizes</p>
                </div>
              </div>
            </div>
          </Link>

          {/* Keno Card */}
          <Link href="/keno" className="group block">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-900/20 to-blue-600/20 backdrop-blur-sm border border-blue-500/30 hover:border-transparent transition-all duration-300 hover:scale-105 h-80 w-80 group-hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] before:absolute before:inset-0 before:rounded-2xl before:p-[2px] before:bg-gradient-to-r before:from-red-500 before:via-yellow-500 before:via-green-500 before:via-blue-500 before:via-purple-500 before:to-red-500 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300">
              <div className="relative h-full w-full rounded-2xl overflow-hidden">
                <Image
                  src="/morbius/Kenobg.png"
                  alt="Crypto Keno"
                  fill
                  className="object-cover opacity-60 group-hover:opacity-70 transition-opacity duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <PaymentBadges />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className="text-2xl font-bold text-white mb-2">Crypto Keno</h3>
                  <p className="text-white/60">Choose your spots and hit the jackpot</p>
                </div>
              </div>
            </div>
          </Link>

          {/* Plinko Card */}
          <Link href="/PLINKO" className="group block">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-900/20 to-green-600/20 backdrop-blur-sm border border-green-500/30 hover:border-transparent transition-all duration-300 hover:scale-105 h-80 w-80 group-hover:shadow-[0_0_30px_rgba(34,197,94,0.4)] before:absolute before:inset-0 before:rounded-2xl before:p-[2px] before:bg-gradient-to-r before:from-red-500 before:via-yellow-500 before:via-green-500 before:via-blue-500 before:via-purple-500 before:to-red-500 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300">
              <div className="relative h-full w-full rounded-2xl overflow-hidden">
                <Image
                  src="/morbius/6f4a92af-ecc2-4cf5-aca9-18a429a4b181.png"
                  alt="Plinko"
                  fill
                  className="object-cover opacity-60 group-hover:opacity-70 transition-opacity duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <PaymentBadges />
                <div className="absolute bottom-0 left-0 right-0 p-2">
                  <h3 className="text-2xl font-bold text-white mb-2">Plinko</h3>
                  <p className="text-white/60">Drop the ball and watch it bounce to victory</p>
                </div>
              </div>
            </div>
          </Link>

        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}