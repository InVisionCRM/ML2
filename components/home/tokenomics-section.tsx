'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { CometCard } from '@/components/ui/comet-card'

const fadeIn = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
}

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } }
}

export function TokenomicsSection() {
  return (
    <section className="relative py-24 px-4 overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.08)_0%,transparent_50%)] pointer-events-none" />

      <div className="container mx-auto max-w-5xl relative z-10">
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeIn}
        >
          <h2 className="text-5xl md:text-6xl font-russo-one font-normal text-white mb-4">
            Tokenomics
          </h2>
        </motion.div>

        {/* Every Game Burns Morbius */}
        <motion.div
          className="mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeIn}
        >
          <div className="text-center mb-8">
            <h3 className="text-3xl md:text-4xl font-russo-one font-normal text-white mb-2 flex items-center justify-center gap-3">
              Every Game Burns Morbius
              <Image
                src="/morbius/MorbiusLogo (3).png"
                alt="Morbius"
                width={32}
                height={32}
                className="inline-block"
              />
            </h3>
          </div>
        </motion.div>

        {/* Burn Rate Cards */}
        <motion.div
          className="grid grid-cols-3 md:grid-cols-3 gap-1 mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
        >
          {[
            { name: 'Plinko', href: '/PLINKO' },
            { name: 'Lottery', href: '/lottery' },
            { name: 'Keno', href: '/keno' },
          ].map((game) => (
            <motion.div key={game.name} variants={fadeIn}>
              <Link href={game.href}>
                <CometCard className="h-full">
                  <div className="p-2 text-center bg-black/60 backdrop-blur-sm rounded-2xl border border-gradient-to-r from-purple-500 to-cyan-500 hover:border-purple-500/50 transition-colors">
                    <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 mb-2">
                      10%
                    </div>
                    <div className="text-lg font-medium text-white mb-1">{game.name}</div>
                    <div className="text-sm text-white/40">Burned per bet</div>
                  </div>
                </CometCard>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        {/* Token Conversion */}
        <motion.div
          className="mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeIn}
        >
          <div className="text-center mb-8">
              <h3 className="text-3xl md:text-4xl font-russo-one font-normal text-white mb-2 flex items-center justify-center gap-3">
                All bets in PLS
                <Image
                  src="/Pulse Branding/Logo/ball.png"
                  alt="PLS"
                  width={32}
                  height={32}
                  className="inline-block"
                />
                are converted to Morbius
              </h3>
          </div>
          <CometCard>
            <div className="p-4 md:p-4 bg-black/60 backdrop-blur-sm rounded-2xl border border-white/10">
              <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-2">
                {/* PLS */}
                <div className="flex flex-col items-center">
                  <div className="w-40 h-40 md:w-40 md:h-40 relative mb-0">
                    <Image
                      src="/Pulse Branding/Logo/ball.png"
                      alt="PLS"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <span className="text-xl font-bold text-white">PLS</span>
                  <span className="text-sm text-white/40">PulseChain</span>
                </div>

                {/* Arrow */}
                <motion.div
                  animate={{ x: [0, 8, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  className="text-purple-400"
                >
                  <svg className="w-8 h-8 md:w-10 md:h-10 rotate-90 md:rotate-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </motion.div>

                {/* MORBIUS */}
                <div className="flex flex-col items-center">
                  <div className="w-40 h-40 md:w-40 md:h-40 relative mb-1">
                    <Image
                      src="/morbius/MorbiusLogo (3).png"
                      alt="MORBIUS"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <span className="text-xl font-bold text-white">MORBIUS</span>
                  <span className="text-sm text-white/40">Gaming Token</span>
                </div>
              </div>

              <p className="text-center text-white/30 text-sm mt-8">
                Instant swap via PulseX DEX
              </p>
            </div>
          </CometCard>
        </motion.div>

        {/* Bottom Statement */}
        <motion.p
          className="text-center text-white/50 mt-16 text-lg max-w-2xl mx-auto"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          Not just a GAME. A <span className="text-purple-400 font-medium">tokenomics engine</span>.
        </motion.p>
      </div>
    </section>
  )
}
