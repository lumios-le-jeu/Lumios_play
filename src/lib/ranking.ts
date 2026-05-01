// ─── Ranking Engine — Lumios Play ────────────────────────────────────────────
// Système de paliers par étapes (Bronze → Mythique)
// Implémente calculateRankingUpdate et calculateSeasonXp

import type { RankTier, RankInfo, MatchMode } from './types';
import { RANK_TIERS, getTierConfig, MYTHIC_TOP_N } from './types';

// ─── HELPERS ────────────────────────────────────────────────────────────────────

/** Tier order index (0=bronze … 5=mythic) */
function tierIndex(tier: RankTier): number {
  return RANK_TIERS.findIndex(t => t.tier === tier);
}

/** Encode a rank into a single global step value for comparison.
 *  Higher = better. Bronze 4 step 0 = 0, Mythique = top.
 *  Formula: tier_offset + (ranks - rank) * steps_per_rank + step
 */
export function encodeRankToGlobalStep(tier: RankTier, rankStep: number): number {
  // rankStep encodes the full position: we store it as a flat number in DB
  // But internally we need tier + rank (4→1) + step within rank
  // For simplicity, rankStep in DB = global step value directly
  return rankStep;
}

/** Convertit tier + rank (4→1) + step_in_rank en valeur globale */
export function toGlobalStep(info: RankInfo): number {
  let total = 0;
  for (const cfg of RANK_TIERS) {
    if (cfg.tier === info.tier) {
      // rangs vont de 4 à 1 (4 le plus bas)
      const rankOffset = (cfg.ranks - info.rank) * cfg.stepsPerRank;
      return total + rankOffset + info.step;
    }
    // Additionne toutes les étapes du palier précédent
    total += cfg.ranks * cfg.stepsPerRank;
  }
  return total; // mythic
}

/** Convertit une valeur globale en RankInfo */
export function fromGlobalStep(globalStep: number): RankInfo {
  let remaining = Math.max(0, globalStep);

  for (const cfg of RANK_TIERS) {
    if (cfg.tier === 'mythic') {
      return { tier: 'mythic', rank: 1, step: 0, totalSteps: 0 };
    }
    const tierTotalSteps = cfg.ranks * cfg.stepsPerRank;
    if (remaining < tierTotalSteps) {
      // Dans ce palier
      const rankFromBottom = Math.floor(remaining / cfg.stepsPerRank);
      const stepInRank = remaining % cfg.stepsPerRank;
      const rank = cfg.ranks - rankFromBottom; // 4→1
      return {
        tier: cfg.tier,
        rank,
        step: stepInRank,
        totalSteps: cfg.stepsPerRank,
      };
    }
    remaining -= tierTotalSteps;
  }

  return { tier: 'mythic', rank: 1, step: 0, totalSteps: 0 };
}

/** Total d'étapes pour atteindre Mythique depuis Bronze 4 step 0 */
export function getTotalGlobalSteps(): number {
  let total = 0;
  for (const cfg of RANK_TIERS) {
    if (cfg.tier === 'mythic') break;
    total += cfg.ranks * cfg.stepsPerRank;
  }
  return total;
}

/** Différence de rang (en nombre de "rangs globaux" : tier*4 + (5-rank))
 *  Positif si playerA est plus fort que playerB */
export function rankDifference(a: { tier: RankTier; rankStep: number }, b: { tier: RankTier; rankStep: number }): number {
  const aInfo = fromGlobalStep(a.rankStep);
  const bInfo = fromGlobalStep(b.rankStep);

  const aGlobalRank = tierIndex(aInfo.tier) * 4 + (4 - aInfo.rank + 1);
  const bGlobalRank = tierIndex(bInfo.tier) * 4 + (4 - bInfo.rank + 1);

  return aGlobalRank - bGlobalRank;
}

/** Nom d'affichage du rang */
export function getRankDisplayName(tier: RankTier, rankStep: number): string {
  if (tier === 'mythic') return 'Mythique';
  const info = fromGlobalStep(rankStep);
  const cfg = getTierConfig(info.tier);
  return `${cfg.name} ${info.rank}`;
}

/** Icône et couleur du rang */
export function getRankVisuals(tier: RankTier): { icon: string; color: string; gradient: string } {
  const cfg = getTierConfig(tier);
  return { icon: cfg.icon, color: cfg.color, gradient: cfg.bgGradient };
}

// ─── RANKING UPDATE ─────────────────────────────────────────────────────────────

export interface RankingUpdateResult {
  newRankStep: number;
  newTier: RankTier;
  stepChange: number;
  xpChange: number;
  bonuses: string[];
}

/**
 * Calcule la mise à jour de classement après un match.
 *
 * @param player - { tier, rankStep } du joueur
 * @param opponent - { tier, rankStep } de l'adversaire
 * @param won - true si le joueur a gagné
 * @param matchMode - 'competitive' ou 'friendly'
 * @param winStreak - nombre de victoires consécutives du joueur AVANT ce match
 * @param isHappyHour - x2 XP actif
 */
export function calculateRankingUpdate(
  player: { tier: RankTier; rankStep: number },
  opponent: { tier: RankTier; rankStep: number },
  won: boolean,
  matchMode: MatchMode = 'competitive',
  winStreak: number = 0,
  isHappyHour: boolean = false,
): RankingUpdateResult {
  // Amical → pas de changement de rang, XP encouragement
  if (matchMode === 'friendly') {
    const baseXp = won ? 50 : 15; // 15 XP même en cas de défaite (encouragement)
    const xp = isHappyHour ? baseXp * 2 : baseXp;
    return {
      newRankStep: player.rankStep,
      newTier: player.tier,
      stepChange: 0,
      xpChange: xp,
      bonuses: ['Amical'],
    };
  }

  const playerInfo = fromGlobalStep(player.rankStep);
  const playerCfg = getTierConfig(playerInfo.tier);
  const diff = rankDifference(player, opponent); // + si joueur est plus fort
  const bonuses: string[] = [];

  let stepChange = 0;

  if (won) {
    // ── VICTOIRE ──
    stepChange = playerCfg.winGain;

    // Tête de série : battre un joueur de palier supérieur → +1 bonus
    if (diff < 0) {
      stepChange += 1;
      bonuses.push('Tête de série (+1)');
    }

    // Super Perf : battre un adversaire 2+ rangs au-dessus (Or+)
    if (diff <= -2 && tierIndex(playerInfo.tier) >= 2) {
      stepChange = Math.max(stepChange, 2); // garantir au moins +2
      bonuses.push('Super Perf! 🚀');
    }
  } else {
    // ── DÉFAITE ──
    stepChange = playerCfg.lossGain; // 0 pour Bronze, -1 pour le reste

    // Tête de série inverse : perdre contre palier inférieur → -1 supplémentaire (sauf Bronze)
    if (diff > 0 && playerInfo.tier !== 'bronze') {
      stepChange -= 1;
      bonuses.push('Contre-performance (-1)');
    }

    // Contre-performance majeure : perdre vs 2+ rangs en dessous (Or+)
    if (diff >= 2 && tierIndex(playerInfo.tier) >= 2) {
      stepChange = Math.min(stepChange, -2);
      bonuses.push('Contre-perf majeure ⚠️');
    }
  }

  // ── Appliquer le changement ──
  let newGlobalStep = player.rankStep + stepChange;
  newGlobalStep = Math.max(0, newGlobalStep); // ne descend pas sous Bronze 4 step 0
  const maxStep = getTotalGlobalSteps();
  newGlobalStep = Math.min(newGlobalStep, maxStep); // cap à Mythique

  const newInfo = fromGlobalStep(newGlobalStep);

  // ── XP de Saison ──
  let xpChange = calculateSeasonXp(player, opponent, won, winStreak, isHappyHour);

  return {
    newRankStep: newGlobalStep,
    newTier: newInfo.tier,
    stepChange,
    xpChange,
    bonuses,
  };
}

// ─── SEASON XP ──────────────────────────────────────────────────────────────────

/**
 * Calcule les points XP de saison gagnés/perdus.
 */
export function calculateSeasonXp(
  player: { tier: RankTier; rankStep: number },
  opponent: { tier: RankTier; rankStep: number },
  won: boolean,
  winStreak: number = 0,
  isHappyHour: boolean = false,
): number {
  const diff = rankDifference(player, opponent);

  if (won) {
    let baseXp = 100;

    // Coefficient de palier
    if (diff < 0) {
      // Victoire contre plus fort
      baseXp = 150; // x1.5
    } else if (diff >= 2) {
      // Victoire contre bien plus faible (2+ paliers d'écart)
      baseXp = 50; // x0.5
    }

    // Win Streak bonus (à partir de la 3e victoire, le winStreak avant ce match est >= 2)
    if (winStreak >= 2) {
      baseXp += 20;
    }

    // Happy Hour x2
    if (isHappyHour) {
      baseXp *= 2;
    }

    return baseXp;
  } else {
    // Défaite — toujours au moins 10 XP (encouragement)
    const playerInfo = fromGlobalStep(player.rankStep);

    // Bronze et Argent : pas de malus, juste 10 XP d'encouragement
    if (tierIndex(playerInfo.tier) < 2) return 10;

    // Or+ : légère pénalité XP mais plancher à 10 XP
    let xpNet = 10; // base encouragement
    // Contre-performance majeure : perdre vs joueur de palier inférieur → moins d'encouragement
    if (diff > 0) {
      xpNet = 5;
    }

    return xpNet;
  }
}

// ─── RANK DISPLAY HELPERS ───────────────────────────────────────────────────────

/** Retourne la progression dans le rang actuel (0-100%) */
export function getRankProgress(rankStep: number): { percent: number; currentStep: number; totalSteps: number } {
  const info = fromGlobalStep(rankStep);
  if (info.tier === 'mythic') return { percent: 100, currentStep: 0, totalSteps: 0 };
  return {
    percent: info.totalSteps > 0 ? Math.round((info.step / info.totalSteps) * 100) : 0,
    currentStep: info.step,
    totalSteps: info.totalSteps,
  };
}

/** Retourne le nom du prochain rang */
export function getNextRankName(rankStep: number): string | null {
  const info = fromGlobalStep(rankStep);
  if (info.tier === 'mythic') return null;

  const cfg = getTierConfig(info.tier);
  if (info.rank > 1) {
    return `${cfg.name} ${info.rank - 1}`;
  }
  // Prochain palier
  const nextTierIdx = tierIndex(info.tier) + 1;
  if (nextTierIdx >= RANK_TIERS.length) return null;
  const nextCfg = RANK_TIERS[nextTierIdx];
  if (nextCfg.tier === 'mythic') return 'Mythique';
  return `${nextCfg.name} ${nextCfg.ranks}`;
}

/** Limite quotidienne de défis compétitifs contre le même adversaire */
export const MAX_COMPETITIVE_DUELS_PER_DAY = 3;
