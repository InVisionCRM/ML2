import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import Matter from 'matter-js';
import seedrandom from 'seedrandom';
import { MULTIPLIERS } from '@/app/PLINKO/constants';
import { RiskLevel } from '@/app/PLINKO/types';

export interface PhysicsConfig {
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

interface PlinkoGameConfigurableProps {
  onScore: (multiplier: number, bucketIndex: number) => void;
  selectedRiskLevel: RiskLevel;
  physics: PhysicsConfig;
  soundEnabled?: boolean;
  customMultipliers?: number[];
}

export interface PlinkoGameHandle {
  dropBall: () => void;
}

const PlinkoGameConfigurable = forwardRef<PlinkoGameHandle, PlinkoGameConfigurableProps>(
  ({ onScore, selectedRiskLevel, physics, soundEnabled = false, customMultipliers }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<Matter.Engine | null>(null);
    const ballsToRemove = useRef<Set<Matter.Body>>(new Set());
    const animatingPegs = useRef<Set<string>>(new Set());
    const pegAnimationStartTimes = useRef<Map<string, number>>(new Map());
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const animatingBucket = useRef<number | null>(null);
    const animatingBucketStartTime = useRef<number | null>(null);
    const pegsRef = useRef<Matter.Body[]>([]);
    const dropCounterRef = useRef(0);

    // Expose dropBall method to parent
    useImperativeHandle(ref, () => ({
      dropBall: () => {
        if (!engineRef.current) return;

        const rng = seedrandom(`test-${dropCounterRef.current++}`);

        // Gap spawning with center option
        const gapOffset = physics.PEG_SPACING_X / 2;
        const sideRand = rng();
        const side = sideRand > 0.66 ? 1 : sideRand > 0.33 ? -1 : 0; // 33% left, 33% right, 33% center
        const spawnX = physics.WORLD_WIDTH / 2 + side * gapOffset + (rng() - 0.5) * physics.SPAWN_RANGE_X;
        const initialVelX = (rng() - 0.5) * physics.INITIAL_V_X_VARIANCE;

        const ball = Matter.Bodies.circle(spawnX, 20, physics.BALL_RADIUS, {
          restitution: physics.BALL_RESTITUTION,
          friction: physics.BALL_FRICTION,
          frictionAir: physics.BALL_FRICTION_AIR,
          density: physics.BALL_DENSITY,
          label: 'ball',
          collisionFilter: { group: -1 },
          plugin: {
            color: '#4392F1',
            risk: selectedRiskLevel
          }
        });

        Matter.Body.setVelocity(ball, {
          x: initialVelX,
          y: physics.INITIAL_V_Y
        });

        Matter.World.add(engineRef.current.world, ball);
      }
    }));

    // Handle Resize & High-DPI Resolution
    useEffect(() => {
      if (!containerRef.current || !canvasRef.current) return;

      const observer = new ResizeObserver((entries) => {
        for (let entry of entries) {
          const dpr = window.devicePixelRatio || 1;
          const width = entry.contentRect.width;
          const height = entry.contentRect.height;

          if (canvasRef.current) {
            canvasRef.current.width = width * dpr;
            canvasRef.current.height = height * dpr;
            canvasRef.current.style.width = `${width}px`;
            canvasRef.current.style.height = `${height}px`;
            setDimensions({ width, height });
          }
        }
      });

      observer.observe(containerRef.current);
      return () => observer.disconnect();
    }, []);

    // Main Physics World Setup - Rebuild when physics changes
    useEffect(() => {
      if (!canvasRef.current || dimensions.width === 0) return;

      // Create new engine if doesn't exist
      if (!engineRef.current) {
        engineRef.current = Matter.Engine.create();
      }

      const engine = engineRef.current;
      engine.gravity.y = physics.GRAVITY;
      engine.constraintIterations = physics.ENGINE_ITERATIONS;
      engine.positionIterations = physics.ENGINE_ITERATIONS;
      engine.velocityIterations = physics.ENGINE_ITERATIONS;

      Matter.World.clear(engine.world, false);

      // Build Peg Board
      const pegs: Matter.Body[] = [];
      let bottomRowStartX = 0;

      for (let r = 0; r < physics.ROWS; r++) {
        const rowPegCount = r + 3;
        const rowWidth = (rowPegCount - 1) * physics.PEG_SPACING_X;
        const startX = (physics.WORLD_WIDTH - rowWidth) / 2;
        const y = physics.START_Y + r * physics.PEG_SPACING_Y;

        if (r === physics.ROWS - 1) bottomRowStartX = startX;

        for (let c = 0; c < rowPegCount; c++) {
          pegs.push(
            Matter.Bodies.circle(startX + c * physics.PEG_SPACING_X, y, physics.PEG_RADIUS, {
              isStatic: true,
              restitution: physics.PEG_RESTITUTION,
              friction: physics.PEG_FRICTION,
              label: 'peg',
              render: { visible: false }
            })
          );
        }
      }
      Matter.World.add(engine.world, pegs);
      pegsRef.current = pegs;

      // Build 17 Buckets
      const bucketWidth = physics.PEG_SPACING_X;
      for (let i = 0; i < 17; i++) {
        const x = bottomRowStartX + i * physics.PEG_SPACING_X + physics.PEG_SPACING_X / 2;
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

      // Collision Detection
      Matter.Events.on(engine, 'collisionStart', (event) => {
        event.pairs.forEach((pair) => {
          const { bodyA, bodyB } = pair;
          const ball = bodyA.label === 'ball' ? bodyA : bodyB.label === 'ball' ? bodyB : null;
          const bucket = bodyA.label === 'bucket' ? bodyA : bodyB.label === 'bucket' ? bodyB : null;
          const peg = bodyA.label === 'peg' ? bodyA : bodyB.label === 'peg' ? bodyB : null;

          // Handle ball-peg collisions
          if (ball && peg) {
            const pegId = `${Math.round(peg.position.x)}_${Math.round(peg.position.y)}`;
            animatingPegs.current.add(pegId);
            pegAnimationStartTimes.current.set(pegId, Date.now());
            setTimeout(() => {
              animatingPegs.current.delete(pegId);
              pegAnimationStartTimes.current.delete(pegId);
            }, 600);
          }

          // Handle ball-bucket collisions
          if (ball && bucket && !ballsToRemove.current.has(ball)) {
            const index = bucket.plugin.index;
            const ballRisk = ball.plugin.risk as RiskLevel;
            const riskKey = ballRisk.toUpperCase() as 'GREEN' | 'YELLOW' | 'RED';

            // Use custom multipliers if provided, otherwise use defaults
            const multiplier = customMultipliers
              ? customMultipliers[index]
              : MULTIPLIERS[riskKey][index];

            onScore(multiplier, index);

            animatingBucket.current = index;
            animatingBucketStartTime.current = Date.now();
            setTimeout(() => {
              animatingBucket.current = null;
              animatingBucketStartTime.current = null;
            }, 600);

            ballsToRemove.current.add(ball);
          }
        });
      });

      // Sub-stepped Game Loop
      const runner = setInterval(() => {
        const subStepDelta = physics.FIXED_TIME_STEP / physics.SUB_STEPS;
        for (let i = 0; i < physics.SUB_STEPS; i++) {
          Matter.Engine.update(engine, subStepDelta);
        }
        renderCanvas();
      }, physics.FIXED_TIME_STEP);

      const renderCanvas = () => {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx || !canvasRef.current) return;

        const dpr = window.devicePixelRatio || 1;

        const contentWidth = 820;
        const contentHeight = physics.BUCKET_Y - physics.START_Y + 140; // Extra space for visible chute

        const scale = Math.min(
          (dimensions.width * 0.92) / contentWidth,
          (dimensions.height * 0.92) / contentHeight
        );

        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.save();

        ctx.scale(dpr, dpr);
        ctx.translate(dimensions.width / 2, dimensions.height / 2);
        ctx.scale(scale, scale);

        const worldCenterX = physics.WORLD_WIDTH / 2;
        const worldCenterY = (physics.START_Y + physics.BUCKET_Y) / 2 - 10; // Adjust for visible chute
        ctx.translate(-worldCenterX, -worldCenterY);

        // DRAW BUCKETS
        const buckets = engine.world.bodies.filter((b) => b.label === 'bucket');
        buckets.forEach((bucket) => {
          const idx = bucket.plugin.index;
          const riskKey = selectedRiskLevel.toUpperCase() as RiskLevel;

          // Use custom multipliers if provided, otherwise use defaults
          const multiplier = customMultipliers
            ? customMultipliers[idx]
            : MULTIPLIERS[riskKey][idx];

          ctx.save();

          if (animatingBucket.current === idx && animatingBucketStartTime.current) {
            // Create a smooth single bounce effect with easing
            const elapsed = Date.now() - animatingBucketStartTime.current;
            const progress = Math.min(elapsed / 600, 1); // 0 to 1 over 600ms

            // Smooth ease-out bounce using cubic easing
            const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
            const easedProgress = easeOutCubic(progress);

            // Single smooth bounce: scales up to 1.2 then back to 1.0
            const bounceAmount = Math.sin(easedProgress * Math.PI) * 0.2;
            const scaleFactor = 1 + bounceAmount;

            // Add subtle glow effect
            const glowIntensity = Math.sin(easedProgress * Math.PI); // 0 -> 1 -> 0
            ctx.shadowColor = multiplier >= 10 ? 'rgba(139, 20, 200, 0.8)' :
                             multiplier >= 2 ? 'rgba(6, 182, 212, 0.8)' :
                             'rgba(42, 107, 200, 0.8)';
            ctx.shadowBlur = 20 * glowIntensity;

            ctx.scale(scaleFactor, scaleFactor);
            ctx.translate(
              (bucket.position.x * (1 - scaleFactor)) / scaleFactor,
              (bucket.position.y * (1 - scaleFactor)) / scaleFactor
            );
          }

          ctx.fillStyle = multiplier >= 10 ? '#FF331F' : multiplier >= 2 ? '#4392F1' : '#2A6BC8';
          const bW = 42;
          const bH = 45;
          ctx.beginPath();
          ctx.roundRect(bucket.position.x - bW / 2, bucket.position.y - bH / 2, bW, bH, 6);
          ctx.fill();

          // Add border (more prominent if animating)
          if (animatingBucket.current === idx && animatingBucketStartTime.current) {
            const elapsed = Date.now() - animatingBucketStartTime.current;
            const progress = Math.min(elapsed / 600, 1);
            const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
            const easedProgress = easeOutCubic(progress);
            const borderIntensity = Math.sin(easedProgress * Math.PI);

            ctx.strokeStyle = multiplier >= 10 ? 'rgba(200, 100, 255, 1)' :
                             multiplier >= 2 ? 'rgba(100, 220, 255, 1)' :
                             'rgba(100, 150, 255, 1)';
            ctx.lineWidth = 2 + (borderIntensity * 2); // Grows from 2px to 4px
            ctx.beginPath();
            ctx.roundRect(bucket.position.x - bW / 2, bucket.position.y - bH / 2, bW, bH, 6);
            ctx.stroke();
          }

          // Reset shadow for text
          ctx.shadowBlur = 0;
          ctx.shadowColor = 'transparent';

          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${multiplier}x`, bucket.position.x, bucket.position.y);
          ctx.restore();
        });

        // DRAW SPAWN CHUTE
        ctx.save();
        const chuteWidth = 120; // Wider chute for visibility
        const chuteHeight = 30;
        const chuteY = -10; // Position above the pegs

        // Create gradient for chute background
        const chuteGradient = ctx.createLinearGradient(
          worldCenterX - chuteWidth/2, chuteY,
          worldCenterX + chuteWidth/2, chuteY + chuteHeight
        );
        chuteGradient.addColorStop(0, 'rgba(139, 92, 246, 0.8)'); // Purple top
        chuteGradient.addColorStop(1, 'rgba(59, 130, 246, 0.6)'); // Blue bottom

        ctx.fillStyle = chuteGradient;
        ctx.fillRect(worldCenterX - chuteWidth/2, chuteY, chuteWidth, chuteHeight);

        // Add border
        ctx.strokeStyle = 'rgba(139, 92, 246, 1)';
        ctx.lineWidth = 2;
        ctx.strokeRect(worldCenterX - chuteWidth/2, chuteY, chuteWidth, chuteHeight);

        // Add glow effect
        ctx.shadowColor = 'rgba(139, 92, 246, 0.5)';
        ctx.shadowBlur = 10;
        ctx.strokeRect(worldCenterX - chuteWidth/2, chuteY, chuteWidth, chuteHeight);
        ctx.shadowBlur = 0;

        // Add "DROP ZONE" text
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('DROP ZONE', worldCenterX, chuteY + chuteHeight/2);

        ctx.restore();

        // DRAW PEGS
        ctx.fillStyle = '#FFFFFF';
        pegsRef.current.forEach((peg) => {
          const pegId = `${Math.round(peg.position.x)}_${Math.round(peg.position.y)}`;
          const isAnimating = animatingPegs.current.has(pegId);

          ctx.save();

          if (isAnimating) {
            const startTime = pegAnimationStartTimes.current.get(pegId) || Date.now();
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / 600, 1);
            const fadeOut = 1 - progress * 0.7;

            const scaleFactor = 1 + 0.3 * fadeOut;
            ctx.scale(scaleFactor, scaleFactor);
            ctx.translate(
              (peg.position.x * (1 - scaleFactor)) / scaleFactor,
              (peg.position.y * (1 - scaleFactor)) / scaleFactor
            );

            const intensity = fadeOut;
            ctx.fillStyle = `rgba(255, 255, 255, ${intensity})`;
            ctx.shadowBlur = 12 * intensity;
            ctx.shadowColor = `rgba(255, 255, 255, ${intensity})`;
          } else {
            ctx.shadowBlur = 4;
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
          }

          ctx.beginPath();
          ctx.arc(peg.position.x, peg.position.y, physics.PEG_RADIUS, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });

        // DRAW BALLS
        const balls = engine.world.bodies.filter((b) => b.label === 'ball');
        balls.forEach((ball) => {
          ctx.save();
          const gradient = ctx.createRadialGradient(
            ball.position.x - physics.BALL_RADIUS * 0.3,
            ball.position.y - physics.BALL_RADIUS * 0.3,
            0,
            ball.position.x,
            ball.position.y,
            physics.BALL_RADIUS
          );
          gradient.addColorStop(0, '#67e8f9');
          gradient.addColorStop(0.7, ball.plugin.color || '#0891b2');
          gradient.addColorStop(1, '#0e7490');

          ctx.fillStyle = gradient;
          ctx.shadowBlur = 5;
          ctx.shadowColor = 'rgba(7, 57, 69, 0.74)';
          ctx.beginPath();
          ctx.arc(ball.position.x, ball.position.y, physics.BALL_RADIUS, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });

        ctx.restore();

        // Clear removed balls
        if (ballsToRemove.current.size > 0) {
          ballsToRemove.current.forEach((b) => Matter.World.remove(engine.world, b));
          ballsToRemove.current.clear();
        }
      };

      return () => {
        clearInterval(runner);
      };
    }, [dimensions, selectedRiskLevel, physics, onScore, customMultipliers]);

    return (
      <div ref={containerRef} className="w-full h-full relative bg-transparent">
        <canvas ref={canvasRef} />
      </div>
    );
  }
);

PlinkoGameConfigurable.displayName = 'PlinkoGameConfigurable';

export default PlinkoGameConfigurable;
