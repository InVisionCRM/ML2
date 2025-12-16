'use client'

import { useEffect, useState } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import Link from 'next/link'

interface HeaderProps {
  nextDrawEndTime?: bigint
  fallbackRemaining?: bigint
  onBentoClick?: () => void
}

const DISPLAY_OFFSET_SECONDS = 15

const formatSeconds = (totalSeconds: number) => {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export function Header({ nextDrawEndTime, fallbackRemaining = BigInt(0), onBentoClick }: HeaderProps) {
  const [remaining, setRemaining] = useState<number>(() => {
    if (!nextDrawEndTime || nextDrawEndTime === BigInt(0)) return Number(fallbackRemaining) + DISPLAY_OFFSET_SECONDS
    const fromEnd = Number(nextDrawEndTime) * 1000 - Date.now()
    if (!Number.isNaN(fromEnd) && fromEnd > 0) return Math.floor(fromEnd / 1000) + DISPLAY_OFFSET_SECONDS
    return Number(fallbackRemaining) + DISPLAY_OFFSET_SECONDS
  })

  useEffect(() => {
    if (!nextDrawEndTime || nextDrawEndTime === BigInt(0)) {
      setRemaining(Number(fallbackRemaining) + DISPLAY_OFFSET_SECONDS)
      return
    }
    const update = () => {
      const ms = Number(nextDrawEndTime) * 1000 - Date.now()
      if (!Number.isNaN(ms)) {
        setRemaining(Math.max(0, Math.floor(ms / 1000) + DISPLAY_OFFSET_SECONDS))
      }
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [nextDrawEndTime, fallbackRemaining])

  return (
    <header className="border-b border-white/30 bg-purple-950/10 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-3 py-3 relative">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="text-left">
              <h1 className="text-xl font-bold text-white leading-none">MORBIUS.IO</h1>
            </div>
          </Link>


          <div className="flex items-center gap-2 ml-auto">
            <ConnectButton.Custom>
              {({
                account,
                chain,
                openAccountModal,
                openChainModal,
                openConnectModal,
                authenticationStatus,
                mounted,
              }) => {
                const ready = mounted && authenticationStatus !== 'loading'
                const connected =
                  ready &&
                  account &&
                  chain &&
                  (!authenticationStatus ||
                    authenticationStatus === 'authenticated')

                return (
                  <div
                    {...(!ready && {
                      'aria-hidden': true,
                      style: {
                        opacity: 0,
                        pointerEvents: 'none',
                        userSelect: 'none',
                      },
                    })}
                  >
                    {(() => {
                      if (!connected) {
                        return (
                          <button
                            onClick={openConnectModal}
                            type="button"
                            className="px-3 py-1.5 text-sm font-medium bg-white text-black rounded-lg hover:bg-white/90 transition-colors"
                          >
                            Connect
                          </button>
                        )
                      }

                      if (chain.unsupported) {
                        return (
                          <button
                            onClick={openChainModal}
                            type="button"
                            className="px-3 py-1.5 text-sm font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                          >
                            Wrong network
                          </button>
                        )
                      }

                      return (
                        <button
                          onClick={openAccountModal}
                          type="button"
                          className="px-3 py-1.5 text-sm font-medium bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors border border-white/20"
                        >
                          {account.displayName}
                        </button>
                      )
                    })()}
                  </div>
                )
              }}
            </ConnectButton.Custom>
          </div>
        </div>

        {/* Centered Next Draw Timer and Button */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-500 via-blue-500 to-pink-500 bg-clip-text text-transparent drop-shadow">
              {remaining > 0 ? formatSeconds(remaining) : '--'}
            </div>
            {onBentoClick && (
              <button
                onClick={onBentoClick}
                title="Dashboard"
                className="pointer-events-auto px-3 py-1.5 text-md font-medium bg-slate-900 text-white border-white border-2 rounded-md transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
