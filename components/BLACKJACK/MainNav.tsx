'use client'

import React from 'react';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useDisconnect } from 'wagmi';

interface MainNavProps {
  onOpenDepositModal?: () => void;
  reserveBalance?: bigint;
  currentView?: 'game' | 'history' | 'stats' | 'analytics' | 'verify';
  onViewChange?: (view: 'game' | 'history' | 'stats' | 'analytics' | 'verify') => void;
}

export default function MainNav({ onOpenDepositModal, reserveBalance, currentView = 'game', onViewChange }: MainNavProps) {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <nav className="sticky top-0 z-40 backdrop-blur-sm"
      style={{
        background: 'linear-gradient(145deg,rgb(70, 118, 153),rgba(0, 0, 0, 0))',
        borderBottom: '3px rgba(0, 0, 0, 0)',
        backdropFilter: 'blur(2px)',
      }}
    >
      <div className="container mx-auto px-2 py-1">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div
              className="p-1 rounded-sm"
              style={{
                background: 'linear-gradient(145deg,rgba(12, 86, 103, 0.01),rgba(0, 0, 0, 0)0.27))',
              }}
            >
              <span className="text-2xl">🃏</span>
            </div>
            <span
              className="text-md font-prosto-one"
              style={{
                color: 'rgb(226, 212, 243)'
              }}
            >
              MORBIUS.IO
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-6">
            <Link
              href="/"
              className="text-cyan-400/70 hover:text-cyan-300 transition-colors text-sm font-medium"
            >
              Home
            </Link>
            <Link
              href="/lottery"
              className="text-cyan-400/70 hover:text-cyan-300 transition-colors text-sm font-medium"
            >
              Lottery
            </Link>
            <Link
              href="/keno"
              className="text-cyan-400/70 hover:text-cyan-300 transition-colors text-sm font-medium"
            >
              KENO
            </Link>
            <Link
              href="/PLINKO"
              className="text-cyan-400/70 hover:text-cyan-300 transition-colors text-sm font-medium"
            >
              Plinko
            </Link>
            <Link
              href="/BIG-WHEEL"
              className="text-cyan-400/70 hover:text-cyan-300 transition-colors text-sm font-medium"
            >
              Big Wheel
            </Link>
            <Link
              href="/BLACKJACK"
              className="text-cyan-400 font-bold transition-colors text-sm"
            >
              🃏 Blackjack
            </Link>
          </div>

          {/* Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {[
              { key: 'game', label: 'Play', icon: '🃏' },
              { key: 'history', label: 'History', icon: '📊' },
              { key: 'stats', label: 'Stats', icon: '📈' },
              { key: 'analytics', label: 'Analytics', icon: '📊' },
              { key: 'verify', label: 'Verify', icon: '🔍' }
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => onViewChange?.(item.key as any)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105 active:scale-95 ${
                  currentView === item.key
                    ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/50'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                <span className="mr-1">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>

          {/* Deposit/Withdraw Button */}
          {isConnected && (
            <button
              onClick={onOpenDepositModal}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105 active:scale-95"
              style={{
                background: 'linear-gradient(145deg, rgba(16, 185, 129, 0.3), rgba(5, 150, 105, 0.3))',
                color: 'rgb(16, 185, 129)',
                border: '2px solid rgba(16, 185, 129, 0.5)',
              }}
            >
              Deposit/Withdraw
            </button>
          )}

          {/* Reserve Balance */}
          {isConnected && reserveBalance !== undefined && (
            <div className="flex items-center space-x-2 px-3 py-1 rounded-lg"
              style={{
                background: 'linear-gradient(145deg, rgba(139, 92, 246, 0.2), rgba(79, 70, 229, 0.2))',
                border: '1px solid rgba(139, 92, 246, 0.3)',
              }}
            >
              <span className="text-purple-300 text-sm font-medium">Reserve:</span>
              <span className="text-white font-bold">
                {Math.floor(Number(reserveBalance) / 1e18)} MORBIUS
              </span>
            </div>
          )}

          {/* Wallet Connection */}
          <div className="flex items-center space-x-4">
            {isConnected && address ? (
              <button
                onClick={() => disconnect()}
                className="flex items-center border-2 border-cyan-500/30 gap-2 px-4 py-1 rounded-sm text-blue-500 text-sm font-bold transition-all hover:scale-105 active:scale-95"
                style={{
                  background: 'linear-gradient(145deg,rgba(111, 14, 132, 0.69),rgba(22, 33, 62, 0.6))',
                }}
              >
                <span className="text-white">{address.slice(-4)}</span>
                <i className="fas fa-chevron-down text-white text-xs"></i>
              </button>
            ) : (
              <ConnectButton.Custom>
                {({ openConnectModal }) => (
                  <button
                    onClick={openConnectModal}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105 active:scale-95"
                    style={{
                      background: 'linear-gradient(145deg, rgba(6, 182, 212, 0.3), rgba(8, 145, 178, 0.3))',
                      boxShadow: 'inset 4px 4px 8px rgba(0, 0, 0, 0.3), inset -4px -4px 8px rgba(255, 255, 255, 0.05)',
                      color: 'rgb(6, 182, 212)',
                      border: '2px solid rgba(6, 182, 212, 0.5)',
                    }}
                  >
                    Connect Wallet
                  </button>
                )}
              </ConnectButton.Custom>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden p-2 text-cyan-300/80">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
}