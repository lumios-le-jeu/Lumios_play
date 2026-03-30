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

/** Generate a single-elimination bracket from a list of players */
export function generateEliminationBracket(players: CompetitionPlayer[]): CompetitionMatch[] {
  const shuffled = shuffle(players);
  const matches: CompetitionMatch[] = [];

  // Round 1 pairs
  for (let i = 0; i < shuffled.length; i += 2) {
    matches.push({
      id: newMatchId(),
      player1: shuffled[i],
      player2: shuffled[i + 1] ?? null,
      winner: null,
      round: 1,
      position: Math.floor(i / 2),
    });
  }

  // Generate placeholder matches for future rounds
  let round = 1;
  let matchesInRound = shuffled.length / 2;
  let offset = matches.length;

  while (matchesInRound > 1) {
    matchesInRound /= 2;
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
    offset += matchesInRound;
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

/** Divide players into groups of 4 */
export function createGroups(players: CompetitionPlayer[]): Record<string, CompetitionPlayer[]> {
  const shuffled = shuffle(players);
  const groups: Record<string, CompetitionPlayer[]> = {};
  const groupNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  const groupSize = 4;
  let groupIndex = 0;

  for (let i = 0; i < shuffled.length; i += groupSize) {
    const name = groupNames[groupIndex++];
    groups[name] = shuffled.slice(i, i + groupSize);
  }

  return groups;
}

/** Generate all pool matches for a cup */
export function generateCupPoolMatches(players: CompetitionPlayer[]): CompetitionMatch[] {
  const groups = createGroups(players);
  const allMatches: CompetitionMatch[] = [];

  for (const [groupName, groupPlayers] of Object.entries(groups)) {
    allMatches.push(...generateGroupMatches(groupPlayers, groupName));
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
