'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { DottedGlowBackground } from '@/components/ui/dotted-glow-background'

export function HeroSection() {
  return (
    <section className="relative h-screen flex items-start justify-center overflow-hidden pt-4">
      {/* Dotted Glow Background - Fade in slowly */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2, ease: "easeOut" }}
        className="absolute inset-0"
      >
        <DottedGlowBackground
          className="pointer-events-none z-0"
          gap={20}
          radius={2}
          color="rgba(6, 182, 212, 0.6)"
          glowColor="rgba(6, 182, 212, 1.0)"
          opacity={0.8}
          backgroundOpacity={0}
          edgeFadeOpacity={0.9}
          speedMin={0.3}
          speedMax={1.0}
          speedScale={0.7}
        />
      </motion.div>

      {/* Hero Content Overlay */}
      <div className="relative z-10 text-center px-4 max-w-3xl mx-auto mt-8">
        {/* Logo - Slide in from top */}
        <motion.div
          className="mb-4"
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
        >
          <Image
            src="/morbius/MorbiusLogo (3).png"
            alt="Morbius Lotto"
            width={200}
            height={100}
            className="mx-auto mb-4 opacity-90"
          />
        </motion.div>

        {/* Title - Fade in with scale */}
        <motion.h1
          className="text-3xl md:text-5xl lg:text-6xl font-black text-white mb-4 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.8, ease: "easeOut" }}
        >
          Welcome to Morbius Gaming
        </motion.h1>

        {/* Description - Fade in */}
        <motion.p
          className="text-base md:text-lg lg:text-xl text-white/80 mb-6 max-w-xl mx-auto leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.2, ease: "easeOut" }}
        >
          DeFi Gaming Done Right
        </motion.p>

        {/* Buttons - Slide from bottom with stagger */}
        <motion.div
          className="grid grid-cols-3 gap-3 justify-center items-center max-w-md mx-auto scale-50 sm:scale-75 md:scale-100"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.5 }}
        >
          <motion.button
            onClick={() => window.open('https://pulsechain.com', '_blank')}
            className="px-2 py-2 bg-gradient-to-b from-cyan-600/80 to-cyan-800 text-white font-bold text-base rounded-full hover:from-purple-500 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-purple-500/25"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.6, ease: "easeOut" }}
          >
            Get Morbius
          </motion.button>

          <motion.button
            onClick={() => window.open('https://pulsechain.com/what-is-pulsechain', '_blank')}
            className="px-2 py-2 bg-gradient-to-b from-cyan-600/80 to-cyan-800 text-white font-bold text-base rounded-full hover:from-cyan-500 hover:to-cyan-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-cyan-500/25"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.8, ease: "easeOut" }}
          >
            What is PulseChain?
          </motion.button>

          <motion.button
            onClick={() => {
              const gamesSection = document.querySelector('main');
              gamesSection?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-2 py-2 bg-gradient-to-b from-cyan-600/80 to-cyan-800 text-white font-bold text-base rounded-full hover:from-pink-500 hover:to-pink-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-pink-500/25"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 2.0, ease: "easeOut" }}
          >
            Games
          </motion.button>
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        className="absolute bottom-25 left-1/2 transform -translate-x-1/2 z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 2.5, ease: "easeOut" }}
      >
        <div className="animate-bounce">
          <svg className="w-6 h-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </motion.div>
    </section>
  )
}