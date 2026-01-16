import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import Matter from 'matter-js';
import seedrandom from 'seedrandom';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

// ======================================================
// 1. PRODUCTION CONSTANTS (Sync these with constants.ts)
// ======================================================
const WORLD_WIDTH = 1000;
const WORLD_HEIGHT = 1000;
const ROWS = 16;
const PEG_SPACING_X = 48;
const PEG_SPACING_Y = 48;
const START_Y = 60;
const BUCKET_Y = 820; 
const PEG_RADIUS = 5.5;
const BALL_RADIUS = 15;

const PHYSICS = {
    GRAVITY: 1,
    ENGINE_ITERATIONS: 10,
    SUB_STEPS: 4,
    BALL_DENSITY: 0.01,
    BALL_RESTITUTION: 0.4,
    BALL_FRICTION: 0.01,
    BALL_FRICTION_AIR: 0.045,
    PEG_RESTITUTION: 0.5,
    PEG_FRICTION: 0,
    FIXED_TIME_STEP: 16.666,
    SPAWN_RANGE_X: 4,
    INITIAL_V_X_VARIANCE: 0.05,
    INITIAL_V_Y: 3,
};

const MULTIPLIERS = {
    GREEN:  [7, 5.5, 2.7, 2, 1.5, 1.1, 1, 0.8, 0.5, 0.8, 1, 1.1, 1.5, 2, 2.7, 5.5, 7],
    YELLOW: [15, 7, 3.5, 2, 1.5, 1, 0.8, 0.5, 0.2, 0.5, 0.8, 1, 1.5, 2, 3.5, 7, 15],
    RED:    [35, 15, 7, 3.5, 1.5, 0.8, 0.2, 0.2, 0.2, 0.2, 0.2, 0.8, 1.5, 3.5, 7, 15, 35]
};

// ======================================================
// 2. WORKER THREAD LOGIC (The Physics Engine)
// ======================================================
if (!isMainThread) {
    const { riskLevel, dropsToRun, workerId } = workerData;
    const mults = MULTIPLIERS[riskLevel];
    const results = new Array(17).fill(0);
    let totalPayout = 0;

    const engine = Matter.Engine.create();
    engine.gravity.y = PHYSICS.GRAVITY;
    engine.positionIterations = PHYSICS.ENGINE_ITERATIONS;
    engine.velocityIterations = PHYSICS.ENGINE_ITERATIONS;

    // Build Static Peg Board
    let bottomRowStartX = 0;
    for (let r = 0; r < ROWS; r++) {
        const rowPegCount = r + 3;
        const rowWidth = (rowPegCount - 1) * PEG_SPACING_X;
        const startX = (WORLD_WIDTH - rowWidth) / 2;
        if (r === ROWS - 1) bottomRowStartX = startX;
        for (let c = 0; c < rowPegCount; c++) {
            Matter.World.add(engine.world, Matter.Bodies.circle(startX + c * PEG_SPACING_X, START_Y + r * PEG_SPACING_Y, PEG_RADIUS, { isStatic: true }));
        }
    }

    // Pre-calculate Bucket X Centers
    const bucketXCoords = Array.from({length: 17}, (_, i) => bottomRowStartX + (i * PEG_SPACING_X) + (PEG_SPACING_X / 2));

    for (let i = 0; i < dropsToRun; i++) {
        const rng = seedrandom(`audit-${riskLevel}-${workerId}-${i}`);
        
        // --- GAP SPAWN LOGIC ---
        // Offset by 24px so we don't spawn inside the center peg at 500px
        const gapCenterOffset = PEG_SPACING_X / 2; 
        const side = rng() > 0.5 ? 1 : -1;
        const spawnX = (WORLD_WIDTH / 2) + (side * gapCenterOffset) + ((rng() - 0.5) * PHYSICS.SPAWN_RANGE_X);

        const ball = Matter.Bodies.circle(spawnX, 20, BALL_RADIUS, {
            density: PHYSICS.BALL_DENSITY,
            restitution: PHYSICS.BALL_RESTITUTION,
            frictionAir: PHYSICS.BALL_FRICTION_AIR,
            friction: PHYSICS.BALL_FRICTION,
            collisionFilter: { group: -1 } // Ghost through other balls
        });

        Matter.Body.setVelocity(ball, { 
            x: (rng() - 0.5) * PHYSICS.INITIAL_V_X_VARIANCE, 
            y: PHYSICS.INITIAL_V_Y 
        });
        
        Matter.World.add(engine.world, ball);

        const subStepDelta = PHYSICS.FIXED_TIME_STEP / PHYSICS.SUB_STEPS;
        let safety = 0;
        while (ball.position.y < BUCKET_Y && safety < 2000) {
            for (let s = 0; s < PHYSICS.SUB_STEPS; s++) {
                Matter.Engine.update(engine, subStepDelta);
            }
            safety++;
        }

        // Find Result
        let closestBucket = 0;
        let minDistance = 1000;
        for (let b = 0; b < 17; b++) {
            const dist = Math.abs(ball.position.x - bucketXCoords[b]);
            if (dist < minDistance) { minDistance = dist; closestBucket = b; }
        }

        results[closestBucket]++;
        totalPayout += mults[closestBucket];
        Matter.World.remove(engine.world, ball);
    }

    parentPort.postMessage({ results, totalPayout });
}

// ======================================================
// 3. MAIN THREAD LOGIC (Orchestrator)
// ======================================================
if (isMainThread) {
    async function runFullAudit() {
        const TOTAL_DROPS_PER_RISK = 100000; // Total 300,000 balls
        const NUM_CORES = os.cpus().length;
        const risks = ['GREEN', 'YELLOW', 'RED'];

        console.log(`\n🚀 PLINKO PRODUCTION AUDIT`);
        console.log(`📦 Drops: ${TOTAL_DROPS_PER_RISK.toLocaleString()} per tier`);
        console.log(`💻 Cores: ${NUM_CORES} (Parallel processing active)\n`);

        for (const risk of risks) {
            process.stdout.write(`▶️  Auditing ${risk}... `);
            const startTime = Date.now();
            
            const workerPromises = [];
            const dropsPerWorker = Math.floor(TOTAL_DROPS_PER_RISK / NUM_CORES);

            for (let i = 0; i < NUM_CORES; i++) {
                workerPromises.push(new Promise((resolve) => {
                    const worker = new Worker(__filename, {
                        workerData: { riskLevel: risk, dropsToRun: dropsPerWorker, workerId: i }
                    });
                    worker.on('message', resolve);
                }));
            }

            const workerResults = await Promise.all(workerPromises);
            
            const aggregated = {
                results: new Array(17).fill(0),
                totalWon: 0
            };

            workerResults.forEach(res => {
                res.results.forEach((count, idx) => aggregated.results[idx] += count);
                aggregated.totalWon += res.totalPayout;
            });

            const duration = (Date.now() - startTime) / 1000;
            const rtp = (aggregated.totalWon / TOTAL_DROPS_PER_RISK) * 100;
            
            console.log(`✅ Done in ${duration.toFixed(1)}s`);
            console.log(`   RTP:           ${rtp.toFixed(2)}%`);
            console.log(`   House Edge:    ${(100 - rtp).toFixed(2)}%`);
            console.log(`   ID | Multi | Hits      | Prob`);
            MULTIPLIERS[risk].forEach((m, i) => {
                const hits = aggregated.results[i];
                const prob = ((hits / TOTAL_DROPS_PER_RISK) * 100).toFixed(3);
                console.log(`   ${i.toString().padStart(2)} | ${(m + "x").padStart(5)} | ${hits.toString().padStart(9)} | ${prob}%`);
            });
            console.log(`-------------------------------------------\n`);
        }
    }

    runFullAudit();
}