import { motion, AnimatePresence } from 'framer-motion';
import { Crown } from 'lucide-react';
import type { Competition, CompetitionMatch, CompetitionPlayer } from '../../lib/types';
import { declareWinner, getRoundLabel, getTotalRounds } from '../../lib/competition';

interface TournamentBracketProps {
  competition: Competition;
  onUpdate: (c: Competition) => void;
}

export default function TournamentBracket({ competition, onUpdate }: TournamentBracketProps) {
  const matches = competition.matches;
  const rounds = Array.from(new Set(matches.map(m => m.round))).sort((a, b) => a - b);
  const totalRounds = getTotalRounds(competition.players.length);

  const handleDeclareWinner = (match: CompetitionMatch, winner: CompetitionPlayer) => {
    // On ne peut pas déclarer un vainqueur sur un bye
    if (match.winner || match.isBye) return;
    const updated = declareWinner(competition.matches, match.id, winner);

    // Check if champion
    const finalMatch = updated.find(m => m.round === totalRounds);
    const champion = finalMatch?.winner ?? undefined;

    onUpdate({
      ...competition,
      matches: updated,
      champion,
      status: champion ? 'ended' : 'bracket',
    });
  };

  // ── Champion Banner ──────────────────────────────────────────────────────────
  if (competition.champion) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-5 py-8"
      >
        <motion.div
          animate={{ rotate: [-5, 5, -5], y: [0, -6, 0] }}
          transition={{ repeat: Infinity, duration: 2.5 }}
          className="text-6xl"
        >
          👑
        </motion.div>
        <div className="text-center">
          <p className="text-muted-foreground text-sm font-semibold mb-1">Champion de</p>
          <h2 className="font-nunito font-black text-2xl">{competition.name}</h2>
        </div>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 300 }}
          className="flex flex-col items-center gap-3"
        >
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-xl animate-pulse-glow-golden"
            style={{ background: competition.champion.color }}
          >
            <Crown className="w-10 h-10 text-white" />
          </div>
          <p className="font-nunito font-black text-3xl text-glow-golden" style={{ color: 'hsl(var(--golden))' }}>
            {competition.champion.pseudo}
          </p>
        </motion.div>
        <p className="text-muted-foreground text-sm">🎉 Félicitations !</p>
      </motion.div>
    );
  }

  return (
    <div className="scroll-x pb-4">
      <div className="flex gap-4 min-w-max">
        {rounds.map(round => {
          const roundMatches = matches.filter(m => m.round === round);
          const label = getRoundLabel(round, totalRounds);
          return (
            <div key={round} className="flex flex-col gap-3 w-44">
              {/* Round label */}
              <div className="text-center mb-1">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{label}</span>
              </div>

              {/* Matches */}
              <div className="flex flex-col" style={{ gap: `${Math.pow(2, round - 1) * 0.5 - 0.5}rem` }}>
                {roundMatches.map(match => (
                  <MatchCard key={match.id} match={match} onDeclare={handleDeclareWinner} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MatchCard({ match, onDeclare }: {
  match: CompetitionMatch;
  onDeclare: (match: CompetitionMatch, winner: CompetitionPlayer) => void;
}) {
  const isComplete = !!match.winner;

  // Match BYE #16
  if (match.isBye && match.player1) {
    return (
      <div className="card-lumios p-2 w-44 border-dashed opacity-70">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: match.player1.color }} />
          <span className="text-xs font-bold truncate flex-1">{match.player1.pseudo}</span>
        </div>
        <div className="px-2 py-1">
          <span className="text-[10px] text-emerald-500 font-bold">🎯 Exempté (bye)</span>
        </div>
      </div>
    );
  }

  return (
    <div className="card-lumios p-2 w-44">
      {[match.player1, match.player2].map((player, i) => {
        if (!player) {
          return (
            <div key={i} className="flex items-center gap-2 px-2 py-2 rounded-xl text-muted-foreground">
              <div className="w-4 h-4 rounded bg-muted" />
              <span className="text-xs">En attente…</span>
            </div>
          );
        }

        const isWinner = match.winner?.id === player.id;
        const isLoser = isComplete && !isWinner;

        return (
          <motion.button
            key={player.id}
            whileTap={!isComplete ? { scale: 0.96 } : {}}
            onClick={() => !isComplete && onDeclare(match, player)}
            className={`w-full flex items-center gap-2 px-2 py-2 rounded-xl transition-all ${
              isWinner
                ? 'bg-primary/10 border border-primary/30'
                : isLoser
                ? 'opacity-40'
                : 'hover:bg-muted cursor-pointer'
            }`}
            disabled={isComplete}
          >
            <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: player.color }} />
            <span className={`text-xs font-bold truncate flex-1 text-left ${isWinner ? 'text-glow-blue' : ''}`}>
              {player.pseudo}
            </span>
            {isWinner && <Crown className="w-3 h-3 flex-shrink-0" style={{ color: 'hsl(var(--golden))' }} />}
          </motion.button>
        );
      })}
    </div>
  );
}
