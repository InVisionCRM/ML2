"use client";

import { cn } from "@/lib/utils";
import React, { useState, useEffect } from "react";
import { BentoGrid, BentoGridItem } from "../ui/bento-grid";
import {
  IconTicket,
  IconChartBar,
  IconHistory,
  IconCoin,
  IconTrophy,
  IconClock,
  IconUsers,
} from "@tabler/icons-react";
import { motion } from "motion/react";
import { formatEther } from "viem";
import { GlowingStarsBackgroundCard } from "../ui/glowing-stars";
import { Meteors } from "../ui/meteors";
import { DottedGlowBackground } from "../ui/dotted-glow-background";

interface LotteryBentoGridProps {
  onPlayNow?: () => void;
  onShowHistory?: () => void;
  onShowTickets?: () => void;
  onShowClaim?: () => void;
  onShowPayouts?: () => void;
  totalTickets?: number;
  timeRemaining?: number;
  burnedAmount?: bigint;
  megaBank?: bigint;
  isLoadingBurned?: boolean;
}

export function LotteryBentoGrid({
  onPlayNow,
  onShowHistory,
  onShowTickets,
  onShowClaim,
  onShowPayouts,
  totalTickets = 0,
  timeRemaining = 0,
  burnedAmount,
  megaBank,
  isLoadingBurned = false
}: LotteryBentoGridProps) {
  return (
    <BentoGrid className="max-w-4xl mx-auto md:auto-rows-[20rem]">
      {items.map((item, i) => (
        <BentoGridItem
          key={i}
          title={item.title}
          description={item.description}
          header={typeof item.header === 'function'
            ? item.header({ megaBank, isLoadingBurned })
            : item.header
          }
          className={cn("[&>p:text-lg]", item.className)}
          icon={item.icon}
          onClick={item.onClick ? () => item.onClick({
            onPlayNow,
            onShowHistory,
            onShowTickets,
            onShowClaim,
            onShowPayouts,
            totalTickets,
            timeRemaining,
            burnedAmount,
            megaBank,
            isLoadingBurned
          }) : undefined}
        />
      ))}
    </BentoGrid>
  );
}

const SkeletonPlayNow = () => {
  const variants = {
    initial: {
      x: 0,
    },
    animate: {
      x: 10,
      rotate: 5,
      transition: {
        duration: 0.2,
      },
    },
  };

  const variantsSecond = {
    initial: {
      x: 0,
    },
    animate: {
      x: -10,
      rotate: -5,
      transition: {
        duration: 0.2,
      },
    },
  };

  return (
    <motion.div
      initial="initial"
      whileHover="animate"
      className="flex flex-1 w-full h-full min-h-[6rem] dark:bg-dot-white/[0.2] bg-dot-black/[0.2] flex-col space-y-2"
    >
      <motion.div
        variants={variants}
        className="flex flex-row rounded-full border border-neutral-100 dark:border-white/[0.2] p-2 items-center space-x-2 bg-white dark:bg-black"
      >
        <div className="h-6 w-6 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 shrink-0" />
        <div className="w-full bg-gray-100 h-4 rounded-full dark:bg-neutral-900" />
      </motion.div>
      <motion.div
        variants={variantsSecond}
        className="flex flex-row rounded-full border border-neutral-100 dark:border-white/[0.2] p-2 items-center space-x-2 w-3/4 ml-auto bg-white dark:bg-black"
      >
        <div className="w-full bg-gray-100 h-4 rounded-full dark:bg-neutral-900" />
        <div className="h-6 w-6 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 shrink-0" />
      </motion.div>
      <motion.div
        variants={variants}
        className="flex flex-row rounded-full border border-neutral-100 dark:border-white/[0.2] p-2 items-center space-x-2 bg-white dark:bg-black"
      >
        <div className="h-6 w-6 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 shrink-0" />
        <div className="w-full bg-gray-100 h-4 rounded-full dark:bg-neutral-900" />
      </motion.div>
    </motion.div>
  );
};

const SkeletonTimer = () => {
  const variants = {
    initial: {
      width: 0,
    },
    animate: {
      width: "100%",
      transition: {
        duration: 0.2,
      },
    },
    hover: {
      width: ["0%", "100%"],
      transition: {
        duration: 2,
      },
    },
  };

  const arr = new Array(6).fill(0);

  return (
    <motion.div
      initial="initial"
      animate="animate"
      whileHover="hover"
      className="flex flex-1 w-full h-full min-h-[6rem] dark:bg-dot-white/[0.2] bg-dot-black/[0.2] flex-col space-y-2"
    >
      {arr.map((_, i) => (
        <motion.div
          key={"skeleton-timer" + i}
          variants={variants}
          style={{
            maxWidth: Math.random() * (100 - 40) + 40 + "%",
          }}
          className="flex flex-row rounded-full border border-neutral-100 dark:border-white/[0.2] p-2 items-center space-x-2 bg-neutral-100 dark:bg-black w-full h-4"
        ></motion.div>
      ))}
    </motion.div>
  );
};

const MorbiusStats = () => {
  const [tokenData, setTokenData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchMorbiusData = async () => {
      try {
        // Fetch Morbius token data from Dexscreener
        const response = await fetch('https://api.dexscreener.com/latest/dex/tokens/0xB7d4eB5fDfE3d4d3B5C16a44A49948c6EC77c6F1')
        const data = await response.json()

        if (data.pairs && data.pairs.length > 0) {
          // Get the pair with highest liquidity (usually the main pair)
          const mainPair = data.pairs.sort((a: any, b: any) => parseFloat(b.liquidity?.usd || '0') - parseFloat(a.liquidity?.usd || '0'))[0]
          setTokenData(mainPair)
        }
      } catch (error) {
        console.error('Failed to fetch Morbius data:', error)
        // Set fallback data for demo
        setTokenData({
          priceUsd: '0.000123',
          marketCap: '1234567',
          volume: { h24: '987654' },
          info: {
            socials: [
              { type: 'twitter', url: 'https://twitter.com/morbius' },
              { type: 'telegram', url: 'https://t.me/morbius' },
              { type: 'website', url: 'https://morbius.finance' }
            ]
          }
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchMorbiusData()

    // Refresh every 30 seconds
    const interval = setInterval(fetchMorbiusData, 30000)
    return () => clearInterval(interval)
  }, [])

  const formatPrice = (price: string) => {
    const num = parseFloat(price)
    if (num < 0.000001) return `$${num.toExponential(2)}`
    if (num < 0.0001) return `$${num.toFixed(7)}`
    if (num < 0.01) return `$${num.toFixed(6)}`
    return `$${num.toFixed(4)}`
  }

  const formatMarketCap = (marketCap: string) => {
    const num = parseFloat(marketCap)
    if (num >= 1000000000) return `$${(num / 1000000000).toFixed(2)}B`
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`
    if (num >= 1000) return `$${(num / 1000).toFixed(2)}K`
    return `$${num.toFixed(0)}`
  }

  const formatVolume = (volume: string) => {
    const num = parseFloat(volume)
    if (num >= 1000000000) return `${(num / 1000000000).toFixed(2)}B`
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(2)}K`
    return num.toFixed(0)
  }

  if (isLoading) {
    return (
      <div className="relative flex flex-1 w-full h-full min-h-[10rem] rounded-lg overflow-hidden bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10 flex items-center justify-center w-full h-full">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <div className="text-white/70 text-sm font-mono">Loading Morbius...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex flex-1 w-full h-full min-h-[10rem] rounded-lg overflow-hidden">
      {/* Background Image with Blur */}
      <div
        className="absolute inset-0 bg-cover bg-center blur-sm scale-110 opacity-30"
        style={{
          backgroundImage: "url('/morbius/morbius-logo-2.svg')",
        }}
      />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/80 via-blue-900/70 to-indigo-900/80" />

      {/* Content */}
      <div className="relative z-10 flex flex-col w-full h-full p-4 text-white">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs font-mono text-white/80 uppercase tracking-wider">Live</span>
          </div>
          <span className="text-xs font-mono text-white/60">MORBIUS</span>
        </div>

        {/* Price - Large and Prominent */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="text-center mb-4">
            <div className="text-3xl font-bold font-mono mb-1 text-white drop-shadow-lg">
              {tokenData?.priceUsd ? formatPrice(tokenData.priceUsd) : '$0.00'}
            </div>
            <div className="text-sm text-white/70 font-mono">
              Market Cap: {tokenData?.marketCap ? formatMarketCap(tokenData.marketCap) : '$0'}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-center">
              <div className="text-xs text-white/70 font-mono uppercase tracking-wider mb-1">24h Volume</div>
              <div className="text-lg font-bold font-mono text-white">
                ${tokenData?.volume?.h24 ? formatVolume(tokenData.volume.h24) : '0'}
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-center">
              <div className="text-xs text-white/70 font-mono uppercase tracking-wider mb-1">Liquidity</div>
              <div className="text-lg font-bold font-mono text-white">
                ${tokenData?.liquidity?.usd ? formatVolume(tokenData.liquidity.usd) : '0'}
              </div>
            </div>
          </div>
        </div>

        {/* Social Links */}
        <div className="flex justify-center gap-3 pt-2 border-t border-white/20">
          {tokenData?.info?.socials?.slice(0, 4).map((social: any, index: number) => (
            <a
              key={index}
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-8 h-8 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full transition-all duration-200 hover:scale-110"
              title={social.type}
            >
              <span className="text-sm">
                {social.type === 'twitter' && '𝕏'}
                {social.type === 'telegram' && '✈️'}
                {social.type === 'discord' && '💬'}
                {social.type === 'website' && '🌐'}
                {!['twitter', 'telegram', 'discord', 'website'].includes(social.type) && '🔗'}
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

const SkeletonPerformance = () => {
  return (
    <GlowingStarsBackgroundCard className="w-full h-full min-h-[4rem] border-0 bg-transparent !bg-transparent">
      <div className="flex flex-col items-center justify-center h-full">
        {/* Empty - just the glowing starfield background */}
      </div>
    </GlowingStarsBackgroundCard>
  );
};

const SkeletonJackpot = ({ jackpotAmount }: { jackpotAmount?: bigint }) => {
  const jackpotDisplay = jackpotAmount ? formatAmount(jackpotAmount) : "...";

  return (
    <div className="relative w-full h-full min-h-[6rem] overflow-hidden rounded-lg bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Meteors number={15} />
      <div className="relative z-10 flex flex-col items-center justify-center h-full p-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-white mb-1">
            {jackpotDisplay}
          </div>
          <div className="text-xs text-purple-200">
            MegaMorbius
          </div>
        </div>
      </div>
    </div>
  );
};

const SkeletonMyTickets = () => {
  return (
    <div className="relative w-full h-full min-h-[6rem] overflow-hidden">
      <DottedGlowBackground
        className="absolute inset-0"
        gap={8}
        radius={1.5}
        color="rgba(255,255,255,0.3)"
        glowColor="rgba(59, 130, 246, 0.6)"
        opacity={0.7}
        speedMin={0.2}
        speedMax={0.8}
        speedScale={0.5}
      />
      {/* Text content will be overlaid by BentoGridItem */}
    </div>
  );
};

const SkeletonHistory = () => {
  const first = {
    initial: {
      x: 20,
      rotate: -5,
    },
    hover: {
      x: 0,
      rotate: 0,
    },
  };

  const second = {
    initial: {
      x: -20,
      rotate: 5,
    },
    hover: {
      x: 0,
      rotate: 0,
    },
  };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      whileHover="hover"
      className="flex flex-1 w-full h-full min-h-[6rem] dark:bg-dot-white/[0.2] bg-dot-black/[0.2] flex-row space-x-2"
    >
      <motion.div
        variants={first}
        className="h-full w-1/3 rounded-2xl bg-white p-4 dark:bg-black dark:border-white/[0.1] border border-neutral-200 flex flex-col items-center justify-center"
      >
        <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 shrink-0 mb-2" />
        <div className="w-full bg-gray-100 h-2 rounded-full dark:bg-neutral-900 mb-2" />
        <div className="w-3/4 bg-gray-100 h-2 rounded-full dark:bg-neutral-900" />
      </motion.div>
      <motion.div className="h-full relative z-20 w-1/3 rounded-2xl bg-white p-4 dark:bg-black dark:border-white/[0.1] border border-neutral-200 flex flex-col items-center justify-center">
        <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 shrink-0 mb-2" />
        <div className="w-full bg-gray-100 h-2 rounded-full dark:bg-neutral-900 mb-2" />
        <div className="w-3/4 bg-gray-100 h-2 rounded-full dark:bg-neutral-900" />
      </motion.div>
      <motion.div
        variants={second}
        className="h-full w-1/3 rounded-2xl bg-white p-4 dark:bg-black dark:border-white/[0.1] border border-neutral-200 flex flex-col items-center justify-center"
      >
        <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 shrink-0 mb-2" />
        <div className="w-full bg-gray-100 h-2 rounded-full dark:bg-neutral-900 mb-2" />
        <div className="w-3/4 bg-gray-100 h-2 rounded-full dark:bg-neutral-900" />
      </motion.div>
    </motion.div>
  );
};

const SkeletonClaim = () => {
  const variants = {
    initial: {
      x: 0,
    },
    animate: {
      x: 10,
      rotate: 5,
      transition: {
        duration: 0.2,
      },
    },
  };

  const variantsSecond = {
    initial: {
      x: 0,
    },
    animate: {
      x: -10,
      rotate: -5,
      transition: {
        duration: 0.2,
      },
    },
  };

  return (
    <motion.div
      initial="initial"
      whileHover="animate"
      className="flex flex-1 w-full h-full min-h-[6rem] dark:bg-dot-white/[0.2] bg-dot-black/[0.2] flex-col space-y-2"
    >
      <motion.div
        variants={variants}
        className="flex flex-row rounded-2xl border border-neutral-100 dark:border-white/[0.2] p-2 items-start space-x-2 bg-white dark:bg-black"
      >
        <div className="h-6 w-6 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 shrink-0" />
        <div className="text-xs text-neutral-500">
          Claim your lottery winnings instantly...
        </div>
      </motion.div>
      <motion.div
        variants={variantsSecond}
        className="flex flex-row rounded-full border border-neutral-100 dark:border-white/[0.2] p-2 items-center justify-end space-x-2 w-3/4 ml-auto bg-white dark:bg-black"
      >
        <div className="text-xs text-neutral-500">Claim All Now!</div>
        <div className="h-6 w-6 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 shrink-0" />
      </motion.div>
    </motion.div>
  );
};

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const formatNumber = (num: number) => {
  return num.toLocaleString();
};

const formatAmount = (amount: bigint, isLoading = false) => {
  if (isLoading) return "...";
  const num = parseFloat(formatEther(amount));
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return num.toFixed(0);
};

const items = [
  {
    title: "Play Now",
    description: (
      <span className="text-sm">
        Start playing instantly - buy lottery tickets and join the next draw
      </span>
    ),
    header: <SkeletonPerformance />,
    className: "md:col-span-1",
    icon: <IconTicket className="h-4 w-4 text-neutral-500" />,
    onClick: ({ onPlayNow }: any) => onPlayNow?.(),
  },
  {
    title: "Payout Breakdown",
    description: (
      <span className="text-sm">
        View prize distribution and payout calculations
      </span>
    ),
    header: <SkeletonTimer />,
    className: "md:col-span-1",
    icon: <IconClock className="h-4 w-4 text-neutral-500" />,
    onClick: ({ onShowPayouts }: any) => onShowPayouts?.(),
  },
  {
    title: "Morbius",
    description: (
      <span className="text-sm">
        Real-time Morbius token price, market cap & social links
      </span>
    ),
    header: <MorbiusStats />,
    className: "md:col-span-1",
    onClick: () => {
      window.open('https://morbius.io/geicko?address=0xB7d4eB5fDfE3d4d3B5C16a44A49948c6EC77c6F1', '_blank')
    },
  },
  {
    title: "Jackpot",
    description: (
      <span className="text-sm">
        Current MegaMorbius progressive jackpot amount
      </span>
    ),
    header: ({ megaBank }: any) => <SkeletonJackpot jackpotAmount={megaBank} />,
    className: "md:col-span-2",
    icon: <IconTrophy className="h-4 w-4 text-neutral-500" />,
  },
  {
    title: "Transaction History",
    description: (
      <span className="text-sm">
        View your complete lottery transaction history
      </span>
    ),
    header: <SkeletonPlayNow />,
    className: "md:col-span-1",
    icon: <IconHistory className="h-4 w-4 text-neutral-500" />,
    onClick: () => {
      // Navigate to transaction history page
      window.location.href = '/lottery-purchase-showcase'
    },
  },
  {
    title: "Round History",
    description: (
      <span className="text-sm">
        Browse past lottery results and winning numbers
      </span>
    ),
    header: <SkeletonHistory />,
    className: "md:col-span-1",
    icon: <IconHistory className="h-4 w-4 text-neutral-500" />,
    onClick: ({ onShowHistory }: any) => onShowHistory?.(),
  },
  {
    title: "Claim Winnings",
    description: (
      <span className="text-sm">
        Claim All Now!
      </span>
    ),
    header: <SkeletonClaim />,
    className: "md:col-span-1",
    icon: <IconCoin className="h-4 w-4 text-neutral-500" />,
    onClick: ({ onShowClaim }: any) => onShowClaim?.(),
  },
  {
    title: "My Tickets",
    description: (
      <span className="text-sm">
        View all your lottery tickets and track their performance
      </span>
    ),
    header: <SkeletonMyTickets />,
    className: "md:col-span-1",
    icon: <IconTicket className="h-4 w-4 text-neutral-500" />,
    onClick: ({ onShowTickets }: any) => onShowTickets?.(),
  },
];
