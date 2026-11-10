/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Volume2, VolumeX, RotateCcw, Trophy, Sparkles, Play, RefreshCw, Heart, Home, Share2, X, Check, Copy, ExternalLink, Download } from 'lucide-react';
import { Bubble, Chest, Coin, CoinType, FloatingText, GameState, GameStats, Octopus, Particle } from './types';
import { CanvasRenderer } from './canvasRenderer';
import { sounds } from './audio';

const STORAGE_KEY_HIGH_SCORE = 'catch_a_coin_high_score';
const SOCIAL_CARD_IMAGE = '/catch_a_coin_social_card.jpg';
export const PUBLIC_SHARE_URL = 'https://ais-pre-kwgwdemzndpqns4k7u4a3o-319462365447.us-east1.run.app/';
export const AI_STUDIO_APP_URL = 'https://ai.studio/apps/1a8819f5-aa3b-4d97-998a-73e7c9927e8c';

export const getShareUrl = (): string => {
  if (typeof window === 'undefined') return PUBLIC_SHARE_URL;
  try {
    let url = window.location.href;
    // Crucial: ais-dev- is a private development container that gives errors to external users.
    // ais-pre- is the public preview URL accessible to everyone.
    if (url.includes('ais-dev-')) {
      url = url.replace('ais-dev-', 'ais-pre-');
    }
    const parsed = new URL(url);
    return `${parsed.origin}/`;
  } catch {
    return PUBLIC_SHARE_URL;
  }
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);

  // High score from localStorage
  const [highScore, setHighScore] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_HIGH_SCORE);
      return saved ? parseInt(saved, 10) || 0 : 0;
    } catch {
      return 0;
    }
  });

  // UI State
  const [gameState, setGameState] = useState<GameState>('START');
  const [score, setScore] = useState<number>(0);
  const [lives, setLives] = useState<number>(3);
  const [catchCount, setCatchCount] = useState<number>(0);
  const [coinsThisWave, setCoinsThisWave] = useState<number>(0);
  const [isOctopusActive, setIsOctopusActive] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isNewHighScore, setIsNewHighScore] = useState<boolean>(false);
  const [showSocialCard, setShowSocialCard] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Robust cross-platform clipboard copy with iframe and browser fallbacks
  const copyToClipboard = async (customText?: string) => {
    const textToCopy = customText || getShareUrl();
    let success = false;

    // 1. Try modern navigator.clipboard
    if (navigator?.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(textToCopy);
        success = true;
      } catch {
        // Fall through to fallback
      }
    }

    // 2. Fallback using temporary textarea for iframes / older webviews
    if (!success && typeof document !== 'undefined') {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '0';
        textarea.setAttribute('readonly', '');
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        textarea.setSelectionRange(0, 99999);
        success = document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch {
        // Fall through
      }
    }

    // Always give user clear visual feedback
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    return success;
  };

  // Native mobile Web Share API with fallback to copy
  const handleNativeShare = async () => {
    const shareUrl = getShareUrl();
    const shareData = {
      title: 'Catch a Coin — Sponsored by Creignificent LLC',
      text: 'Play Catch a Coin! Catch drifting coins in your pirate chest, sponsored by Creignificent LLC 🪙🐙',
      url: shareUrl,
    };

    if (navigator?.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err: unknown) {
        if ((err as Error)?.name !== 'AbortError') {
          await copyToClipboard(shareUrl);
        }
        return;
      }
    }
    // Fallback: copy link directly
    await copyToClipboard(shareUrl);
  };

  // Final summary stats
  const [stats, setStats] = useState<GameStats>({
    score: 0,
    highScore: 0,
    coinsCaught: 0,
    normalCaught: 0,
    crestedCaught: 0,
    diamondCaught: 0,
    maxStreak: 0,
    currentStreak: 0,
    misses: 0,
    maxMisses: 3,
  });

  // Game loop refs for optimal 60fps performance
  const coinsRef = useRef<Coin[]>([]);
  const bubblesRef = useRef<Bubble[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const chestRef = useRef<Chest>({
    x: 150,
    y: 500,
    width: 96,
    height: 64,
    targetX: 150,
    tilt: 0,
    bounce: 0,
  });

  // Purple Octopus entity ref
  const octopusRef = useRef<Octopus>({
    active: false,
    x: -120,
    y: 220,
    baseY: 220,
    width: 82,
    height: 74,
    speed: 46, // Slow cross-screen floating speed
    direction: 1, // 1 = left-to-right, -1 = right-to-left
    eatNext: true, // grabs every other coin it encounters (eat, pass, eat, pass...)
    chompTimer: 0,
    tentaclePhase: 0,
  });

  const nextCoinId = useRef<number>(1);
  const nextTextId = useRef<number>(1);
  const isDraggingChest = useRef<boolean>(false);
  const animFrameId = useRef<number | null>(null);
  const dimensionsRef = useRef<{ width: number; height: number }>({ width: 380, height: 640 });
  const gameStateRef = useRef<GameState>('START');
  const scoreRef = useRef<number>(0);
  const highScoreRef = useRef<number>(highScore);
  const livesRef = useRef<number>(3);
  const catchCountRef = useRef<number>(0);
  const statsRef = useRef<GameStats>(stats);
  const lastSpawnTime = useRef<number>(0);
  const lastBloopTime = useRef<number>(0);
  const lastOctopusSplashTime = useRef<number>(0);

  // Sync state to refs
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    highScoreRef.current = highScore;
  }, [highScore]);

  // Weighted coin generator
  const getRandomCoinType = (): CoinType => {
    const roll = Math.random();
    if (roll < 0.60) return 'normal';  // 60% Normal gold coin (1 pt)
    if (roll < 0.88) return 'crested'; // 28% Crested gold coin (3 pts)
    return 'diamond';                  // 12% Diamond coin (5 pts)
  };

  // Pre-seed ambient bubbles
  const initBubbles = (w: number, h: number) => {
    const bubbles: Bubble[] = [];
    const count = Math.max(14, Math.floor(w / 24));
    for (let i = 0; i < count; i++) {
      bubbles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        radius: 2 + Math.random() * 5,
        speed: 0.6 + Math.random() * 1.3,
        wobbleSpeed: 1.5 + Math.random() * 2.5,
        wobbleAmp: 3 + Math.random() * 7,
        phase: Math.random() * Math.PI * 2,
        opacity: 0.35 + Math.random() * 0.45,
      });
    }
    bubblesRef.current = bubbles;
  };

  // Trigger Purple Octopus crossing
  const triggerOctopus = useCallback(() => {
    const w = dimensionsRef.current.width;
    const h = dimensionsRef.current.height;
    const oct = octopusRef.current;

    // Alternate direction or pick side
    const dir = oct.direction;
    oct.width = Math.min(88, Math.max(74, w * 0.22));
    oct.height = oct.width * 0.9;
    oct.baseY = Math.max(120, h * 0.32 + (Math.random() - 0.5) * 40);
    oct.y = oct.baseY;

    if (dir === 1) {
      oct.x = -oct.width - 20;
    } else {
      oct.x = w + 20;
    }

    oct.eatNext = true; // First coin encountered will be eaten
    oct.chompTimer = 0;
    oct.active = true;
    setIsOctopusActive(true);

    // Alert sound / floating alert
    floatingTextsRef.current.push({
      id: nextTextId.current++,
      text: '🐙 PURPLE OCTOPUS INCOMING!',
      x: w / 2,
      y: oct.baseY - 25,
      color: '#d8b4fe',
      alpha: 1,
      vy: -0.8,
    });
  }, []);

  // Spawn automatic falling coin
  const spawnAutomaticCoin = useCallback(() => {
    const w = dimensionsRef.current.width;
    if (w <= 0) return;

    const type = getRandomCoinType();
    let points = 1;
    let radius = 17;
    let glowColor = 'rgba(250, 204, 21, 0.5)';

    if (type === 'crested') {
      points = 3;
      radius = 19;
      glowColor = 'rgba(245, 158, 11, 0.6)';
    } else if (type === 'diamond') {
      points = 5;
      radius = 20;
      glowColor = 'rgba(56, 189, 248, 0.75)';
    }

    const margin = radius + 25;
    const randomX = margin + Math.random() * (w - margin * 2);

    // Progressive speed: Each time the chest successfully catches a coin, next coin falls a little faster
    const speedMultiplier = 1 + catchCountRef.current * 0.05;
    const baseVy = 1.9 + Math.random() * 0.45;
    const finalVy = baseVy * speedMultiplier;

    const newCoin: Coin = {
      id: nextCoinId.current++,
      type,
      x: randomX,
      y: 12,
      originX: randomX,
      vx: 0,
      vy: finalVy,
      amplitude: 22 + Math.random() * 24, // Gentle side-to-side drift
      frequency: 1.8 + Math.random() * 1.2,
      phase: Math.random() * Math.PI * 2,
      rotation: Math.random() * Math.PI,
      rotationSpeed: 0.02 + Math.random() * 0.03,
      wobblePhase: Math.random() * Math.PI,
      points,
      radius,
      caught: false,
      missed: false,
      sinkTimer: 0,
      glowColor,
      encounteredByOctopus: false,
      eaten: false,
    };

    coinsRef.current.push(newCoin);
    sounds.playDrop();

    // Entry bubbles
    for (let i = 0; i < 4; i++) {
      particlesRef.current.push({
        x: randomX + (Math.random() - 0.5) * 12,
        y: 16 + Math.random() * 8,
        vx: (Math.random() - 0.5) * 1.2,
        vy: -0.4 - Math.random() * 1.0,
        size: 2 + Math.random() * 2.5,
        color: '#ffffff',
        alpha: 0.75,
        decay: 0.03,
        type: 'bubble',
      });
    }
  }, []);

  // Handle Game Over
  const handleGameOver = useCallback(() => {
    setGameState('GAME_OVER');
    gameStateRef.current = 'GAME_OVER';

    const finalScore = scoreRef.current;
    if (finalScore > highScoreRef.current) {
      setHighScore(finalScore);
      highScoreRef.current = finalScore;
      try {
        localStorage.setItem(STORAGE_KEY_HIGH_SCORE, finalScore.toString());
      } catch {
        // Safe
      }
      setIsNewHighScore(true);
      sounds.playHighScore();
    }
  }, []);

  // Start Playing or Play Again
  const startPlaying = useCallback(() => {
    setGameState('PLAYING');
    gameStateRef.current = 'PLAYING';

    setScore(0);
    scoreRef.current = 0;

    setLives(3);
    livesRef.current = 3;

    setCatchCount(0);
    catchCountRef.current = 0;
    setCoinsThisWave(0);
    setIsOctopusActive(false);
    setIsNewHighScore(false);

    octopusRef.current.active = false;
    octopusRef.current.direction = 1;
    octopusRef.current.x = -120;
    octopusRef.current.eatNext = true;

    const initialStats: GameStats = {
      score: 0,
      highScore: highScoreRef.current,
      coinsCaught: 0,
      normalCaught: 0,
      crestedCaught: 0,
      diamondCaught: 0,
      maxStreak: 0,
      currentStreak: 0,
      misses: 0,
      maxMisses: 3,
    };
    setStats(initialStats);
    statsRef.current = initialStats;

    coinsRef.current = [];
    particlesRef.current = [];
    floatingTextsRef.current = [];

    // Position chest at bottom
    const w = dimensionsRef.current.width;
    const h = dimensionsRef.current.height;
    const chestW = Math.min(108, Math.max(84, w * 0.25));
    const chestH = chestW * 0.65;
    chestRef.current = {
      x: w / 2 - chestW / 2,
      y: h - chestH - Math.min(50, h * 0.08),
      width: chestW,
      height: chestH,
      targetX: w / 2 - chestW / 2,
      tilt: 0,
      bounce: 0,
    };

    // First coin drops automatically
    lastSpawnTime.current = performance.now();
    setTimeout(() => {
      if (gameStateRef.current === 'PLAYING') {
        spawnAutomaticCoin();
      }
    }, 250);
  }, [spawnAutomaticCoin]);

  // Return to start screen
  const backToStart = () => {
    setGameState('START');
    gameStateRef.current = 'START';
    octopusRef.current.active = false;
    setIsOctopusActive(false);
    coinsRef.current = [];
  };

  // Move chest via touch or pointer
  const moveChestTo = (clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const touchX = clientX - rect.left;
    const chest = chestRef.current;
    const halfW = chest.width / 2;
    const clampedTarget = Math.max(6, Math.min(touchX - halfW, rect.width - chest.width - 6));

    const dx = Math.abs(clampedTarget - chest.x);
    if (dx > 25) {
      sounds.playChestSlide();
    }

    chest.targetX = clampedTarget;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    isDraggingChest.current = true;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // safe fallback
    }
    moveChestTo(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDraggingChest.current) {
      e.preventDefault();
      moveChestTo(e.clientX);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingChest.current = false;
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // safe fallback
    }
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameStateRef.current !== 'PLAYING') return;

      const chest = chestRef.current;
      const step = 30;
      const w = dimensionsRef.current.width;

      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        chest.targetX = Math.max(6, chest.targetX - step);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        chest.targetX = Math.min(w - chest.width - 6, chest.targetX + step);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Main Canvas Render & Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const renderer = new CanvasRenderer(ctx);
    rendererRef.current = renderer;

    const handleResize = () => {
      if (!containerRef.current || !canvas) return;
      const { clientWidth, clientHeight } = containerRef.current;
      const dpr = window.devicePixelRatio || 1;

      canvas.width = clientWidth * dpr;
      canvas.height = clientHeight * dpr;
      ctx.scale(dpr, dpr);

      dimensionsRef.current = { width: clientWidth, height: clientHeight };
      renderer.resize(clientWidth, clientHeight);

      // Scale and position chest
      const chestW = Math.min(108, Math.max(84, clientWidth * 0.25));
      const chestH = chestW * 0.65;
      chestRef.current.width = chestW;
      chestRef.current.height = chestH;
      chestRef.current.y = clientHeight - chestH - Math.min(48, clientHeight * 0.08);
      chestRef.current.targetX = Math.max(6, Math.min(chestRef.current.targetX, clientWidth - chestW - 6));
      chestRef.current.x = chestRef.current.targetX;

      initBubbles(clientWidth, clientHeight);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    }

    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const dt = Math.min(0.1, (currentTime - lastTime) / 1000);
      lastTime = currentTime;
      const timeSec = currentTime / 1000;
      const { width, height } = dimensionsRef.current;

      // 1. Render Underwater Environment
      renderer.renderBackground(timeSec);

      // 2. Render Ambient Bubbles
      for (const b of bubblesRef.current) {
        b.y -= b.speed;
        if (b.y < -15) {
          b.y = height + 10;
          b.x = Math.random() * width;
        }
      }
      renderer.renderBubbles(bubblesRef.current, timeSec);

      // 3. Render Water Surface Ripples
      renderer.renderSurfaceRipples(timeSec);

      // 4. Automatic Coin Spawner
      if (gameStateRef.current === 'PLAYING') {
        const spawnInterval = Math.max(1100, 1850 - catchCountRef.current * 25);
        if (currentTime - lastSpawnTime.current >= spawnInterval) {
          lastSpawnTime.current = currentTime;
          spawnAutomaticCoin();
        }
      }

      // 5. Update Purple Octopus
      const oct = octopusRef.current;
      if (oct.active) {
        // Float across horizontally
        oct.x += oct.direction * oct.speed * dt;
        oct.y = oct.baseY + Math.sin(timeSec * 2.2) * 14;

        if (oct.chompTimer > 0) {
          oct.chompTimer -= dt;
        }

        // Check if octopus has exited opposite screen edge
        if (
          (oct.direction === 1 && oct.x > width + 60) ||
          (oct.direction === -1 && oct.x < -oct.width - 60)
        ) {
          oct.active = false;
          setIsOctopusActive(false);
          // Reverse direction for next pass
          oct.direction = oct.direction === 1 ? -1 : 1;
        } else if (gameStateRef.current === 'PLAYING') {
          // Requirement: Repeated soft "splash splash" sounds while the purple octopus is crossing the screen
          if (currentTime - lastOctopusSplashTime.current >= 620) {
            lastOctopusSplashTime.current = currentTime;
            sounds.playOctopusSwimSplash();
          }
        }
      }

      // Requirement: Soft "bloop bloop" bubble sounds while coins are falling through the water
      if (gameStateRef.current === 'PLAYING') {
        const hasFallingCoin = coinsRef.current.some(c => !c.missed && !c.caught && !c.eaten);
        if (hasFallingCoin && currentTime - lastBloopTime.current >= 950) {
          lastBloopTime.current = currentTime;
          sounds.playBloopBloop();
        }
      }

      // 6. Update Chest Physics & Movement
      const chest = chestRef.current;
      const prevX = chest.x;
      chest.x += (chest.targetX - chest.x) * 0.28;
      const vx = chest.x - prevX;
      chest.tilt = Math.max(-0.16, Math.min(0.16, vx * 0.03));
      if (chest.bounce > 0) {
        chest.bounce = Math.max(0, chest.bounce - dt * 10);
      }

      // 7. Update Coins, Octopus Encounters & Collision Detection
      const activeCoins = coinsRef.current;
      const seabedY = height - Math.min(65, height * 0.1);

      for (let i = activeCoins.length - 1; i >= 0; i--) {
        const coin = activeCoins[i];

        if (coin.missed) {
          coin.sinkTimer += dt * 1.5;
          if (coin.sinkTimer >= 1) {
            activeCoins.splice(i, 1);
          }
          continue;
        }

        if (coin.caught) {
          activeCoins.splice(i, 1);
          continue;
        }

        // Float downward with buoyant resistance
        coin.y += coin.vy;
        coin.wobblePhase += dt * coin.frequency * 2.5;

        // Gentle sinusoidal side-to-side drift in water
        const sway = Math.sin(timeSec * coin.frequency + coin.phase) * coin.amplitude;
        coin.x = Math.max(coin.radius, Math.min(width - coin.radius, coin.originX + sway));

        // Spawn bubble trail
        if (Math.random() < 0.22) {
          particlesRef.current.push({
            x: coin.x + (Math.random() - 0.5) * 6,
            y: coin.y + coin.radius,
            vx: (Math.random() - 0.5) * 0.4,
            vy: -0.5 - Math.random() * 0.8,
            size: 1.5 + Math.random() * 2,
            color: '#e0f2fe',
            alpha: 0.6,
            decay: 0.04,
            type: 'bubble',
          });
        }

        // OCTOPUS ENCOUNTER CHECK
        // "While crossing, the octopus grabs every other coin it encounters and eats it
        // (lets one coin pass, catches the next, and so on)."
        if (oct.active && !coin.encounteredByOctopus) {
          const octCenterX = oct.x + oct.width / 2;
          const octCenterY = oct.y + oct.height / 2;
          const dx = Math.abs(coin.x - octCenterX);
          const dy = Math.abs(coin.y - octCenterY);

          // If coin intersects with octopus body/tentacles range
          if (dx < (oct.width * 0.48 + coin.radius) && dy < (oct.height * 0.48 + coin.radius)) {
            coin.encounteredByOctopus = true;

            if (oct.eatNext) {
              // GRAB AND EAT THE COIN!
              coin.eaten = true;
              coin.caught = true; // Remove from water
              oct.chompTimer = 0.45;
              sounds.playOctopusChomp();

              // Eating bubbles & purple splash
              for (let p = 0; p < 9; p++) {
                particlesRef.current.push({
                  x: coin.x + (Math.random() - 0.5) * 16,
                  y: coin.y + (Math.random() - 0.5) * 16,
                  vx: (Math.random() - 0.5) * 2,
                  vy: -0.8 - Math.random() * 1.5,
                  size: 2.5 + Math.random() * 3,
                  color: '#e9d5ff',
                  alpha: 0.95,
                  decay: 0.03,
                  type: 'bubble',
                });
              }

              // Floating notification
              floatingTextsRef.current.push({
                id: nextTextId.current++,
                text: 'CHOMP! 🐙',
                x: octCenterX,
                y: oct.y - 12,
                color: '#c084fc',
                alpha: 1,
                vy: -1.2,
              });

              // Toggle for next encounter: let it pass
              oct.eatNext = false;

              activeCoins.splice(i, 1);
              continue;
            } else {
              // LET THIS COIN PASS!
              floatingTextsRef.current.push({
                id: nextTextId.current++,
                text: 'PASSED! 💨',
                x: octCenterX,
                y: oct.y - 12,
                color: '#38bdf8',
                alpha: 0.9,
                vy: -1.0,
              });

              // Toggle for next encounter: eat next
              oct.eatNext = true;
            }
          }
        }

        // Collision Check with Chest
        const chestTopMouthY = chest.y + chest.height * 0.12;
        const chestBottomMouthY = chest.y + chest.height * 0.58;
        const chestLeft = chest.x - 4;
        const chestRight = chest.x + chest.width + 4;

        if (
          coin.y + coin.radius >= chestTopMouthY &&
          coin.y - coin.radius <= chestBottomMouthY &&
          coin.x >= chestLeft &&
          coin.x <= chestRight
        ) {
          // SUCCESSFUL CATCH!
          coin.caught = true;
          chest.bounce = Math.PI;

          // Increment successful catch count -> Next coin falls faster!
          const newCatches = catchCountRef.current + 1;
          catchCountRef.current = newCatches;
          setCatchCount(newCatches);

          const waveCount = newCatches % 15;
          setCoinsThisWave(waveCount);

          // "After the chest catches 15 coins, a purple octopus appears..."
          if (newCatches > 0 && newCatches % 15 === 0 && !oct.active) {
            triggerOctopus();
          }

          // Add points
          const pointsEarned = coin.points;
          const newScore = scoreRef.current + pointsEarned;
          scoreRef.current = newScore;
          setScore(newScore);

          // Update stats
          const st = statsRef.current;
          st.score = newScore;
          st.coinsCaught++;
          if (coin.type === 'normal') st.normalCaught++;
          if (coin.type === 'crested') st.crestedCaught++;
          if (coin.type === 'diamond') st.diamondCaught++;

          // Check High Score
          if (newScore > highScoreRef.current) {
            highScoreRef.current = newScore;
            setHighScore(newScore);
            try {
              localStorage.setItem(STORAGE_KEY_HIGH_SCORE, newScore.toString());
            } catch {
              // Safe
            }
          }

          // Requirement: A short splash sound when a coin is caught by the chest
          sounds.playShortSplash();
          sounds.playCatch(coin.type);

          // Floating score text
          let textColor = '#facc15';
          if (coin.type === 'crested') textColor = '#fbbf24';
          if (coin.type === 'diamond') textColor = '#38bdf8';

          floatingTextsRef.current.push({
            id: nextTextId.current++,
            text: `+${pointsEarned}`,
            x: chest.x + chest.width / 2,
            y: chest.y - 12,
            color: textColor,
            alpha: 1,
            vy: -1.4,
          });

          // Sparkle & Splash burst
          const particleCount = coin.type === 'diamond' ? 18 : coin.type === 'crested' ? 12 : 8;
          for (let p = 0; p < particleCount; p++) {
            const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.8;
            const speed = 1.5 + Math.random() * 3.5;
            particlesRef.current.push({
              x: chest.x + chest.width / 2 + (Math.random() - 0.5) * (chest.width * 0.6),
              y: chest.y + 10,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              size: 2.5 + Math.random() * 3.5,
              color: coin.type === 'diamond' ? '#bae6fd' : '#fef08a',
              alpha: 0.95,
              decay: 0.025,
              type: Math.random() < 0.5 ? 'sparkle' : 'bubble',
            });
          }

          activeCoins.splice(i, 1);
          continue;
        }

        // Missed coin hits the seabed
        if (coin.y >= seabedY) {
          coin.missed = true;
          coin.vy = 0;
          sounds.playMiss();

          if (gameStateRef.current === 'PLAYING') {
            const newLives = livesRef.current - 1;
            livesRef.current = newLives;
            setLives(newLives);

            statsRef.current.misses++;

            // Bubble puff at bottom
            for (let b = 0; b < 6; b++) {
              particlesRef.current.push({
                x: coin.x + (Math.random() - 0.5) * 12,
                y: seabedY,
                vx: (Math.random() - 0.5) * 1.5,
                vy: -0.8 - Math.random() * 1.5,
                size: 2 + Math.random() * 3,
                color: '#fef3c7',
                alpha: 0.8,
                decay: 0.035,
                type: 'bubble',
              });
            }

            // After 3 misses the game ends
            if (newLives <= 0) {
              handleGameOver();
            }
          }
        }
      }

      // 8. Render Coins
      for (const coin of activeCoins) {
        renderer.renderCoin(coin, timeSec);
      }

      // 9. Render Purple Octopus
      if (oct.active) {
        renderer.renderOctopus(oct, timeSec);
      }

      // 10. Render Pirate Chest
      renderer.renderChest(chest, timeSec);

      // 11. Update & Render Particles
      const particles = particlesRef.current;
      for (let p = particles.length - 1; p >= 0; p--) {
        const pt = particles[p];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.alpha -= pt.decay;
        if (pt.type === 'bubble') {
          pt.vy -= 0.03;
        }
        if (pt.alpha <= 0) {
          particles.splice(p, 1);
        }
      }
      renderer.renderParticles(particles);

      // 12. Update & Render Floating Texts
      const texts = floatingTextsRef.current;
      for (let t = texts.length - 1; t >= 0; t--) {
        const txt = texts[t];
        txt.y += txt.vy;
        txt.alpha -= dt * 1.2;
        if (txt.alpha <= 0) {
          texts.splice(t, 1);
        }
      }
      renderer.renderFloatingTexts(texts);

      animFrameId.current = requestAnimationFrame(loop);
    };

    animFrameId.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
      }
    };
  }, [handleGameOver, spawnAutomaticCoin, triggerOctopus]);

  const toggleMute = () => {
    const muted = sounds.toggleMute();
    setIsMuted(muted);
  };

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-sky-400 font-sans text-white">
      {/* Interactive Responsive Canvas */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="w-full h-full block cursor-ew-resize touch-none"
        />
      </div>

      {/* TOP HUD BAR */}
      <header className="absolute top-0 inset-x-0 z-20 pointer-events-none flex flex-col items-center pt-1.5 sm:pt-2 px-2 sm:px-3 pb-1">
        <div className="w-full max-w-md flex items-center justify-between gap-1.5 sm:gap-2 pointer-events-auto bg-slate-950/60 backdrop-blur-md px-2.5 sm:px-3.5 py-1.5 rounded-2xl border border-white/20 shadow-lg">
          {/* Brand & Lives */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="font-extrabold tracking-tight text-xs sm:text-sm text-yellow-300 drop-shadow-sm whitespace-nowrap">
              Catch a Coin
            </span>

            {/* Lives Remaining (3 lives) */}
            <div className="flex items-center gap-0.5 sm:gap-1 bg-black/40 px-1.5 sm:px-2 py-0.5 rounded-full border border-white/15">
              {[...Array(3)].map((_, i) => (
                <Heart
                  key={i}
                  className={`w-3 h-3 sm:w-3.5 sm:h-3.5 transition-colors ${
                    i < lives ? 'text-rose-500 fill-rose-500 animate-pulse' : 'text-slate-600 fill-transparent'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Current Score, Coins Caught Wave, and High Score */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Current Score */}
            <div className="flex flex-col items-end leading-none">
              <span className="text-[8px] sm:text-[9px] uppercase font-bold text-sky-200 tracking-wider">Score</span>
              <span className="text-sm sm:text-base font-black text-white tabular-nums drop-shadow-md">
                {score}
              </span>
            </div>

            {/* Coins Caught This Wave */}
            <div className="flex flex-col items-center leading-none pl-1.5 sm:pl-2 border-l border-white/20">
              <span className="text-[8px] sm:text-[9px] uppercase font-bold text-purple-200 tracking-wider flex items-center gap-0.5">
                <span>Wave</span>
              </span>
              <span className="text-[11px] sm:text-xs font-black text-purple-300 tabular-nums">
                {coinsThisWave}/15 🐙
              </span>
            </div>

            {/* High Score */}
            <div className="flex items-center gap-1 pl-1.5 sm:pl-2 border-l border-white/20">
              <Trophy className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-yellow-400 shrink-0" />
              <div className="flex flex-col items-start leading-none">
                <span className="text-[8px] sm:text-[9px] uppercase font-bold text-yellow-200/80">Best</span>
                <span className="text-[11px] sm:text-xs font-bold text-yellow-300 tabular-nums">
                  {highScore}
                </span>
              </div>
            </div>

            {/* Audio Toggle & Restart */}
            <div className="flex items-center gap-0.5 sm:gap-1 pl-1 border-l border-white/20">
              <button
                onClick={() => setShowSocialCard(true)}
                aria-label="Social Media Card"
                title="View Social Media Card"
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white/90 cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-white" />
              </button>

              <button
                onClick={toggleMute}
                aria-label={isMuted ? 'Unmute Sound' : 'Mute Sound'}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white/90 cursor-pointer"
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-red-300" /> : <Volume2 className="w-4 h-4 text-white" />}
              </button>

              <button
                onClick={startPlaying}
                aria-label="Restart Game"
                title="Restart"
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white/90 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Status Badges during active gameplay */}
        {gameState === 'PLAYING' && (
          <div className="w-full max-w-md flex items-center justify-between px-2 pt-1 pointer-events-none">
            {isOctopusActive ? (
              <div className="bg-purple-900/90 text-purple-100 border border-purple-400/50 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-md animate-pulse">
                🐙 OCTOPUS ACTIVE · EATS ALTERNATE COINS!
              </div>
            ) : (
              <div className="text-[10px] font-semibold text-sky-100 bg-slate-900/40 backdrop-blur-sm px-2.5 py-0.5 rounded-full border border-white/15">
                ⚡ Speed: {(1 + catchCount * 0.05).toFixed(1)}x
              </div>
            )}

            <div className="text-[10px] font-semibold text-yellow-200 bg-slate-900/40 backdrop-blur-sm px-2.5 py-0.5 rounded-full border border-white/15">
              🐙 Next Octopus: {15 - coinsThisWave} caught
            </div>
          </div>
        )}
      </header>

      {/* START SCREEN MODAL */}
      {gameState === 'START' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-gradient-to-b from-sky-900 via-sky-950 to-slate-950 p-5 sm:p-6 rounded-3xl border-2 border-yellow-400/40 shadow-2xl text-center flex flex-col items-center max-h-[92vh] overflow-y-auto">
            {/* Thematic Coin Icon */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-700 flex items-center justify-center shadow-lg border-2 border-yellow-200 mb-3 animate-pulse">
              <span className="text-3xl">🪙</span>
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white drop-shadow-md">
              Catch a Coin
            </h1>
            <p className="text-xs font-bold text-yellow-300 tracking-wide mt-1 mb-4 flex items-center gap-1 justify-center">
              <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
              Sponsored by Creignificent LLC
            </p>

            {/* Social Card Preview Banner */}
            <div
              onClick={() => setShowSocialCard(true)}
              className="relative w-full rounded-2xl overflow-hidden mb-3 border border-yellow-400/40 shadow-md cursor-pointer group"
              title="Click to view official social media card & metadata"
            >
              <img
                src={SOCIAL_CARD_IMAGE}
                alt="Catch a Coin social media card sponsored by Creignificent LLC"
                className="w-full h-auto object-cover group-hover:scale-102 transition-transform duration-300"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-slate-950/75 backdrop-blur-sm border border-white/20 text-[9px] font-bold text-yellow-300 flex items-center gap-1 shadow">
                <Share2 className="w-2.5 h-2.5" />
                <span>Social Card</span>
              </div>
            </div>

            {/* Gameplay Rules */}
            <div className="w-full bg-white/10 rounded-2xl p-3.5 border border-white/15 mb-4 text-left space-y-2 text-xs">
              <div className="flex items-start gap-2">
                <span className="bg-yellow-400 text-slate-950 font-bold px-1.5 py-0.2 rounded-md text-[10px]">1</span>
                <span className="text-slate-100">Coins drop <strong>automatically</strong> with gentle water drift. Touch & drag the wooden chest to catch them.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="bg-yellow-400 text-slate-950 font-bold px-1.5 py-0.2 rounded-md text-[10px]">2</span>
                <span className="text-slate-100">Each successful catch makes the next coin fall <strong>a little faster</strong>!</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="bg-rose-500 text-white font-bold px-1.5 py-0.2 rounded-md text-[10px]">3</span>
                <span className="text-slate-100">You have <strong>3 lives</strong>. Missing a coin costs 1 life.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="bg-purple-500 text-white font-bold px-1.5 py-0.2 rounded-md text-[10px]">4</span>
                <span className="text-purple-200">After <strong>15 coins</strong> are caught, a <strong>purple octopus</strong> appears! It eats every other coin it encounters while crossing.</span>
              </div>
            </div>

            {/* Coin Types Guide */}
            <div className="w-full grid grid-cols-3 gap-2 mb-5">
              <div className="bg-yellow-500/20 border border-yellow-400/30 rounded-xl p-2 flex flex-col items-center">
                <span className="text-xl">🪙</span>
                <span className="text-[11px] font-bold text-yellow-200 mt-0.5">Gold</span>
                <span className="text-[10px] font-black text-yellow-400">1 Pt</span>
              </div>
              <div className="bg-amber-500/20 border border-amber-400/30 rounded-xl p-2 flex flex-col items-center">
                <span className="text-xl">⚜️</span>
                <span className="text-[11px] font-bold text-amber-200 mt-0.5">Crested</span>
                <span className="text-[10px] font-black text-amber-400">3 Pts</span>
              </div>
              <div className="bg-cyan-500/20 border border-cyan-400/30 rounded-xl p-2 flex flex-col items-center">
                <span className="text-xl">💎</span>
                <span className="text-[11px] font-bold text-cyan-200 mt-0.5">Diamond</span>
                <span className="text-[10px] font-black text-cyan-300">5 Pts</span>
              </div>
            </div>

            {/* START PLAYING Button */}
            <button
              onClick={startPlaying}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 hover:to-yellow-400 text-slate-950 font-black text-base tracking-wide shadow-xl active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-slate-950" />
              <span>START PLAYING</span>
            </button>
          </div>
        </div>
      )}

      {/* GAME OVER SCREEN MODAL */}
      {gameState === 'GAME_OVER' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md">
          <div className="w-full max-w-sm bg-gradient-to-b from-sky-950 via-slate-900 to-slate-950 p-5 sm:p-6 rounded-3xl border-2 border-yellow-400/50 shadow-2xl text-center flex flex-col items-center max-h-[92vh] overflow-y-auto">
            {isNewHighScore ? (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider mb-2 animate-bounce">
                <Trophy className="w-4 h-4" />
                <span>NEW HIGH SCORE!</span>
              </div>
            ) : (
              <span className="text-xs font-bold text-sky-300 uppercase tracking-widest mb-1">
                Game Over
              </span>
            )}

            <h2 className="text-3xl font-black text-white tracking-tight">
              {score} Points
            </h2>

            <p className="text-xs font-bold text-yellow-300 mt-1 mb-4 flex items-center gap-1 justify-center">
              <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
              Sponsored by Creignificent LLC
            </p>

            {/* Round Summary Card */}
            <div className="w-full bg-white/10 rounded-2xl p-4 border border-white/15 mb-5 space-y-2.5 text-xs">
              <div className="flex justify-between items-center text-slate-300">
                <span>All-Time High Score</span>
                <span className="font-extrabold text-yellow-300 text-sm tabular-nums">{highScore}</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Total Coins Caught</span>
                <span className="font-bold text-white tabular-nums">{stats.coinsCaught}</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Final Falling Speed</span>
                <span className="font-bold text-amber-300 tabular-nums">{(1 + catchCount * 0.05).toFixed(1)}x</span>
              </div>

              {/* Coin breakdown badges */}
              <div className="pt-2 border-t border-white/15 grid grid-cols-3 gap-1 text-center text-[10px]">
                <div className="bg-black/30 rounded-lg p-1">
                  <div className="text-yellow-300 font-bold">🪙 {stats.normalCaught}</div>
                  <div className="text-slate-400">Normal (1 pt)</div>
                </div>
                <div className="bg-black/30 rounded-lg p-1">
                  <div className="text-amber-300 font-bold">⚜️ {stats.crestedCaught}</div>
                  <div className="text-slate-400">Crested (3 pts)</div>
                </div>
                <div className="bg-black/30 rounded-lg p-1">
                  <div className="text-cyan-300 font-bold">💎 {stats.diamondCaught}</div>
                  <div className="text-slate-400">Diamond (5 pts)</div>
                </div>
              </div>
            </div>

            {/* TWO BUTTONS ON GAME-OVER SCREEN AS REQUESTED:
                1. "Play Again" (restarts the game immediately)
                2. "Back to Start" (returns to the main start screen) */}
            <div className="w-full flex flex-col gap-2.5">
              <button
                onClick={startPlaying}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 hover:to-yellow-400 text-slate-950 font-black text-base tracking-wide shadow-xl active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-5 h-5 text-slate-950" />
                <span>Play Again</span>
              </button>

              <button
                onClick={backToStart}
                className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 active:scale-98 text-white font-bold text-xs tracking-wider border border-white/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Home className="w-4 h-4 text-sky-300" />
                <span>Back to Start</span>
              </button>

              {/* Quick Share Options on Game Over */}
              <div className="flex items-center justify-center gap-4 pt-1">
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="text-xs text-sky-300 hover:text-white transition-colors flex items-center justify-center gap-1.5 py-1 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 text-sky-400" />
                  <span>Share Game</span>
                </button>

                <span className="text-white/20">•</span>

                <button
                  type="button"
                  onClick={() => setShowSocialCard(true)}
                  className="text-xs text-yellow-300 hover:text-white transition-colors flex items-center justify-center gap-1.5 py-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                  <span>Social Card</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SOCIAL MEDIA CARD & METADATA PREVIEW MODAL */}
      {showSocialCard && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-gradient-to-b from-sky-950 to-slate-950 p-4 sm:p-5 rounded-3xl border-2 border-yellow-400/40 shadow-2xl text-left flex flex-col max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/15 mb-3">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-1.5">
                  <Share2 className="w-4 h-4 text-yellow-400" />
                  <span>Social Media Card</span>
                </h3>
                <p className="text-[11px] font-semibold text-yellow-300">
                  Sponsored by CREIGNIFICENT LLC
                </p>
              </div>

              <button
                onClick={() => setShowSocialCard(false)}
                aria-label="Close"
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* The Image Preview Card */}
            <div className="relative w-full rounded-2xl overflow-hidden border border-yellow-400/40 shadow-lg mb-3 bg-black/40">
              <img
                src={SOCIAL_CARD_IMAGE}
                alt="Catch a Coin Social Media Card with Chest, Octopus, Coin, Title and Sponsored by CREIGNIFICENT LLC"
                className="w-full h-auto object-cover"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Social Card Elements Checklist */}
            <div className="bg-white/5 rounded-2xl p-3 border border-white/10 space-y-1.5 text-xs text-slate-200 mb-4">
              <div className="text-[11px] font-bold text-sky-300 uppercase tracking-wider mb-1">
                Verified Social Card Elements
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Brown wooden pirate treasure chest</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Friendly purple octopus with animated tentacles</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Glowing floating gold & gem coins</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Bold title: <strong>"CATCH A COIN"</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Small print at bottom: <strong>"SPONSORED BY CREIGNIFICENT LLC"</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>1200 × 675 (16:9) OpenGraph / Twitter Summary Large Card</span>
              </div>
            </div>

            {/* Share Link Input with Auto-Select & Copy */}
            <div className="mb-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-sky-200 uppercase tracking-wider block">
                  Public Game Share Link
                </label>
                <span className="text-[10px] text-emerald-300 font-semibold flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-400" />
                  Public Shareable URL
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  readOnly
                  value={getShareUrl()}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  onFocus={(e) => (e.target as HTMLInputElement).select()}
                  className="flex-1 bg-black/40 border border-white/20 rounded-xl px-3 py-2 text-xs text-yellow-300 font-mono select-all focus:outline-none focus:border-yellow-400"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(getShareUrl())}
                  className="py-2 px-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 active:scale-95 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow cursor-pointer shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-slate-950" /> : <Copy className="w-3.5 h-3.5 text-slate-950" />}
                  <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                </button>
              </div>
              <p className="text-[10px] text-sky-200/80">
                Anyone with this public link can play instantly without signing in.
              </p>
              {copied && (
                <p className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 mt-1 animate-pulse">
                  <Check className="w-3.5 h-3.5" />
                  <span>Public link copied! Ready to share with friends.</span>
                </p>
              )}
            </div>

            {/* Quick Share Buttons */}
            <div className="mb-4">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                Share To
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="py-2 px-3 rounded-xl bg-sky-500 hover:bg-sky-400 active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share Sheet</span>
                </button>

                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent('Catch coins in Catch a Coin! Sponsored by Creignificent LLC 🪙🐙')}&url=${encodeURIComponent(getShareUrl())}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-white/20 transition-all cursor-pointer shadow text-center"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                  <span>Post on X</span>
                </a>

                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent('Catch coins in Catch a Coin! Sponsored by Creignificent LLC 🪙🐙 ' + getShareUrl())}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow text-center"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-300" />
                  <span>WhatsApp</span>
                </a>

                <a
                  href={getShareUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow text-center"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-yellow-300" />
                  <span>Open Public App</span>
                </a>

                <a
                  href={SOCIAL_CARD_IMAGE}
                  download="catch_a_coin_social_card.jpg"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="col-span-2 py-2 px-3 rounded-xl bg-purple-900/80 hover:bg-purple-800 active:scale-98 text-purple-100 font-bold text-xs flex items-center justify-center gap-1.5 border border-purple-400/30 transition-all cursor-pointer shadow text-center"
                >
                  <Download className="w-3.5 h-3.5 text-yellow-300" />
                  <span>Download Official Social Media Card (1200×675)</span>
                </a>
              </div>
            </div>

            {/* Ready-to-Publish Social Media Post Text */}
            <div className="mb-4 bg-black/40 border border-yellow-400/30 rounded-2xl p-3 text-left">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-yellow-300 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-yellow-400" />
                  <span>Ready-to-Share Social Post</span>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      `🪙 Play Catch a Coin! 🌊 Touch & drag the wooden pirate chest to catch drifting gold, crested, and diamond coins — but watch out for the coin-eating purple octopus! Sponsored by Creignificent LLC ✨\n\nPlay free now: ${AI_STUDIO_APP_URL}`
                    )
                  }
                  className="py-1 px-2.5 rounded-lg bg-yellow-400 hover:bg-yellow-300 active:scale-95 text-slate-950 font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-all shadow"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy Post</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-200 leading-relaxed font-sans bg-white/5 p-2.5 rounded-xl border border-white/10 select-all">
                🪙 Play Catch a Coin! 🌊 Touch &amp; drag the wooden pirate chest to catch drifting gold, crested, and diamond coins — but watch out for the coin-eating purple octopus! Sponsored by Creignificent LLC ✨
                <br /><br />
                <span className="text-yellow-300 font-mono text-[10px] break-all">{AI_STUDIO_APP_URL}</span>
              </p>
            </div>

            {/* Done Close Button */}
            <button
              type="button"
              onClick={() => setShowSocialCard(false)}
              className="w-full py-2.5 px-4 rounded-xl bg-white/15 hover:bg-white/25 active:scale-98 text-white font-bold text-xs transition-colors cursor-pointer text-center"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Floating Copied Toast Feedback */}
      {copied && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-emerald-300 border border-emerald-400/50 px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 text-xs font-bold animate-bounce pointer-events-none">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>Public share link copied to clipboard!</span>
        </div>
      )}
    </div>
  );
}
