// ─── Competition Engine ────────────────────────────────────────────────────────
import type { Competition, CompetitionPlayer, CompetitionMatch, CompetitionFormat, CompetitionType } from './types';
import { PLAYER_COLORS } from './types';
import { shuffle, isPowerOfTwo } from './utils';
export { isPowerOfTwo } from './utils';

let matchIdCounter = 0;
function newMatchId() { return `m-${++matchIdCounter}`; }

/** Assign colors to friendly players */
export function assignColors(players: Omit<CompetitionPlayer, 'color' | 'wins' | 'losses' | 'points'>[]): CompetitionPlayer[] {
  return players.map((p, i) => ({
    ...p,
    color: PLAYER_COLORS[i % PLAYER_COLORS.length],
    wins: 0,
    losses: 0,
    points: 0,
  }));
}

/** Create a new competition */
export function createCompetition(
  name: string,
  type: CompetitionType,
  format: CompetitionFormat,
  rawPlayers: Omit<CompetitionPlayer, 'color' | 'wins' | 'losses' | 'points'>[],
): Competition {
  const players = assignColors(rawPlayers);
  return {
    id: `comp-${Date.now()}`,
    name,
    type,
    format,
    players,
    matches: [],
    status: 'setup',
    createdAt: new Date().toISOString(),
  };
}

// ─── ELIMINATION TOURNAMENT ────────────────────────────────────────────────────

/** Sort players for seeding: best rankStep first, random if tied */
export function seedPlayers(
  players: CompetitionPlayer[],
  competitionType: CompetitionType = 'friendly',
  manualSeeds?: string[] // ordered list of IDs for manual seeding
): CompetitionPlayer[] {
  if (manualSeeds && manualSeeds.length > 0) {
    // Manual order: seeded first, remaining appended randomly
    const seeded = manualSeeds.map(id => players.find(p => p.id === id)).filter(Boolean) as CompetitionPlayer[];
    const rest = shuffle(players.filter(p => !manualSeeds.includes(p.id)));
    return [...seeded, ...rest];
  }
  if (competitionType === 'competitive') {
    // Best rank first (highest rankStep = best)
    return [...players].sort((a, b) => (b.rankStep ?? 0) - (a.rankStep ?? 0));
  }
  return shuffle(players);
}

/**
 * Generate a single-elimination bracket from any number of players ≥ 4.
 * Players without an opponent in round 1 get a BYE (auto-advance to round 2).
 * In competitive mode, top seeds get the bye slots.
 */
export function generateEliminationBracket(
  players: CompetitionPlayer[],
  competitionType: CompetitionType = 'friendly',
  manualSeeds?: string[]
): CompetitionMatch[] {
  const seeded = seedPlayers(players, competitionType, manualSeeds);
  const n = seeded.length;

  // Next power of 2 >= n
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(n)));
  // Number of byes needed
  const byeCount = bracketSize - n;
  // Players with a BYE are the top seeds (first byeCount players)
  // They auto-advance; others play round 1

  const matches: CompetitionMatch[] = [];

  // Build round 1: slot 0 to bracketSize/2 - 1
  // Seeded positions: top seeds get byes in pair positions
  // Strategy: place top "byeCount" seeds in bye slots, rest play
  const round1Count = bracketSize / 2; // matches in round 1 bracket slots
  let byesGiven = 0;
  let nonByeIndex = byeCount; // first player without bye

  for (let pos = 0; pos < round1Count; pos++) {
    const odd = pos * 2;     // slot A
    const even = pos * 2 + 1; // slot B

    const playerA = seeded[odd] ?? null;
    // If playerA is in bye zone (first byeCount) → they have a bye → player2 = null
    const hasBye = playerA && byesGiven < byeCount && odd < byeCount;

    if (hasBye) {
      // BYE match: playerA auto-wins
      matches.push({
        id: newMatchId(),
        player1: playerA,
        player2: null, // BYE
        winner: playerA, // auto-advance
        round: 1,
        position: pos,
        isBye: true,
      });
      byesGiven++;
    } else {
      const playerB = seeded[even] ?? null;
      matches.push({
        id: newMatchId(),
        player1: playerA,
        player2: playerB,
        winner: null,
        round: 1,
        position: pos,
      });
    }
  }

  // Generate placeholder matches for rounds 2+
  let round = 1;
  let matchesInRound = round1Count;

  while (matchesInRound > 1) {
    matchesInRound = matchesInRound / 2;
    round++;
    for (let pos = 0; pos < matchesInRound; pos++) {
      matches.push({
        id: newMatchId(),
        player1: null,
        player2: null,
        winner: null,
        round,
        position: pos,
      });
    }
  }

  // Propagate bye winners to round 2
  const byeMatches = matches.filter(m => m.isBye && m.winner);
  for (const byeMatch of byeMatches) {
    const nextRound = 2;
    const nextPos = Math.floor(byeMatch.position / 2);
    const isSlotA = byeMatch.position % 2 === 0;
    const nextMatch = matches.find(m => m.round === nextRound && m.position === nextPos);
    if (nextMatch) {
      if (isSlotA) nextMatch.player1 = byeMatch.winner!;
      else nextMatch.player2 = byeMatch.winner!;
    }
  }

  return matches;
}

/** Get round label */
export function getRoundLabel(round: number, totalRounds: number): string {
  const roundsFromFinal = totalRounds - round;
  if (roundsFromFinal === 0) return 'Finale 🏆';
  if (roundsFromFinal === 1) return 'Demi-finales';
  if (roundsFromFinal === 2) return 'Quarts de finale';
  return `Tour ${round}`;
}

/** Get total rounds for n players */
export function getTotalRounds(playerCount: number): number {
  return Math.ceil(Math.log2(playerCount));
}

/** Declare winner of a match and advance to next round */
export function declareWinner(
  matches: CompetitionMatch[],
  matchId: string,
  winner: CompetitionPlayer
): CompetitionMatch[] {
  const updated = matches.map(m => m.id === matchId ? { ...m, winner } : { ...m });

  const match = updated.find(m => m.id === matchId)!;
  const nextRound = match.round + 1;
  const nextPosition = Math.floor(match.position / 2);
  const isFirstSlot = match.position % 2 === 0;

  const nextMatch = updated.find(m => m.round === nextRound && m.position === nextPosition);
  if (nextMatch) {
    if (isFirstSlot) nextMatch.player1 = winner;
    else nextMatch.player2 = winner;
  }

  return updated;
}

// ─── CUP (POULES + ÉLIMINATION) ──────────────────────────────────────────────

/** Generate round-robin matches for a group */
export function generateGroupMatches(players: CompetitionPlayer[], group: string): CompetitionMatch[] {
  const matches: CompetitionMatch[] = [];
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      matches.push({
        id: newMatchId(),
        player1: players[i],
        player2: players[j],
        winner: null,
        round: 1,
        position: matches.length,
        group,
      });
    }
  }
  return matches;
}

/** Generate home-and-away (aller-retour) matches for a group */
export function generateGroupMatchesHomeAway(players: CompetitionPlayer[], group: string): CompetitionMatch[] {
  const matches: CompetitionMatch[] = [];
  for (let i = 0; i < players.length; i++) {
    for (let j = 0; j < players.length; j++) {
      if (i === j) continue;
      matches.push({
        id: newMatchId(),
        player1: players[i],
        player2: players[j],
        winner: null,
        round: 1,
        position: matches.length,
        group,
      });
    }
  }
  return matches;
}

/** Divide players into balanced groups
 * Équilibre les groupes : préfère des groupes de 4 mais redistribue le surplus.
 * Ex: 5 → [3,2] ou [A:3, B:2]; 6 → [3,3]; 7 → [4,3]; 9 → [3,3,3]; 10 → [4,3,3]... */
export function createGroups(players: CompetitionPlayer[]): Record<string, CompetitionPlayer[]> {
  const shuffled = shuffle(players);
  const groupNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const n = shuffled.length;

  // Calcul du nombre optimal de groupes
  let numGroups = Math.ceil(n / 4);
  if (numGroups < 1) numGroups = 1;

  // Répartition équilibrée : certains groupes auront Math.ceil(n/numGroups), d'autres Math.floor
  const baseSize = Math.floor(n / numGroups);
  const extras = n % numGroups; // les premiers 'extras' groupes auront un joueur de plus

  const groups: Record<string, CompetitionPlayer[]> = {};
  let cursor = 0;

  for (let g = 0; g < numGroups; g++) {
    const size = g < extras ? baseSize + 1 : baseSize;
    groups[groupNames[g]] = shuffled.slice(cursor, cursor + size);
    cursor += size;
  }

  return groups;
}

/** Generate all pool matches for a cup */
export function generateCupPoolMatches(players: CompetitionPlayer[], homeAway = false): CompetitionMatch[] {
  const groups = createGroups(players);
  const allMatches: CompetitionMatch[] = [];

  for (const [groupName, groupPlayers] of Object.entries(groups)) {
    allMatches.push(...(homeAway
      ? generateGroupMatchesHomeAway(groupPlayers, groupName)
      : generateGroupMatches(groupPlayers, groupName)
    ));
  }

  return allMatches;
}

/** Get standings for a group */
export function getGroupStandings(
  players: CompetitionPlayer[],
  matches: CompetitionMatch[],
  group: string
): CompetitionPlayer[] {
  const standings = players.map(p => ({ ...p, wins: 0, losses: 0, points: 0 }));

  matches
    .filter(m => m.group === group && m.winner)
    .forEach(m => {
      const winner = standings.find(p => p.id === m.winner!.id);
      const loser = standings.find(p => p.id !== m.winner!.id && (p.id === m.player1?.id || p.id === m.player2?.id));
      if (winner) { winner.wins++; winner.points += 3; }
      if (loser) { loser.losses++; }
    });

  return standings.sort((a, b) => b.points - a.points || b.wins - a.wins);
}

/** Check if all pool matches are complete */
export function arePoolMatchesComplete(matches: CompetitionMatch[]): boolean {
  const poolMatches = matches.filter(m => m.group);
  return poolMatches.length > 0 && poolMatches.every(m => m.winner !== null);
}

/** Get qualified players (top 2 per group) for bracket */
export function getQualifiedPlayers(
  players: CompetitionPlayer[],
  matches: CompetitionMatch[]
): CompetitionPlayer[] {
  const groups = createGroups(players);
  const qualified: CompetitionPlayer[] = [];

  for (const [groupName, groupPlayers] of Object.entries(groups)) {
    const standings = getGroupStandings(groupPlayers, matches, groupName);
    qualified.push(...standings.slice(0, 2));
  }

  return qualified;
}
