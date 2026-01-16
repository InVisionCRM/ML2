"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';

// Casino symbols as colored components
const SYMBOLS = [
  { id: 'seven', color: '#FFD700', shape: '7', bg: '#FFD700', textColor: '#000' },
  { id: 'cherry', color: '#FF6B6B', shape: '●', bg: '#FF6B6B', textColor: '#FFF' },
  { id: 'bell', color: '#4ECDC4', shape: '▲', bg: '#4ECDC4', textColor: '#000' },
  { id: 'diamond', color: '#45B7D1', shape: '◆', bg: '#45B7D1', textColor: '#FFF' },
  { id: 'bitcoin', color: '#F7931A', shape: '₿', bg: '#F7931A', textColor: '#FFF' },
  { id: 'ethereum', color: '#627EEA', shape: 'Ξ', bg: '#627EEA', textColor: '#FFF' },
  { id: 'star', color: '#FFA500', shape: '★', bg: '#FFA500', textColor: '#FFF' },
  { id: 'target', color: '#FF1493', shape: '◎', bg: '#FF1493', textColor: '#FFF' },
  { id: 'crown', color: '#FFD700', shape: '♔', bg: '#FFD700', textColor: '#000' },
  { id: 'spade', color: '#000000', shape: '♠', bg: '#000000', textColor: '#FFF' },
];

interface SlotMachineProps {
  isSpinning: boolean;
  onSpinComplete?: () => void;
  confirmationStage?: 'broadcast' | 'mempool' | 'mined' | null;
}

const SlotMachine: React.FC<SlotMachineProps> = ({
  isSpinning,
  onSpinComplete,
  confirmationStage
}) => {
  const [reelPositions, setReelPositions] = useState([0, 0, 0]);
  const [finalSymbols, setFinalSymbols] = useState<typeof SYMBOLS[0][]>([]);
  const [isStopping, setIsStopping] = useState([false, false, false]);
  const [isSpinningReels, setIsSpinningReels] = useState([true, true, true]);
  const [hasResult, setHasResult] = useState(false);
  const [isWinner, setIsWinner] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const spinningReelsRef = useRef([true, true, true]);

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio();
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Play sound effect
  const playSound = (soundType: 'spin' | 'stop' | 'win' | 'lose') => {
    if (!audioRef.current) return;

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    if (soundType === 'spin') {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(300, audioContext.currentTime + 0.2);

      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.2);
    } else if (soundType === 'stop') {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.1);
    } else if (soundType === 'win') {
      // Epic win sound
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);

          oscillator.frequency.setValueAtTime(500 + i * 100, audioContext.currentTime);
          gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.3);
        }, i * 80);
      }
    } else if (soundType === 'lose') {
      // Sad lose sound
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(150, audioContext.currentTime + 0.5);

      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.5);
    }
  };

  // Reset state when spinning starts
  useEffect(() => {
    if (isSpinning) {
      setIsStopping([false, false, false]);
      setIsSpinningReels([true, true, true]);
      spinningReelsRef.current = [true, true, true];
      setFinalSymbols([]);
      setHasResult(false);
      setIsWinner(false);
    }
  }, [isSpinning]);

  // Keep ref in sync with state
  useEffect(() => {
    spinningReelsRef.current = isSpinningReels;
  }, [isSpinningReels]);

  // Start spinning animation
  useEffect(() => {
    if (isSpinning) {
      playSound('spin');

      // Create multiple copies of symbols for seamless scrolling
      const extendedSymbols = [...SYMBOLS, ...SYMBOLS, ...SYMBOLS, ...SYMBOLS];
      const intervals: NodeJS.Timeout[] = [];

      // Start all reels spinning
      for (let i = 0; i < 3; i++) {
        const interval = setInterval(() => {
          setReelPositions(prev => prev.map((pos, index) =>
            index === i && spinningReelsRef.current[index] ? (pos + 1) % extendedSymbols.length : pos
          ));
        }, 60);
        intervals.push(interval);
      }

      // Stop reel 1
      setTimeout(() => {
        setIsSpinningReels(prev => [false, prev[1], prev[2]]);
        clearInterval(intervals[0]);
        setIsStopping([true, false, false]);
        playSound('stop');
        const finalPos1 = Math.floor(Math.random() * SYMBOLS.length) + SYMBOLS.length;
        setReelPositions(prev => [finalPos1, prev[1], prev[2]]);
        setFinalSymbols(prev => [extendedSymbols[finalPos1]]);
      }, 1800);

      // Stop reel 2
      setTimeout(() => {
        setIsSpinningReels(prev => [prev[0], false, prev[2]]);
        clearInterval(intervals[1]);
        setIsStopping([true, true, false]);
        playSound('stop');
        const finalPos2 = Math.floor(Math.random() * SYMBOLS.length) + SYMBOLS.length;
        setReelPositions(prev => [prev[0], finalPos2, prev[2]]);
        setFinalSymbols(prev => [prev[0], extendedSymbols[finalPos2]]);
      }, 2800);

      // Stop reel 3
      setTimeout(() => {
        setIsSpinningReels(prev => [prev[0], prev[1], false]);
        clearInterval(intervals[2]);
        setIsStopping([true, true, true]);
        playSound('stop');
        const finalPos3 = Math.floor(Math.random() * SYMBOLS.length) + SYMBOLS.length;
        setReelPositions(prev => [prev[0], prev[1], finalPos3]);
        setFinalSymbols(prev => [...prev.slice(0, 2), extendedSymbols[finalPos3]]);

        // Check for win condition after all reels stopped
        setTimeout(() => {
          const isWin = finalSymbols.length >= 2 &&
            finalSymbols[0].id === finalSymbols[1].id &&
            finalSymbols[1].id === finalSymbols[2].id;

          setIsWinner(isWin);
          setHasResult(true);

          if (isWin) {
            playSound('win');
          } else {
            playSound('lose');
          }

          if (onSpinComplete) {
            onSpinComplete();
          }
        }, 1000);
      }, 3800);

      return () => {
        intervals.forEach(interval => clearInterval(interval));
      };
    }
  }, [isSpinning, onSpinComplete]);

  const getStageColor = (stage: string | null) => {
    switch (stage) {
      case 'broadcast': return 'text-cyan-400';
      case 'mempool': return 'text-purple-400';
      case 'mined': return 'text-green-400';
      default: return 'text-white/60';
    }
  };

  const getStageText = (stage: string | null) => {
    switch (stage) {
      case 'broadcast': return '📡 Broadcasting';
      case 'mempool': return '📦 In Mempool';
      case 'mined': return '⛏️ Mining';
      default: return '🎰 Processing';
    }
  };

  return (
    <div className="flex flex-col items-center space-y-6 p-8 bg-black/90 rounded-2xl border border-white/10 backdrop-blur-sm max-w-2xl w-full">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-2">
          Transaction Confirmation
        </h3>
        <p className={`text-lg font-medium ${getStageColor(confirmationStage)}`}>
          {getStageText(confirmationStage)}
        </p>
      </div>

      {/* Result Display */}
      {hasResult && (
        <div className={`text-center p-4 rounded-xl border-2 ${
          isWinner
            ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-400/50'
            : 'bg-gradient-to-r from-gray-600/20 to-gray-700/20 border-gray-500/50'
        }`}>
          <div className={`text-3xl font-black mb-2 ${
            isWinner ? 'text-yellow-400' : 'text-gray-400'
          }`}>
            {isWinner ? '🎉 JACKPOT! 🎉' : 'Better Luck Next Time'}
          </div>
          <div className={`text-sm ${isWinner ? 'text-yellow-300' : 'text-gray-300'}`}>
            {isWinner ? 'Transaction confirmed with bonus luck!' : 'Transaction confirmed successfully'}
          </div>
        </div>
      )}

      {/* Massive Slot Machine */}
      <div className="relative">
        {/* Machine Frame */}
        <div className="bg-gradient-to-b from-gray-800 via-gray-900 to-black p-8 rounded-2xl border-4 border-yellow-500/40 shadow-2xl">
          {/* Top Display Panel */}
          <div className="flex justify-center space-x-4 mb-6">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className={`w-6 h-6 rounded-full border-2 ${
                  isSpinning && !isStopping[i]
                    ? 'bg-red-500 border-red-400 animate-pulse shadow-lg shadow-red-500/50'
                    : isStopping[i]
                    ? 'bg-green-500 border-green-400 shadow-lg shadow-green-500/50'
                    : 'bg-gray-700 border-gray-600'
                }`}
              />
            ))}
          </div>

          {/* Massive Reels Container */}
          <div className="flex space-x-4 bg-black/70 p-6 rounded-xl border-2 border-white/10 shadow-inner">
            {[0, 1, 2].map((reelIndex) => {
              // Create extended symbol list for seamless scrolling
              const extendedSymbols = [...SYMBOLS, ...SYMBOLS, ...SYMBOLS, ...SYMBOLS];
              const symbolHeight = 96; // Height of each symbol container

              return (
                <div key={reelIndex} className="relative">
                  {/* Reel Frame - Much Larger */}
                  <div className="w-32 h-48 bg-gray-900 rounded-lg border-4 border-gray-600 overflow-hidden relative shadow-2xl">
                    {/* Spinning Symbols Strip */}
                    <div
                      className="absolute inset-0 transition-transform duration-700 ease-out"
                      style={{
                        transform: `translateY(-${reelPositions[reelIndex] * symbolHeight}px)`,
                      }}
                    >
                      {extendedSymbols.map((symbol, symbolIndex) => (
                        <div
                          key={symbolIndex}
                          className="w-32 h-24 flex items-center justify-center select-none"
                        >
                          <div
                            className="w-20 h-20 rounded-xl flex items-center justify-center text-4xl font-black shadow-lg border-2 border-white/20"
                            style={{
                              backgroundColor: symbol.bg,
                              color: symbol.textColor,
                              boxShadow: `0 4px 12px ${symbol.color}40, inset 0 2px 4px rgba(255,255,255,0.2)`
                            }}
                          >
                            {symbol.shape}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Win Highlight - Massive */}
                    {hasResult && isWinner && finalSymbols[reelIndex] && (
                      <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/30 to-orange-400/30 rounded-lg animate-pulse border-4 border-yellow-400" />
                    )}

                    {/* Lose Highlight */}
                    {hasResult && !isWinner && finalSymbols[reelIndex] && (
                      <div className="absolute inset-0 bg-gradient-to-r from-gray-500/20 to-gray-600/20 rounded-lg border-2 border-gray-500" />
                    )}

                    {/* Center line indicator */}
                    <div className="absolute left-0 right-0 top-1/2 h-1 bg-white/30 transform -translate-y-1/2 pointer-events-none" />
                  </div>

                  {/* Reel Label */}
                  <div className="text-center mt-3">
                    <span className="text-sm text-white/60 font-bold uppercase tracking-wider">
                      Reel {reelIndex + 1}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Status Panel */}
          <div className="mt-6 text-center">
            <div className="bg-gray-800/70 rounded-xl px-6 py-4 border-2 border-white/10">
              <p className="text-lg text-white/90 font-semibold">
                {isSpinning
                  ? '🎰 Processing transaction...'
                  : hasResult
                  ? `✅ ${isWinner ? 'Lucky confirmation!' : 'Transaction confirmed!'}`
                  : '🎰 Ready to spin'}
              </p>
            </div>
          </div>
        </div>

        {/* Decorative Corner Elements */}
        <div className="absolute -top-3 -left-3 w-8 h-8 bg-yellow-400 rounded-full animate-pulse shadow-lg shadow-yellow-400/50" />
        <div className="absolute -top-3 -right-3 w-8 h-8 bg-cyan-400 rounded-full animate-pulse shadow-lg shadow-cyan-400/50" />
        <div className="absolute -bottom-3 -left-3 w-8 h-8 bg-purple-400 rounded-full animate-pulse shadow-lg shadow-purple-400/50" />
        <div className="absolute -bottom-3 -right-3 w-8 h-8 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50" />

        {/* Side Decorations */}
        <div className="absolute -left-6 top-1/2 transform -translate-y-1/2 w-4 h-20 bg-gradient-to-b from-cyan-400 to-purple-400 rounded-full opacity-60" />
        <div className="absolute -right-6 top-1/2 transform -translate-y-1/2 w-4 h-20 bg-gradient-to-b from-purple-400 to-pink-400 rounded-full opacity-60" />
      </div>
    </div>
  );
};

export default SlotMachine;