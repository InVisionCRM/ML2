// Shared PLINKO constants for backend Node.js scripts
// Mirrors the TypeScript version for frontend compatibility

const PLINKO_CONSTANTS = {
  // World dimensions
  WORLD_WIDTH: 1000,
  WORLD_HEIGHT: 1000,
  ROWS: 16,

  // Spacing and positioning
  PEG_SPACING_X: 48,
  PEG_SPACING_Y: 48,
  START_Y: 60,
  BUCKET_Y: 820,

  // Object sizes
  PEG_RADIUS: 6,
  BALL_RADIUS: 15,

  // Physics parameters (CRITICAL - must match exactly)
  PHYSICS: {
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
  },

  // Multipliers for each risk level (matches contract exactly)
  // Contract stores in basis points (100 = 1x), frontend uses decimals
  MULTIPLIERS: {
    GREEN: [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1, 0.5, 1, 1.1, 1.2, 1.4, 1.4, 2, 9, 16],
    YELLOW: [110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110],
    RED: [1000, 120, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 120, 1000],
  },

  // Risk level mappings
  RISK_LEVEL: { LOW: 0, MEDIUM: 1, HIGH: 2 },
  RISK_LEVEL_MAP: { green: 0, yellow: 1, red: 2 },
  RISK_NAMES: ['GREEN', 'YELLOW', 'RED'],

  // Backend-specific constants for seed generation
  BOARD_DIMENSIONS: {
    REFERENCE_HEIGHT: 1000,
    TARGET_ASPECT_RATIO: 0.8,
    CONTAINER_WIDTH_PERCENT: 0.85,
    CONTAINER_HEIGHT_PERCENT: 0.90,
    MIN_SIZE: 200,
    MAX_WIDTH: 1000,
    MAX_HEIGHT: 1000,
    MIN_VERTICAL_OFFSET: 10,
    BUCKET_HEIGHT: 50,
  },
};

export default PLINKO_CONSTANTS;