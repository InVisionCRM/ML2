// Big Wheel / Big Six / Money Wheel Constants
// Based on the classic casino Big Six wheel configuration

import { BetType, WheelSegment } from './types';

// Simplified wheel configuration (7 segments total)
// Each segment represents one bet type with size proportional to probability
export const SEGMENT_COUNTS: Record<BetType, number> = {
  '1': 1,       // 1 segment - pays 1:1 (44.44% of wheel)
  '2': 1,       // 1 segment - pays 2:1 (27.78% of wheel)
  '5': 1,       // 1 segment - pays 5:1 (12.96% of wheel)
  '10': 1,      // 1 segment - pays 10:1 (7.41% of wheel)
  '20': 1,      // 1 segment - pays 20:1 (3.70% of wheel)
  'JOKER': 1,   // 1 segment - pays 40:1 (1.85% of wheel)
  'MORBIUS': 1, // 1 segment - pays 40:1 (1.85% of wheel)
};

// Payout multipliers (traditional Big Six payouts)
export const MULTIPLIERS: Record<BetType, number> = {
  '1': 1,       // 1:1 payout
  '2': 2,       // 2:1 payout
  '5': 5,       // 5:1 payout
  '10': 10,     // 10:1 payout
  '20': 20,     // 20:1 payout
  'JOKER': 40,  // 40:1 payout
  'MORBIUS': 40, // 40:1 payout (special symbol)
};

// Total segments on wheel
export const TOTAL_SEGMENTS = 7;

// Generate the wheel segments in contract order (must match BigWheel.sol _getBetTypeForSegment)
export function generateWheelSegments(): WheelSegment[] {
  const segments: WheelSegment[] = [];

  // Segment sizes proportional to probability (based on original 54-segment distribution)
  const segmentData = [
    { type: '1' as BetType, arcLength: 160 }, // 44.44% of wheel
    { type: '2' as BetType, arcLength: 100 }, // 27.78% of wheel
    { type: '5' as BetType, arcLength: 46.67 }, // 12.96% of wheel
    { type: '10' as BetType, arcLength: 26.67 }, // 7.41% of wheel
    { type: '20' as BetType, arcLength: 13.33 }, // 3.70% of wheel
    { type: 'JOKER' as BetType, arcLength: 6.67 }, // 1.85% of wheel
    { type: 'MORBIUS' as BetType, arcLength: 6.67 }, // 1.85% of wheel
  ];

  let currentAngle = 0;

  for (let i = 0; i < segmentData.length; i++) {
    const segment = segmentData[i];
    segments.push({
      id: i,
      value: segment.type,
      multiplier: MULTIPLIERS[segment.type],
      angle: currentAngle,
      arcLength: segment.arcLength,
    });
    currentAngle += segment.arcLength;
  }

  return segments;
}

// Pre-generated wheel segments
export const WHEEL_SEGMENTS = generateWheelSegments();

// Physics constants for realistic wheel spinning
export const PHYSICS = {
  MIN_SPINS: 5,           // Minimum full rotations
  MAX_SPINS: 18,          // Maximum full rotations
  SPIN_DURATION_BASE: 8000, // Base spin duration in ms (increased for more momentum)
  SPIN_DURATION_VARIANCE: 5000, // Random variance in ms
  DECELERATION_EASING: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)', // More realistic momentum decay
  TICK_SOUND_ENABLED: true,
};

// Bet limits
export const BET_LIMITS = {
  MIN_BET: 1000,
  MAX_BET: 10000,
  MAX_TOTAL_BET: 10000,
};

// UI Constants
export const WHEEL_SIZE = {
  MOBILE: 320,
  TABLET: 400,
  DESKTOP: 500,
};

// Chip denominations available for betting
export const CHIP_VALUES = [1000, 2000, 5555, 10000] as const;
