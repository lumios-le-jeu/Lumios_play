// ─── Utility Functions ─────────────────────────────────────────────────────────

import type { RankTier } from './types';
import { getTierConfig } from './types';
import { fromGlobalStep } from './ranking';

/** Haversine distance in km */
export function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Format distance for display */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

/** Shuffle array (Fisher-Yates) */
export function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Check if n is a power of 2 */
export function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}

/** Next power of 2 >= n */
export function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

/** Calculate ELO change (legacy — kept for server compat) */
export function calcEloChange(
  playerElo: number,
  opponentElo: number,
  won: boolean,
  kFactor = 32
): number {
  const expected = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
  const actual = won ? 1 : 0;
  return Math.round(kFactor * (actual - expected));
}

/** Format ELO change for display */
export function formatEloChange(change: number): string {
  return change >= 0 ? `+${change}` : `${change}`;
}

/** Format step change for display */
export function formatStepChange(change: number): string {
  if (change === 0) return '0';
  return change > 0 ? `+${change} étape${change > 1 ? 's' : ''}` : `${change} étape${Math.abs(change) > 1 ? 's' : ''}`;
}

/** Format date */
export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateStr));
}

/** Format relative time */
export function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'À l\'instant';
  if (minutes < 60) return `Il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Il y a ${days}j`;
}

/** Check if age range is under 12 */
export function isUnderTwelve(ageRange: string): boolean {
  return ageRange === '6-8' || ageRange === '9-11';
}

/** Generate a random 4-digit game code */
export function generateGameCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/** Clamp value between min and max */
export function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

/** Get initials from pseudo */
export function getInitials(pseudo: string): string {
  return pseudo.slice(0, 2).toUpperCase();
}

/** Validate pseudo (max 20 chars, alphanumeric + underscores) */
export function validatePseudo(pseudo: string): string | null {
  if (pseudo.length < 3) return 'Minimum 3 caractères';
  if (pseudo.length > 20) return 'Maximum 20 caractères';
  if (!/^[a-zA-Z0-9_À-ÿ]+$/.test(pseudo)) return 'Lettres, chiffres et _ uniquement';
  return null;
}

/** Truncate text */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + '…';
}

// ─── RANK DISPLAY HELPERS ───────────────────────────────────────────────────────

/** Nom du rang (ex: "Bronze 4", "Or 2", "Mythique") */
export function getRankDisplayName(tier: RankTier, rankStep: number): string {
  if (tier === 'mythic') return 'Mythique';
  const info = fromGlobalStep(rankStep);
  const cfg = getTierConfig(info.tier);
  return `${cfg.name} ${info.rank}`;
}

/** Compare deux rangs : retourne la différence (positif = a est plus fort) */
export function compareRanks(
  a: { tier: RankTier; rankStep: number },
  b: { tier: RankTier; rankStep: number }
): number {
  return a.rankStep - b.rankStep;
}

/** Génère un PIN à 4 chiffres */
export function generatePin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/** Valide un PIN */
export function validatePin(pin: string): string | null {
  if (!/^\d{4}$/.test(pin)) return 'Le PIN doit contenir 4 chiffres';
  return null;
}
