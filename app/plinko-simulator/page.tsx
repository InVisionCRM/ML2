"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Matter from "matter-js";
import seedrandom from "seedrandom";
import PlinkoGameConfigurable, { PlinkoGameHandle } from "@/components/PLINKO/PlinkoGameConfigurable";
import { MULTIPLIERS as DEFAULT_MULTIPLIERS } from "@/app/PLINKO/constants";

type RiskLevel = keyof typeof DEFAULT_MULTIPLIERS;

// Calculate binomial coefficient (n choose k)
function binomialCoefficient(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;

  let result = 1;
  for (let i = 1; i <= k; i++) {
    result = result * (n - i + 1) / i;
  }
  return result;
}

// Calculate theoretical probability for each bucket (16 rows = 17 buckets)
function calculateBucketProbabilities(rows: number): number[] {
  const numBuckets = rows + 1;
  const probabilities: number[] = [];
  const totalOutcomes = Math.pow(2, rows);

  for (let i = 0; i < numBuckets; i++) {
    const ways = binomialCoefficient(rows, i);
    probabilities.push(ways / totalOutcomes);
  }

  return probabilities;
}

// Calculate RTP based on multipliers and probabilities
function calculateRTP(multipliers: number[], probabilities: number[]): number {
  let rtp = 0;
  for (let i = 0; i < multipliers.length; i++) {
    rtp += multipliers[i] * probabilities[i];
  }
  return rtp * 100;
}

// Optimize multipliers to hit target RTP while maintaining shape
function optimizeMultipliers(
  currentMultipliers: number[],
  targetRTP: number,
  probabilities: number[]
): { multipliers: number[], actualRTP: number, adjustmentFactor: number } {
  const currentRTP = calculateRTP(currentMultipliers, probabilities);
  const adjustmentFactor = targetRTP / currentRTP;

  const optimized = currentMultipliers.map(m => {
    const adjusted = m * adjustmentFactor;
    return Math.round(adjusted * 100) / 100; // Round to 2 decimals
  });

  const actualRTP = calculateRTP(optimized, probabilities);

  return { multipliers: optimized, actualRTP, adjustmentFactor };
}

interface PhysicsConfig {
  WORLD_WIDTH: number;
  WORLD_HEIGHT: number;
  ROWS: number;
  PEG_SPACING_X: number;
  PEG_SPACING_Y: number;
  START_Y: number;
  BUCKET_Y: number;
  PEG_RADIUS: number;
  BALL_RADIUS: number;
  GRAVITY: number;
  ENGINE_ITERATIONS: number;
  SUB_STEPS: number;
  BALL_DENSITY: number;
  BALL_RESTITUTION: number;
  BALL_FRICTION: number;
  BALL_FRICTION_AIR: number;
  PEG_RESTITUTION: number;
  PEG_FRICTION: number;
  FIXED_TIME_STEP: number;
  SPAWN_RANGE_X: number;
  INITIAL_V_X_VARIANCE: number;
  INITIAL_V_Y: number;
}

const DEFAULT_PHYSICS: PhysicsConfig = {
  WORLD_WIDTH: 1000,
  WORLD_HEIGHT: 1000,
  ROWS: 16,
  PEG_SPACING_X: 48,
  PEG_SPACING_Y: 48,
  START_Y: 60,
  BUCKET_Y: 820,
  PEG_RADIUS: 6,
  BALL_RADIUS: 15,
  GRAVITY: 1.6,
  ENGINE_ITERATIONS: 10,
  SUB_STEPS: 4,
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

interface SimulationState {
  results: number[];
  totalWon: number;
  dropsCompleted: number;
  isRunning: boolean;
  rtp: number;
}

export default function PlinkoSimulator() {
  const [riskLevel, setRiskLevel] = useState<RiskLevel>("GREEN");
  const [totalDrops, setTotalDrops] = useState(10000);
  // Load physics from localStorage or use defaults
  const loadPhysicsFromStorage = (): PhysicsConfig => {
    if (typeof window === 'undefined') return DEFAULT_PHYSICS;
    try {
      const saved = localStorage.getItem('plinko-simulator-physics');
      return saved ? { ...DEFAULT_PHYSICS, ...JSON.parse(saved) } : DEFAULT_PHYSICS;
    } catch {
      return DEFAULT_PHYSICS;
    }
  };

  const [physics, setPhysics] = useState<PhysicsConfig>(loadPhysicsFromStorage);
  const [showPhysics, setShowPhysics] = useState(false);
  const [customMultipliers, setCustomMultipliers] = useState<Record<RiskLevel, number[]>>({
    GREEN: [...DEFAULT_MULTIPLIERS.GREEN],
    YELLOW: [...DEFAULT_MULTIPLIERS.YELLOW],
    RED: [...DEFAULT_MULTIPLIERS.RED],
  });
  const [targetRTP, setTargetRTP] = useState(97);
  const [simState, setSimState] = useState<SimulationState>({
    results: new Array(17).fill(0),
    totalWon: 0,
    dropsCompleted: 0,
    isRunning: false,
    rtp: 0,
  });

  // Live preview state
  const gameRef = useRef<PlinkoGameHandle>(null);
  const [liveResults, setLiveResults] = useState<number[]>(new Array(17).fill(0));
  const [liveDropsCount, setLiveDropsCount] = useState(0);
  const [liveTotalWon, setLiveTotalWon] = useState(0);
  const [autoDropEnabled, setAutoDropEnabled] = useState(false);
  const autoDropIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate probabilities from batch simulation results
  const actualProbabilities = simState.dropsCompleted > 0
    ? simState.results.map(hits => hits / simState.dropsCompleted)
    : new Array(17).fill(1 / 17); // Default to uniform if no simulation run yet

  const theoreticalProbabilities = calculateBucketProbabilities(physics.ROWS);
  const currentMultipliers = customMultipliers[riskLevel];

  // Use actual probabilities from simulation for RTP calculation
  const actualRTP = simState.dropsCompleted > 0
    ? calculateRTP(currentMultipliers, actualProbabilities)
    : 0;

  const theoreticalRTP = calculateRTP(currentMultipliers, theoreticalProbabilities);

  const runSimulation = useCallback(async () => {
    setSimState({
      results: new Array(17).fill(0),
      totalWon: 0,
      dropsCompleted: 0,
      isRunning: true,
      rtp: 0,
    });

    const mults = customMultipliers[riskLevel];
    const results = new Array(17).fill(0);
    let totalWon = 0;
    const BATCH_SIZE = 10;

    // Create physics engine
    const engine = Matter.Engine.create();
    engine.gravity.y = physics.GRAVITY;
    engine.positionIterations = physics.ENGINE_ITERATIONS;
    engine.velocityIterations = physics.ENGINE_ITERATIONS;

    // Create pegs
    let bottomRowStartX = 0;
    for (let r = 0; r < physics.ROWS; r++) {
      const rowPegCount = r + 3;
      const rowWidth = (rowPegCount - 1) * physics.PEG_SPACING_X;
      const startX = (physics.WORLD_WIDTH - rowWidth) / 2;
      if (r === physics.ROWS - 1) bottomRowStartX = startX;
      for (let c = 0; c < rowPegCount; c++) {
        Matter.World.add(
          engine.world,
          Matter.Bodies.circle(
            startX + c * physics.PEG_SPACING_X,
            physics.START_Y + r * physics.PEG_SPACING_Y,
            physics.PEG_RADIUS,
            {
              isStatic: true,
              restitution: physics.PEG_RESTITUTION,
              friction: physics.PEG_FRICTION,
            }
          )
        );
      }
    }

    // Create buckets as collision bodies (same as main game)
    const bucketWidth = physics.PEG_SPACING_X;
    const bucketXCoords = [];
    for (let i = 0; i < 17; i++) {
      const x = bottomRowStartX + (i * physics.PEG_SPACING_X) + (physics.PEG_SPACING_X / 2);
      bucketXCoords.push(x);

      Matter.World.add(
        engine.world,
        Matter.Bodies.rectangle(x, physics.BUCKET_Y, bucketWidth - 6, 50, {
          isStatic: true,
          isSensor: true,
          label: 'bucket',
          plugin: { index: i },
          render: { visible: false }
        })
      );
    }

    // Track bucket hits via collision detection
    const bucketHits = new Array(17).fill(0);
    const processedBalls = new Set();

    Matter.Events.on(engine, 'collisionStart', (event) => {
      event.pairs.forEach((pair) => {
        const { bodyA, bodyB } = pair;
        const ball = bodyA.label === 'ball' ? bodyA : bodyB.label === 'ball' ? bodyB : null;
        const bucket = bodyA.label === 'bucket' ? bodyA : bodyB.label === 'bucket' ? bodyB : null;

        if (ball && bucket && !processedBalls.has(ball.id)) {
          const bucketIndex = bucket.plugin.index;
          bucketHits[bucketIndex]++;
          totalWon += mults[bucketIndex]; // Add winnings when ball hits bucket
          processedBalls.add(ball.id);
        }
      });
    });

    // Clean up collision listeners when done
    const cleanup = () => {
      Matter.Events.off(engine, 'collisionStart');
    };

    // Simulate drops
    for (let i = 0; i < totalDrops; i++) {
      const rng = seedrandom(`sim-${riskLevel}-${i}`);

      // Gap spawning - 50/50 left/right (matches simulate-plinko.js exactly)
      const gapOffset = physics.PEG_SPACING_X / 2;
      const side = rng() > 0.5 ? 1 : -1; // 50% left, 50% right (no center)
      const spawnX =
        physics.WORLD_WIDTH / 2 +
        side * gapOffset +
        (rng() - 0.5) * physics.SPAWN_RANGE_X;

      const ball = Matter.Bodies.circle(spawnX, 20, physics.BALL_RADIUS, {
        density: physics.BALL_DENSITY,
        restitution: physics.BALL_RESTITUTION,
        frictionAir: physics.BALL_FRICTION_AIR,
        friction: physics.BALL_FRICTION,
        collisionFilter: { group: -1 },
        label: 'ball',
      });

      Matter.Body.setVelocity(ball, {
        x: (rng() - 0.5) * physics.INITIAL_V_X_VARIANCE,
        y: physics.INITIAL_V_Y,
      });

      Matter.World.add(engine.world, ball);

      // Let physics run until ball hits bucket or falls below bucket level
      const subStepDelta = physics.FIXED_TIME_STEP / physics.SUB_STEPS;
      let safety = 0;
      let ballHitBucket = false;

      while (ball.position.y < physics.BUCKET_Y + 100 && safety < 2000 && !ballHitBucket) {
        for (let s = 0; s < physics.SUB_STEPS; s++) {
          Matter.Engine.update(engine, subStepDelta);

          // Check if ball has been processed (hit a bucket)
          if (processedBalls.has(ball.id)) {
            ballHitBucket = true;
            break;
          }
        }
        safety++;
      }

      // If ball didn't hit any bucket, it counts as a miss (no multiplier)
      if (!ballHitBucket) {
        // Ball missed all buckets - this is a loss (0 multiplier)
        totalWon += 0; // No winnings for missed balls
      }

      Matter.World.remove(engine.world, ball);

      // Update UI periodically
      if ((i + 1) % BATCH_SIZE === 0 || i === totalDrops - 1) {
        const rtp = (totalWon / (i + 1)) * 100;
        setSimState({
          results: [...bucketHits],
          totalWon,
          dropsCompleted: i + 1,
          isRunning: i < totalDrops - 1,
          rtp,
        });

        // Allow UI to update
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    // Cleanup
    cleanup();
  }, [riskLevel, totalDrops, physics, customMultipliers]);

  const maxHits = Math.max(...simState.results, 1);
  const progress = (simState.dropsCompleted / totalDrops) * 100;

  const updatePhysics = (key: keyof PhysicsConfig, value: number) => {
    setPhysics((prev) => {
      const newPhysics = { ...prev, [key]: value };
      // Auto-save to localStorage
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('plinko-simulator-physics', JSON.stringify(newPhysics));
        } catch (error) {
          console.warn('Failed to save physics settings to localStorage:', error);
        }
      }
      return newPhysics;
    });
  };

  const resetPhysics = () => {
    setPhysics(DEFAULT_PHYSICS);
    // Clear saved physics from localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('plinko-simulator-physics');
      } catch (error) {
        console.warn('Failed to clear physics settings from localStorage:', error);
      }
    }
  };

  // Multiplier handlers
  const updateMultiplier = (index: number, value: number) => {
    setCustomMultipliers(prev => ({
      ...prev,
      [riskLevel]: prev[riskLevel].map((m, i) => i === index ? value : m)
    }));
  };

  const resetMultipliers = () => {
    setCustomMultipliers({
      GREEN: [...DEFAULT_MULTIPLIERS.GREEN],
      YELLOW: [...DEFAULT_MULTIPLIERS.YELLOW],
      RED: [...DEFAULT_MULTIPLIERS.RED],
    });
  };

  const optimizeForTargetRTP = () => {
    // Use actual probabilities from batch simulation if available
    const probsToUse = simState.dropsCompleted > 1000
      ? actualProbabilities
      : theoreticalProbabilities;

    const result = optimizeMultipliers(
      customMultipliers[riskLevel],
      targetRTP,
      probsToUse
    );

    setCustomMultipliers(prev => ({
      ...prev,
      [riskLevel]: result.multipliers
    }));
  };

  // Live preview handlers
  const handleLiveScore = useCallback((multiplier: number, bucketIndex: number) => {
    setLiveResults(prev => {
      const next = [...prev];
      next[bucketIndex]++;
      return next;
    });
    setLiveDropsCount(prev => prev + 1);
    setLiveTotalWon(prev => prev + multiplier);
  }, []);

  const handleDropBall = useCallback(() => {
    gameRef.current?.dropBall();
  }, []);

  const handleDropMultiple = useCallback((count: number) => {
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        gameRef.current?.dropBall();
      }, i * 200); // Stagger drops by 200ms
    }
  }, []);

  const handleResetLiveStats = useCallback(() => {
    setLiveResults(new Array(17).fill(0));
    setLiveDropsCount(0);
    setLiveTotalWon(0);
  }, []);

  const toggleAutoDrop = useCallback(() => {
    if (autoDropEnabled) {
      if (autoDropIntervalRef.current) {
        clearInterval(autoDropIntervalRef.current);
        autoDropIntervalRef.current = null;
      }
      setAutoDropEnabled(false);
    } else {
      autoDropIntervalRef.current = setInterval(() => {
        gameRef.current?.dropBall();
      }, 1000); // Drop every 1 second
      setAutoDropEnabled(true);
    }
  }, [autoDropEnabled]);

  // Cleanup auto-drop on unmount
  useEffect(() => {
    return () => {
      if (autoDropIntervalRef.current) {
        clearInterval(autoDropIntervalRef.current);
      }
    };
  }, []);

  const liveRTP = liveDropsCount > 0 ? (liveTotalWon / liveDropsCount) * 100 : 0;
  const liveMaxHits = Math.max(...liveResults, 1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-blue-900 p-4 md:p-8">
      <div className="max-w-[2000px] mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-6 text-center">
          Plinko Physics Simulator
        </h1>

        {/* Top Controls - Single Column */}
        <Card className="p-4 md:p-6 mb-6 bg-black/50 border-purple-500">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-white mb-2 text-sm">Risk Level</label>
              <select
                value={riskLevel}
                onChange={(e) => setRiskLevel(e.target.value as RiskLevel)}
                disabled={simState.isRunning}
                className="w-full bg-black/50 text-white border border-purple-500 rounded-lg p-2 text-sm"
              >
                <option value="GREEN">Green (Low)</option>
                <option value="YELLOW">Yellow (Medium)</option>
                <option value="RED">Red (High)</option>
              </select>
            </div>

            <div>
              <label className="block text-white mb-2 text-sm">Batch Drops</label>
              <input
                type="number"
                value={totalDrops}
                onChange={(e) => setTotalDrops(Number(e.target.value))}
                disabled={simState.isRunning}
                className="w-full bg-black/50 text-white border border-purple-500 rounded-lg p-2 text-sm"
                min="100"
                max="100000"
                step="100"
              />
            </div>

            <div className="flex items-end">
              <Button
                onClick={() => setShowPhysics(!showPhysics)}
                disabled={simState.isRunning}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                size="sm"
              >
                {showPhysics ? "Hide" : "Show"} Physics
              </Button>
            </div>

            <div className="flex items-end">
              <Button
                onClick={resetPhysics}
                disabled={simState.isRunning}
                className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
                size="sm"
              >
                Reset Physics
              </Button>
            </div>

            <div className="flex items-end">
              <Button
                onClick={handleResetLiveStats}
                className="w-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700"
                size="sm"
              >
                Reset Live Stats
              </Button>
            </div>

            <div className="flex items-end">
              <Button
                onClick={runSimulation}
                disabled={simState.isRunning}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                size="sm"
              >
                {simState.isRunning ? "Running..." : "Batch Sim"}
              </Button>
            </div>
          </div>
        </Card>

        {/* 4-Column Grid: Physics | Board | Results | Multipliers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {/* Column 1: Physics Editor */}
          <Card className="p-4 bg-black/50 border-purple-500">
            <h2 className="text-lg font-bold text-white mb-3">Physics</h2>
            <div className="space-y-2 max-h-[700px] overflow-y-auto pr-2">
              {/* Highlighted Variance Parameter */}
              <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-2 mb-3">
                <div className="flex items-center gap-2">
                  <label className="text-yellow-300 text-xs font-mono flex-1 min-w-0 font-bold">
                    INITIAL_V_X_VARIANCE (Variance)
                  </label>
                  <input
                    type="number"
                    value={physics.INITIAL_V_X_VARIANCE}
                    onChange={(e) =>
                      updatePhysics('INITIAL_V_X_VARIANCE', Number(e.target.value))
                    }
                    disabled={simState.isRunning}
                    className="w-24 bg-black/50 text-yellow-300 border border-yellow-500 rounded p-1 text-xs font-bold"
                    step="0.01"
                    min="0"
                    max="1"
                  />
                </div>
                <div className="text-yellow-400/70 text-xs mt-1">
                  Controls horizontal ball spread (lower = more predictable)
                </div>
              </div>

              {/* Other Physics Parameters */}
              {Object.entries(physics).filter(([key]) => key !== 'INITIAL_V_X_VARIANCE').map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <label className="text-gray-300 text-xs font-mono flex-1 min-w-0">
                    {key}
                  </label>
                  <input
                    type="number"
                    value={value}
                    onChange={(e) =>
                      updatePhysics(key as keyof PhysicsConfig, Number(e.target.value))
                    }
                    disabled={simState.isRunning}
                    className="w-24 bg-black/50 text-white border border-purple-500 rounded p-1 text-xs"
                    step="any"
                  />
                </div>
              ))}
            </div>
          </Card>

          {/* Column 2: Live Game Board */}
          <Card className="p-4 bg-black/50 border-purple-500">
            <h2 className="text-lg font-bold text-white mb-3">Board</h2>
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg border border-white/10 mb-3" style={{ height: '500px' }}>
              <PlinkoGameConfigurable
                ref={gameRef}
                onScore={handleLiveScore}
                selectedRiskLevel={riskLevel}
                physics={physics}
                soundEnabled={false}
                customMultipliers={currentMultipliers}
              />
            </div>
            <div className="grid grid-cols-4 gap-2 mb-3">
              <Button
                onClick={handleDropBall}
                className="bg-green-600 hover:bg-green-700"
                size="sm"
              >
                1
              </Button>
              <Button
                onClick={() => handleDropMultiple(10)}
                className="bg-blue-600 hover:bg-blue-700"
                size="sm"
              >
                10
              </Button>
              <Button
                onClick={() => handleDropMultiple(50)}
                className="bg-purple-600 hover:bg-purple-700"
                size="sm"
              >
                50
              </Button>
              <Button
                onClick={toggleAutoDrop}
                className={autoDropEnabled ? 'bg-red-600' : 'bg-yellow-600'}
                size="sm"
              >
                {autoDropEnabled ? 'Stop' : 'Auto'}
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white/5 p-2 rounded">
                <div className="text-gray-400 text-xs">Drops</div>
                <div className="text-sm font-bold text-white">{liveDropsCount}</div>
              </div>
              <div className="bg-white/5 p-2 rounded">
                <div className="text-gray-400 text-xs">RTP</div>
                <div className="text-sm font-bold text-white">{liveRTP.toFixed(2)}%</div>
              </div>
              <div className="bg-white/5 p-2 rounded">
                <div className="text-gray-400 text-xs">Won</div>
                <div className="text-sm font-bold text-white">{liveTotalWon.toFixed(1)}x</div>
              </div>
            </div>
          </Card>

          {/* Column 3: Live Results Distribution */}
          <Card className="p-4 bg-black/50 border-purple-500">
            <h2 className="text-lg font-bold text-white mb-3">Results</h2>
            <div className="space-y-1 max-h-[700px] overflow-y-auto pr-2">
              {currentMultipliers.map((mult, index) => {
                const hits = liveResults[index];
                const prob = liveDropsCount > 0
                  ? ((hits / liveDropsCount) * 100).toFixed(1)
                  : "0";
                const barWidth = (hits / liveMaxHits) * 100;

                return (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-6 text-right text-purple-400 font-mono text-xs">
                      {index}
                    </div>
                    <div className="w-10 text-right text-yellow-400 font-bold text-xs">
                      {mult}x
                    </div>
                    <div className="flex-1 bg-black/30 rounded-full h-4 relative overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-purple-600 to-blue-600 h-full transition-all duration-300 flex items-center justify-end pr-1"
                        style={{ width: `${barWidth}%` }}
                      >
                        {hits > 0 && (
                          <span className="text-white text-xs font-bold">
                            {hits}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="w-10 text-right text-green-400 font-mono text-xs">
                      {prob}%
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Column 4: Multiplier Editor */}
          <Card className="p-4 bg-black/50 border-purple-500">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-white">Multipliers</h2>
              <Button
                onClick={resetMultipliers}
                className="bg-orange-600 hover:bg-orange-700 text-xs h-7 px-2"
              >
                Reset
              </Button>
            </div>

            {/* RTP Display */}
            <div className="mb-3 p-3 bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded-lg border border-purple-500/30">
              {simState.dropsCompleted > 0 ? (
                <>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-400 text-xs">Actual RTP (Batch):</span>
                    <span className="text-white font-bold text-sm">{actualRTP.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-400 text-xs">Simulated RTP:</span>
                    <span className="text-white font-bold text-sm">{simState.rtp.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-400 text-xs">House Edge:</span>
                    <span className="text-white font-bold text-sm">{(100 - actualRTP).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-400 text-xs">Drops:</span>
                    <span className="text-cyan-400 font-bold text-sm">{simState.dropsCompleted.toLocaleString()}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-400 text-xs">Theoretical RTP:</span>
                    <span className="text-white font-bold text-sm">{theoreticalRTP.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-400 text-xs">House Edge:</span>
                    <span className="text-white font-bold text-sm">{(100 - theoreticalRTP).toFixed(2)}%</span>
                  </div>
                  <div className="text-yellow-400 text-xs mt-2">
                    ⚠️ Run batch simulation to see actual RTP
                  </div>
                </>
              )}
              <div className="h-px bg-purple-500/30 my-2" />
              <div className="flex items-center gap-2">
                <label className="text-gray-400 text-xs flex-1">Target RTP:</label>
                <input
                  type="number"
                  value={targetRTP}
                  onChange={(e) => setTargetRTP(Number(e.target.value))}
                  className="w-16 bg-black/50 text-white border border-purple-500 rounded p-1 text-xs text-center"
                  min="80"
                  max="100"
                  step="0.1"
                />
                <span className="text-gray-400 text-xs">%</span>
              </div>
              <Button
                onClick={optimizeForTargetRTP}
                className="w-full mt-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-xs h-7"
              >
                Optimize
              </Button>
            </div>

            {/* Multiplier Inputs */}
            <div className="space-y-1 max-h-[500px] overflow-y-auto pr-2">
              {currentMultipliers.map((mult, index) => {
                // Use actual probabilities from batch simulation if available
                const prob = simState.dropsCompleted > 0
                  ? actualProbabilities[index]
                  : theoreticalProbabilities[index];
                const contribution = mult * prob * 100;
                const hits = simState.results[index];

                return (
                  <div key={index} className="flex items-center gap-2 bg-black/20 rounded p-1">
                    <div className="w-6 text-center text-purple-400 font-mono text-xs">
                      {index}
                    </div>
                    <input
                      type="number"
                      value={mult}
                      onChange={(e) => updateMultiplier(index, Number(e.target.value))}
                      className="w-16 bg-black/50 text-white border border-purple-500 rounded p-1 text-xs text-center font-bold"
                      step="0.1"
                    />
                    <div className="flex-1 text-right">
                      {simState.dropsCompleted > 0 ? (
                        <div className="text-gray-400 text-xs">
                          {(prob * 100).toFixed(2)}%
                          <span className="text-gray-600 ml-1">({hits})</span>
                        </div>
                      ) : (
                        <div className="text-gray-500 text-xs">
                          {(prob * 100).toFixed(2)}%
                        </div>
                      )}
                    </div>
                    <div className="w-12 text-right">
                      <div className={`text-xs font-bold ${contribution > 6 ? 'text-red-400' : contribution > 3 ? 'text-yellow-400' : 'text-green-400'}`}>
                        +{contribution.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Math Suggestions */}
            <div className="mt-3 p-2 bg-black/30 rounded text-xs">
              <div className="text-gray-400 mb-1">💡 Analysis & Tips:</div>
              <div className="text-gray-300 space-y-1">
                {simState.dropsCompleted > 0 ? (
                  <>
                    {actualRTP > targetRTP + 0.5 && (
                      <div className="text-orange-400">
                        • RTP too high by {(actualRTP - targetRTP).toFixed(2)}%. Reduce multipliers proportionally.
                      </div>
                    )}
                    {actualRTP < targetRTP - 0.5 && (
                      <div className="text-blue-400">
                        • RTP too low by {(targetRTP - actualRTP).toFixed(2)}%. Increase multipliers proportionally.
                      </div>
                    )}
                    {Math.abs(actualRTP - targetRTP) <= 0.5 && (
                      <div className="text-green-400">
                        ✓ RTP is within 0.5% of target!
                      </div>
                    )}
                    <div className="text-gray-500 mt-2">
                      • Highest hit bucket: #{actualProbabilities.indexOf(Math.max(...actualProbabilities))}
                      ({(Math.max(...actualProbabilities) * 100).toFixed(2)}%)
                    </div>
                    <div className="text-gray-500">
                      • Lowest hit bucket: #{actualProbabilities.indexOf(Math.min(...actualProbabilities))}
                      ({(Math.min(...actualProbabilities) * 100).toFixed(3)}%)
                    </div>
                    {Math.abs(actualRTP - simState.rtp) > 0.5 && (
                      <div className="text-yellow-400 mt-2">
                        ⚠️ Actual vs Simulated RTP differ by {Math.abs(actualRTP - simState.rtp).toFixed(2)}%
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="text-yellow-400">
                      • Run batch simulation first to get actual data
                    </div>
                    <div className="text-gray-500 mt-2">
                      • Theoretical center probability: ~{(theoreticalProbabilities[8] * 100).toFixed(1)}%
                    </div>
                    <div className="text-gray-500">
                      • Theoretical edge probability: ~{(theoreticalProbabilities[0] * 100).toFixed(3)}%
                    </div>
                  </>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Batch Simulation Section */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-white mb-3">Batch Simulation</h2>

          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-3 mb-3">
            <Card className="p-3 bg-black/50 border-purple-500">
              <div className="text-gray-400 text-xs">Progress</div>
              <div className="text-lg font-bold text-white">{progress.toFixed(1)}%</div>
            </Card>
            <Card className="p-3 bg-black/50 border-purple-500">
              <div className="text-gray-400 text-xs">Drops</div>
              <div className="text-lg font-bold text-white">{simState.dropsCompleted.toLocaleString()}</div>
            </Card>
            <Card className="p-3 bg-black/50 border-purple-500">
              <div className="text-gray-400 text-xs">RTP</div>
              <div className="text-lg font-bold text-white">{simState.rtp.toFixed(2)}%</div>
            </Card>
            <Card className="p-3 bg-black/50 border-purple-500">
              <div className="text-gray-400 text-xs">House Edge</div>
              <div className="text-lg font-bold text-white">{(100 - simState.rtp).toFixed(2)}%</div>
            </Card>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-black/50 rounded-full h-3 border border-purple-500 mb-3">
            <div
              className="bg-gradient-to-r from-purple-600 to-blue-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Batch Distribution */}
        <Card className="p-4 bg-black/50 border-purple-500">
          <h2 className="text-lg font-bold text-white mb-3">
            Batch Distribution
          </h2>

          <div className="space-y-1">
            {currentMultipliers.map((mult, index) => {
              const hits = simState.results[index];
              const prob = simState.dropsCompleted > 0
                ? ((hits / simState.dropsCompleted) * 100).toFixed(2)
                : "0.00";
              const barWidth = (hits / maxHits) * 100;

              return (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-6 text-right text-purple-400 font-mono text-xs">
                    {index}
                  </div>
                  <div className="w-10 text-right text-yellow-400 font-bold text-xs">
                    {mult}x
                  </div>
                  <div className="flex-1 bg-black/30 rounded-full h-4 relative overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-purple-600 to-blue-600 h-full transition-all duration-300 flex items-center justify-end pr-1"
                      style={{ width: `${barWidth}%` }}
                    >
                      {hits > 0 && (
                        <span className="text-white text-xs font-bold">
                          {hits.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-12 text-right text-green-400 font-mono text-xs">
                    {prob}%
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Physics Info */}
        <Card className="p-4 mt-6 bg-black/50 border-purple-500">
          <h3 className="text-sm font-bold text-white mb-2">
            About This Simulator
          </h3>
          <p className="text-gray-300 text-xs mb-2">
            Uses the exact Matter.js physics engine as the actual game. Adjust physics parameters in real-time to test different configurations and see how they affect distribution and RTP.
          </p>
        </Card>
      </div>
    </div>
  );
}
