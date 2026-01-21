// Big Wheel / Big Six / Money Wheel Types

export type BetType = '1' | '2' | '5' | '10' | '20' | 'JOKER' | 'MORBIUS';

export interface WheelSegment {
  id: number;
  value: BetType;
  multiplier: number;
  angle: number; // Starting angle of segment
  arcLength: number; // Angular width of segment
}

export interface Bet {
  type: BetType;
  amount: number;
}

export interface GameState {
  balance: number;
  bets: Bet[];
  isSpinning: boolean;
  lastResult: WheelSegment | null;
  history: SpinResult[];
}

export interface SpinResult {
  id: number;
  segment: WheelSegment;
  totalBet: number;
  totalWin: number;
  timestamp: number;
  txHash?: string;
}

export interface ContractResult {
  seed?: string;
  segmentIndex: number;
  multiplier: number;
  payout: bigint;
}

// Betting chip sizes
export type ChipSize = 1000 | 2000 | 5555 | 10000;

// Animation states
export type SpinState = 'idle' | 'accelerating' | 'spinning' | 'decelerating' | 'stopped';
