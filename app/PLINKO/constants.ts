
// app/PLINKO/constants.ts
// Frontend PLINKO constants - synchronized with backend for fairness

// Import shared multipliers (CRITICAL - must match contract exactly)
import PLINKO_CONSTANTS from '../../lib/plinko-constants';

// World dimensions (fixed for consistent gameplay)
export const WORLD_WIDTH = 1000;
export const WORLD_HEIGHT = 1000;
export const ROWS = 16;

// Spacing and positioning (must match backend seed generation)
export const PEG_SPACING_X = 48;
export const PEG_SPACING_Y = 48;
export const START_Y = 60;
export const BUCKET_Y = 820; // Fixed bucket position

// Object sizes
export const PEG_RADIUS = 6;
export const BALL_RADIUS = 15;

// Physics parameters (CRITICAL - must match seed generation exactly)
export const PHYSICS = {
  GRAVITY: 1.6,
  ENGINE_ITERATIONS: 10,
  SUB_STEPS: 4, // CRITICAL for determinism
  BALL_DENSITY: 0.9,
  BALL_RESTITUTION: 0.6,
  BALL_FRICTION: 0.005,
  BALL_FRICTION_AIR: 0.03,
  PEG_RESTITUTION: 0.5,
  PEG_FRICTION: 0,
  FIXED_TIME_STEP: 16.666,
  SPAWN_RANGE_X: 5,
  INITIAL_V_X_VARIANCE: 0.05,
  INITIAL_V_Y: 1,
};

// Import multipliers from shared constants (guaranteed to match contract)
export const MULTIPLIERS = PLINKO_CONSTANTS.MULTIPLIERS;

// Risk level mappings
export const RISK_LEVEL = { LOW: 0, MEDIUM: 1, HIGH: 2 } as const;
export const RISK_LEVEL_MAP = { green: 0, yellow: 1, red: 2 } as const;
export const RISK_NAMES = ['GREEN', 'YELLOW', 'RED'] as const;