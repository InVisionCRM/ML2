'use client';

import React, { useState, useEffect } from 'react';
import { formatEther } from 'viem';
import { Card, Hand, GameState, Action } from '@/app/BLACKJACK/types';
import { CARD_VALUES, SUIT_SYMBOLS, SUIT_COLORS, ANIMATION_TIMINGS } from '@/app/BLACKJACK/constants';

interface BlackjackTableProps {
  playerHand: Hand;
  dealerHand: Hand;
  gameState: GameState;
  onAction?: (action: Action) => void; // Made optional since not used in table anymore
  canHit?: boolean;
  canStand?: boolean;
  canDoubleDown?: boolean;
  reserveBalance?: bigint;
  usePLS?: boolean;
}

interface CardComponentProps {
  card: Card;
  index: number;
  isAnimating?: boolean;
}

const CardComponent: React.FC<CardComponentProps> = ({ card, index, isAnimating = false }) => {
  const [isFlipped, setIsFlipped] = useState(card.hidden || false);

  useEffect(() => {
    if (card.hidden && !isFlipped) {
      const timer = setTimeout(() => setIsFlipped(true), ANIMATION_TIMINGS.CARD_FLIP);
      return () => clearTimeout(timer);
    }
  }, [card.hidden, isFlipped]);

  const displayValue = card.hidden ? '?' : CARD_VALUES[card.value];
  const suitSymbol = card.hidden ? '?' : SUIT_SYMBOLS[card.suit];
  const suitColor = card.hidden ? '#666' : SUIT_COLORS[card.suit];

  return (
    <div
      className={`relative w-24 h-32 rounded-lg border bg-white shadow-lg transform transition-all duration-300 ${
        isAnimating ? 'animate-pulse' : ''
      }`}
      style={{
        zIndex: index,
        background: 'linear-gradient(145deg, rgb(255, 255, 255), rgb(240, 240, 240))',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
        border: '2px solid rgba(60, 60, 60, 0.3)',
      }}
    >
      {/* Card back pattern when hidden */}
      {card.hidden && (
        <div className="absolute inset-0 rounded-lg border"
          style={{
            background: 'linear-gradient(145deg, rgba(6, 182, 212, 0.8), rgba(8, 145, 178, 0.8))',
            boxShadow: 'inset 2px 2px 4px rgba(0, 0, 0, 0.3), inset -2px -2px 4px rgba(255, 255, 255, 0.1)',
            border: '2px solid rgba(6, 182, 212, 0.5)',
          }}
        >
          <div className="absolute inset-2 rounded border"
            style={{
              background: 'linear-gradient(145deg, rgba(6, 182, 212, 0.6), rgba(8, 145, 178, 0.6))',
              border: '1px solid rgba(6, 182, 212, 0.4)',
            }}
          >
            <div className="grid grid-cols-4 grid-rows-6 gap-1 p-1 h-full opacity-80">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="bg-cyan-300 rounded-sm opacity-60"></div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Card front */}
      {!card.hidden && (
        <div className="absolute inset-0 flex flex-col justify-between p-2">
          {/* Top left corner */}
          <div className="flex flex-col items-center">
            <span
              className="text-lg font-bold leading-none"
              style={{ color: suitColor }}
            >
              {displayValue}
            </span>
            <span
              className="text-sm leading-none"
              style={{ color: suitColor }}
            >
              {suitSymbol}
            </span>
          </div>

          {/* Center symbol */}
          <div className="flex justify-center items-center flex-1">
            <span
              className="text-3xl"
              style={{ color: suitColor }}
            >
              {suitSymbol}
            </span>
          </div>

          {/* Bottom right corner (rotated) */}
          <div className="flex flex-col items-center rotate-180">
            <span
              className="text-lg font-bold leading-none"
              style={{ color: suitColor }}
            >
              {displayValue}
            </span>
            <span
              className="text-sm leading-none"
              style={{ color: suitColor }}
            >
              {suitSymbol}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

interface HandComponentProps {
  hand: Hand;
  label: string;
  isAnimating?: boolean;
}

const HandComponent: React.FC<HandComponentProps> = ({ hand, label, isAnimating = false }) => {
  return (
    <div className="relative flex gap-1">
      {hand.cards.length > 0 ? (
        hand.cards.map((card, index) => (
          <CardComponent
            key={`${card.suit}-${card.value}-${index}`}
            card={card}
            index={index}
            isAnimating={isAnimating && index === hand.cards.length - 1}
          />
        ))
      ) : (
        // Show card outlines when no cards are present
        Array.from({ length: 2 }).map((_, index) => (
          <div
            key={`placeholder-${index}`}
            className="relative w-24 h-32 rounded-lg border-2 border-dashed border-cyan-400/30 bg-transparent"
            style={{
              zIndex: index,
            }}
          >
            <div className="absolute inset-2 rounded border border-cyan-400/20 flex items-center justify-center">
              <span className="text-cyan-400/40 text-xs">♠</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

const BlackjackTable: React.FC<BlackjackTableProps> = ({
  playerHand,
  dealerHand,
  gameState,
  onAction,
  canHit,
  canStand,
  canDoubleDown,
  reserveBalance = 0n,
  usePLS = false
}) => {
  const isPlayerTurn = gameState === GameState.PLAYER_TURN;
  const isDealerTurn = gameState === GameState.DEALER_TURN;
  const isComplete = gameState === GameState.COMPLETE;

  return (
    <div className="relative w-full h-full min-h-[600px]">
      {/* Table background */}
      <div className="relative rounded-2xl h-full min-h-[600px] overflow-hidden shadow-2xl"
        style={{
          background: `linear-gradient(145deg, rgb(16, 26, 35), rgb(35, 36, 41)), url('/morbius/MorbiusLogo (3).png') center/contain no-repeat`,
          backgroundBlendMode: 'normal',
          boxShadow: 'inset 0 3px 6px rgba(0, 0, 0, 0.8), inset 0 -3px 6px rgba(255, 255, 255, 0.1), 0 8px 32px rgba(0, 0, 0, 0.3)',
          border: '4px solid rgba(6, 182, 212, 0.3)',
        }}
      >
        {/* Morbius logo overlay */}
        <div
          className="absolute inset-0 rounded-2xl border-2 border-white/20"
          style={{
            background: `url('/morbius/MorbiusLogo (3).png') center/120px 120px no-repeat`,
            opacity: 0.5,
          }}
        ></div>

        {/* Dealer label */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2">
          <div className="px-3 py-1 text-xs text-cyan-500 border-2 border-cyan-500 rounded-sm bg-gray-900/80 backdrop-blur-sm font-semibold">
            DEALER
          </div>
        </div>

        {/* Reserve display - top right */}
        <div className="absolute top-0 right-0">
          <div className="px-3 py-2 text-purple-400 border border-purple-400 rounded-sm backdrop-blur-sm flex items-center space-x-2">
            <span className="text-xs text-purple-300">Reserve:</span>
            <img
              src="/morbius/MorbiusLogo (3).png"
              alt="MORBIUS"
              className="w-6 h-6"
            />
            <span className="text-sm font-bold text-white">
              {Math.floor(Number(formatEther(reserveBalance)))}
            </span>
          </div>
        </div>

        {/* Dealer area - positioned at the top */}
        <div className="absolute top-[10%] left-1/2 transform -translate-x-1/2">
          <HandComponent
            hand={dealerHand}
            label="DEALER"
            isAnimating={isDealerTurn}
          />
        </div>

        {/* Player area - positioned at the bottom */}
        <div className="absolute bottom-[10%] left-1/2 transform -translate-x-1/2">
          <HandComponent
            hand={playerHand}
            label="PLAYER"
            isAnimating={isPlayerTurn}
          />
        </div>

        {/* Player label */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2">
          <div className="px-3 py-1 text-xs text-cyan-500 border-2 border-cyan-500 rounded-sm bg-gray-900/80 backdrop-blur-sm font-semibold">
            PLAYER
          </div>
        </div>


      </div>
    </div>
  );
};

export default BlackjackTable;