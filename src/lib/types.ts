// ─── Core Types for Lumios Play ───────────────────────────────────────────────

export type AgeRange = '6-8' | '9-11' | '12-14' | '15-17';

export interface ParentAccount {
  id: string;
  name: string;
  email: string;
}

export interface ChildProfile {
  id: string;
  parentId: string;
  pseudo: string;
  avatarEmoji: string;
  ageRange: AgeRange;
  hasLumios: boolean;
  elo: number;
  city: string;
  createdAt: string;
}

export interface Match {
  id: string;
  player1Id: string;
  player2Id: string;
  winnerId: string | null;
  score: string;
  eloChange: number;
  matchType: 'duel' | 'arena' | 'competition';
  format: 'BO1' | 'BO3';
  player1Pseudo: string;
  player2Pseudo: string;
  createdAt: string;
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
}

// ─── Socket Events ─────────────────────────────────────────────────────────────

export interface DuelSession {
  code: string;
  hostId: string;
  hostPseudo: string;
  guestId?: string;
  guestPseudo?: string;
  format: 'BO1' | 'BO3';
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

// ─── ELO Ranks ────────────────────────────────────────────────────────────────

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
