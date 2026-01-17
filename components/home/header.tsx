'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAuth } from '@/hooks/use-auth'
import { LoginModal } from '@/components/auth/LoginModal'
import { Button } from '@/components/ui/button'
import { Shield, LogOut } from 'lucide-react'

interface HomeHeaderProps {
  showBackArrow?: boolean
  backArrowHref?: string
  backArrowLabel?: string
}

export function HomeHeader({ showBackArrow = false, backArrowHref = '/', backArrowLabel = 'Back' }: HomeHeaderProps = {}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [gamesSubmenuOpen, setGamesSubmenuOpen] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)

  const { isAuthenticated, signIn, signOut, isSigning, address } = useAuth()

  return (
    <header className="border-b border-white/30 bg-purple-950/10 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-3 py-3 relative">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Left: Back Arrow + Morbius Logo */}
          <div className="flex items-center gap-3">
            {showBackArrow && backArrowHref && (
              <Link
                href={backArrowHref}
                className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
                title={backArrowLabel}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-sm font-medium">{backArrowLabel}</span>
              </Link>
            )}
            <Link href="/home" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="text-left">
              <h1 className="text-xl font-bold text-white leading-none hidden sm:inline">MORBIUS.IO</h1>
              <img
                src="/MORBIUS/MORBIUSLogo (3).png"
                alt="MORBIUS.io"
                className="h-6 w-auto sm:hidden inline"
              />
            </div>
          </Link>
          </div>

          {/* Right: Auth + Wallet + Hamburger */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Authentication Button */}
            {address && (
              <div className="scale-75 origin-right">
                {isAuthenticated ? (
                  <Button
                    onClick={signOut}
                    variant="outline"
                    size="sm"
                    className="bg-green-950/20 border-green-400/30 text-green-400 hover:bg-green-950/30 hover:border-green-400/50"
                  >
                    <Shield className="w-3 h-3 mr-1" />
                    <LogOut className="w-3 h-3" />
                  </Button>
                ) : (
                  <Button
                    onClick={() => setLoginOpen(true)}
                    variant="outline"
                    size="sm"
                    className="bg-cyan-950/20 border-cyan-400/30 text-cyan-400 hover:bg-cyan-950/30 hover:border-cyan-400/50"
                  >
                    <Shield className="w-3 h-3 mr-1" />
                    Sign In
                  </Button>
                )}
              </div>
            )}

            {/* Wallet Connect Button */}
            <div className="scale-75 origin-right">
              <ConnectButton
                chainStatus="none"
                showBalance={false}
                accountStatus={{
                  smallScreen: 'avatar',
                  largeScreen: 'full',
                }}
              />
            </div>

            {/* Hamburger Menu */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="w-9 h-9 flex flex-col items-center justify-center gap-[5px] transition-all active:scale-95"
                title="Menu"
                aria-label="Toggle navigation menu"
              >
                <div className="w-5 h-[3px] bg-white rounded-full shadow-[0_2px_6px_rgba(147,51,234,0.8),0_0_8px_rgba(147,51,234,0.6)]" />
                <div className="w-5 h-[3px] bg-white rounded-full shadow-[0_2px_6px_rgba(147,51,234,0.8),0_0_8px_rgba(147,51,234,0.6)]" />
                <div className="w-5 h-[3px] bg-white rounded-full shadow-[0_2px_6px_rgba(147,51,234,0.8),0_0_8px_rgba(147,51,234,0.6)]" />
              </button>

              {/* Dropdown Menu */}
              {menuOpen && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => {
                      setMenuOpen(false)
                      setGamesSubmenuOpen(false)
                    }}
                  />

                  {/* Menu Panel */}
                  <div className="absolute right-0 top-12 w-48 bg-black/75 backdrop-blur-xl rounded-lg border border-white/50 shadow-lg shadow-purple-950/50 inset-shadow-lg z-50">
                    {/* Title */}
                    <div className="px-3 py-2 border-b border-white/10">
                      <span className="text-white/50 font-bold text-sm">MENU</span>
                    </div>

                    {/* Menu Items */}
                    <div className="py-1">
                      <Link
                        href="/home"
                        onClick={() => setMenuOpen(false)}
                        className="block w-full px-3 py-2 text-left text-white/90 hover:bg-white/10 hover:text-white transition-colors text-sm font-medium"
                      >
                        Home
                      </Link>
                      <Link
                        href="/swap"
                        onClick={() => setMenuOpen(false)}
                        className="block w-full px-3 py-2 text-left text-white/90 hover:bg-white/10 hover:text-white transition-colors text-sm font-medium"
                      >
                        Buy Morbius
                      </Link>
                      <Link
                        href="/lottery-purchase-showcase"
                        onClick={() => setMenuOpen(false)}
                        className="block w-full px-3 py-2 text-left text-white/90 hover:bg-white/10 hover:text-white transition-colors text-sm font-medium"
                      >
                        My History
                      </Link>

                      {/* All Games with Submenu */}
                      <div className="relative">
                        <button
                          onClick={() => setGamesSubmenuOpen(!gamesSubmenuOpen)}
                          className="w-full px-3 py-2 text-left text-white/90 hover:bg-white/10 hover:text-white transition-colors text-sm font-medium flex items-center justify-between"
                        >
                          All Games
                          <i className={`fas fa-chevron-${gamesSubmenuOpen ? 'down' : 'right'} text-xs`}></i>
                        </button>

                        {gamesSubmenuOpen && (
                          <div className="bg-black/20 border-t border-white/10">
                            <Link
                              href="/lottery"
                              onClick={() => {
                                setMenuOpen(false)
                                setGamesSubmenuOpen(false)
                              }}
                              className="block w-full px-5 py-2 text-left text-white/80 hover:bg-white/10 hover:text-white transition-colors text-xs font-medium"
                            >
                              Mega Morbius Lotto
                            </Link>
                            <Link
                              href="/keno"
                              onClick={() => {
                                setMenuOpen(false)
                                setGamesSubmenuOpen(false)
                              }}
                              className="block w-full px-5 py-2 text-left text-white/80 hover:bg-white/10 hover:text-white transition-colors text-xs font-medium"
                            >
                              Crypto Keno
                            </Link>
                            <Link
                              href="/PLINKO"
                              onClick={() => {
                                setMenuOpen(false)
                                setGamesSubmenuOpen(false)
                              }}
                              className="block w-full px-5 py-2 text-left text-white/80 hover:bg-white/10 hover:text-white transition-colors text-xs font-medium"
                            >
                              PLINKO
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Login Modal */}
      <LoginModal
        open={loginOpen}
        onOpenChange={setLoginOpen}
        onSignIn={signIn}
        isSigning={isSigning}
        address={address}
      />
    </header>
  )
}