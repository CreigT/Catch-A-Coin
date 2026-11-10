export type CoinType = 'normal' | 'crested' | 'diamond';

export interface CoinConfig {
  type: CoinType;
  name: string;
  points: number;
  glowColor: string;
  baseColor: string;
  accentColor: string;
  radius: number;
}

export interface Coin {
  id: number;
  type: CoinType;
  x: number;
  y: number;
  originX: number;
  vx: number;
  vy: number;
  amplitude: number; // side-to-side drift amplitude
  frequency: number; // drift speed
  phase: number;
  rotation: number;
  rotationSpeed: number;
  wobblePhase: number;
  points: number;
  radius: number;
  caught: boolean;
  missed: boolean;
  sinkTimer: number; // fade out on bottom
  glowColor: string;
  encounteredByOctopus?: boolean;
  eaten?: boolean;
}

export interface Octopus {
  active: boolean;
  x: number;
  y: number;
  baseY: number;
  width: number;
  height: number;
  speed: number;
  direction: 1 | -1; // 1 = moving right, -1 = moving left
  eatNext: boolean; // Alternates: true = eats next encountered coin, false = lets it pass
  chompTimer: number; // For mouth chomp animation
  tentaclePhase: number;
}

export interface Bubble {
  x: number;
  y: number;
  radius: number;
  speed: number;
  wobbleSpeed: number;
  wobbleAmp: number;
  phase: number;
  opacity: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  type: 'bubble' | 'sparkle' | 'splash';
}

export interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
  alpha: number;
  vy: number;
}

export interface Chest {
  x: number;
  y: number;
  width: number;
  height: number;
  targetX: number;
  tilt: number;
  bounce: number;
}

export type GameMode = 'arcade' | 'zen';
export type GameState = 'START' | 'PLAYING' | 'GAME_OVER';

export interface GameStats {
  score: number;
  highScore: number;
  coinsCaught: number;
  normalCaught: number;
  crestedCaught: number;
  diamondCaught: number;
  maxStreak: number;
  currentStreak: number;
  misses: number;
  maxMisses: number;
}
