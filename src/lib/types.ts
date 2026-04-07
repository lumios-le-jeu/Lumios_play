// ─── Core Types for Lumios Play ───────────────────────────────────────────────

// ─── CONFIG ─────────────────────────────────────────────────────────────────────
/** Top N joueurs pour le rang Mythique (modifiable) */
export const MYTHIC_TOP_N = 100;

// ─── Account Types ──────────────────────────────────────────────────────────────
export type AccountType = 'family' | 'individual';
export type AgeRange = '6-8' | '9-11' | '12-14' | '15-17' | '18+';

export interface ParentAccount {
  id: string;
  name: string;
  email: string;
  accountType: AccountType;
  pin?: string; // PIN parent local (4 chiffres), stocké côté client
}

// ─── Rank System (Paliers) ──────────────────────────────────────────────────────
export type RankTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'mythic';

export interface RankTierConfig {
  tier: RankTier;
  name: string;
  nameShort: string;
  stepsPerRank: number;  // nombre d'étapes par rang (4 niveaux: 4→1)
  ranks: number;         // nombre de rangs (toujours 4: 4,3,2,1)
  winGain: number;       // étapes gagnées sur victoire
  lossGain: number;      // étapes perdues sur défaite (négatif ou 0)
  color: string;
  icon: string;
  bgGradient: string;
}

export const RANK_TIERS: RankTierConfig[] = [
  {
    tier: 'bronze', name: 'Bronze', nameShort: 'B',
    stepsPerRank: 4, ranks: 4, winGain: 2, lossGain: 0,
    color: '#cd7f32', icon: '🥉', bgGradient: 'from-amber-700 to-amber-500',
  },
  {
    tier: 'silver', name: 'Argent', nameShort: 'A',
    stepsPerRank: 4, ranks: 4, winGain: 2, lossGain: -1,
    color: '#c0c0c0', icon: '🥈', bgGradient: 'from-slate-400 to-slate-300',
  },
  {
    tier: 'gold', name: 'Or', nameShort: 'O',
    stepsPerRank: 6, ranks: 4, winGain: 1, lossGain: -1,
    color: '#ffd700', icon: '🥇', bgGradient: 'from-yellow-500 to-amber-400',
  },
  {
    tier: 'platinum', name: 'Platine', nameShort: 'P',
    stepsPerRank: 7, ranks: 4, winGain: 1, lossGain: -1,
    color: '#00bfff', icon: '💎', bgGradient: 'from-cyan-400 to-blue-500',
  },
  {
    tier: 'diamond', name: 'Diamant', nameShort: 'D',
    stepsPerRank: 7, ranks: 4, winGain: 1, lossGain: -1,
    color: '#b9f2ff', icon: '💠', bgGradient: 'from-sky-300 to-indigo-500',
  },
  {
    tier: 'mythic', name: 'Mythique', nameShort: 'M',
    stepsPerRank: 0, ranks: 1, winGain: 0, lossGain: 0,
    color: '#ff6b6b', icon: '🔥', bgGradient: 'from-red-500 to-purple-600',
  },
];

export interface RankInfo {
  tier: RankTier;
  rank: number;    // 4→1 (4 = le plus bas du palier)
  step: number;    // étape courante dans le rang (0-based)
  totalSteps: number;
}

export function getTierConfig(tier: RankTier): RankTierConfig {
  return RANK_TIERS.find(t => t.tier === tier) ?? RANK_TIERS[0];
}

/** Rang initial pour les nouveaux joueurs */
export const DEFAULT_RANK: RankInfo = {
  tier: 'bronze',
  rank: 4,
  step: 0,
  totalSteps: 4,
};

// ─── Profiles ───────────────────────────────────────────────────────────────────

export interface ChildProfile {
  id: string;
  parentId: string;
  pseudo: string;
  avatarEmoji: string;
  ageRange: AgeRange;
  hasLumios: boolean;
  elo: number;          // gardé pour compat / tri leaderboard
  city: string;
  createdAt: string;
  // New rank fields
  rankTier: RankTier;
  rankStep: number;     // rang actuel 4→1 (encodé comme unique step globale, cf ranking.ts)
  seasonXp: number;
  winStreak: number;
  accountType: AccountType;
}

export interface GuestProfile {
  tempId: string;
  pseudo: string;
  avatarEmoji: string;
  isGuest: true;
}

// ─── Match Types ────────────────────────────────────────────────────────────────

export type MatchMode = 'competitive' | 'friendly';
export type ScoreDetail = '2-0' | '0-2' | '2-1' | '1-2';

export interface Match {
  id: string;
  player1Id: string;
  player2Id: string;
  winnerId: string | null;
  score: string;
  scoreDetail: ScoreDetail | null;
  matchMode: MatchMode;
  matchType: 'duel' | 'arena' | 'competition';
  format: 'BO3';   // Toujours 2 manches gagnantes
  player1Pseudo: string;
  player2Pseudo: string;
  createdAt: string;
  // Rank changes
  stepChangeP1: number;
  stepChangeP2: number;
  // Validation
  validatedByLoser: boolean;
  contested: boolean;
  // Comments & Media
  commentWinner: string | null;
  commentLoser: string | null;
  mediaUrl: string | null;
  // XP
  xpChangeP1: number;
  xpChangeP2: number;
}

export interface Friend {
  id: string;
  pseudo: string;
  avatarEmoji: string;
  hasLumios: boolean;
  elo: number;
  city: string;
  isOnline: boolean;
  status: 'pending' | 'accepted' | 'blocked';
  rankTier: RankTier;
  rankStep: number;
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  earned: boolean;
  earnedAt?: string;
}

export interface Arena {
  id: string;
  name: string;
  creatorId: string;
  lat: number;
  lng: number;
  level: string;
  playerCount: number;
  status: 'open' | 'playing' | 'ended';
  distance?: number;
}

// ─── Competition Types ─────────────────────────────────────────────────────────

export type CompetitionType = 'ranked' | 'friendly';
export type CompetitionFormat = 'elimination' | 'cup';

export interface CompetitionPlayer {
  id: string;
  pseudo: string;
  color: string;
  elo?: number;
  rankTier?: RankTier;
  rankStep?: number;
  wins: number;
  losses: number;
  points: number;
}

export interface CompetitionMatch {
  id: string;
  player1: CompetitionPlayer | null;
  player2: CompetitionPlayer | null;
  winner: CompetitionPlayer | null;
  round: number;
  position: number;
  group?: string;
}

export interface Competition {
  id: string;
  name: string;
  type: CompetitionType;
  format: CompetitionFormat;
  players: CompetitionPlayer[];
  matches: CompetitionMatch[];
  status: 'setup' | 'pool' | 'bracket' | 'ended';
  champion?: CompetitionPlayer;
  createdAt: string;
  location?: string;
  dateTime?: string;
}

// ─── Leaderboard Types ─────────────────────────────────────────────────────────

export type LeaderboardFilter = 'city' | 'region' | 'country' | 'world';

export interface LeaderboardEntry {
  rank: number;
  profileId: string;
  pseudo: string;
  avatarEmoji: string;
  elo: number;
  city: string;
  hasLumios: boolean;
  rankTier: RankTier;
  rankStep: number;
  seasonXp: number;
}

// ─── Socket Events ─────────────────────────────────────────────────────────────

export interface DuelSession {
  code: string;
  hostId: string;
  hostPseudo: string;
  guestId?: string;
  guestPseudo?: string;
  format: 'BO3';
  matchMode: MatchMode;
  status: 'waiting' | 'active' | 'ended';
  lat?: number;
  lng?: number;
}

export interface NearbyArena {
  name: string;
  code: string;
  dist: number;
  count: number;
  status: 'open' | 'playing';
  level: string;
}

// ─── Legacy ELO Ranks (kept for backward compat display) ─────────────────────

export interface EloRank {
  name: string;
  minElo: number;
  maxElo: number;
  color: string;
  icon: string;
}

export const ELO_RANKS: EloRank[] = [
  { name: 'Porteur de Lumios',    minElo: 0,    maxElo: 499,  color: '#94a3b8', icon: '💫' },
  { name: 'Gardien des Couleurs', minElo: 500,  maxElo: 799,  color: '#60a5fa', icon: '🔵' },
  { name: 'Éclaireur Lumineux',   minElo: 800,  maxElo: 1099, color: '#34d399', icon: '⚡' },
  { name: 'Maître des Étoiles',   minElo: 1100, maxElo: 1399, color: '#fbbf24', icon: '⭐' },
  { name: 'Champion de l\'Arc-en-Ciel', minElo: 1400, maxElo: 1699, color: '#f472b6', icon: '🌈' },
  { name: 'Légende Lumios',       minElo: 1700, maxElo: 99999, color: '#c084fc', icon: '👑' },
];

export function getRankForElo(elo: number): EloRank {
  return ELO_RANKS.find(r => elo >= r.minElo && elo <= r.maxElo) ?? ELO_RANKS[0];
}

// ─── Player Colors (16) ────────────────────────────────────────────────────────

export const PLAYER_COLORS = [
  '#3b82f6', '#22c55e', '#ef4444', '#f59e0b',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
  '#84cc16', '#14b8a6', '#6366f1', '#a855f7',
  '#e11d48', '#0ea5e9', '#10b981', '#eab308',
];
