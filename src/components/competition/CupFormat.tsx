import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Crown, Trophy } from 'lucide-react';
import type { Competition, CompetitionMatch, CompetitionPlayer } from '../../lib/types';
import { declareWinner, getGroupStandings, arePoolMatchesComplete, generateEliminationBracket, createGroups } from '../../lib/competition';
import TournamentBracket from './TournamentBracket';

interface CupFormatProps {
  competition: Competition;
  onUpdate: (c: Competition) => void;
}

export default function CupFormat({ competition, onUpdate }: CupFormatProps) {
  const [openGroups, setOpenGroups]   = useState<Set<string>>(new Set(['A']));
  const { status, matches, players } = competition;

  const groups = createGroups(players);
  const poolComplete = arePoolMatchesComplete(matches.filter(m => m.group));

  const toggleGroup = (g: string) =>
    setOpenGroups(prev => {
      const s = new Set(prev);
      s.has(g) ? s.delete(g) : s.add(g);
      return s;
    });

  const handleDeclarePoolWinner = (match: CompetitionMatch, winner: CompetitionPlayer) => {
    if (match.winner) return;
    const updatedMatches = matches.map(m =>
      m.id === match.id ? { ...m, winner } : m
    );
    onUpdate({ ...competition, matches: updatedMatches });
  };

  const handleLaunchFinals = () => {
    const qualified: CompetitionPlayer[] = [];
    for (const [groupName, groupPlayers] of Object.entries(groups)) {
      const standings = getGroupStandings(groupPlayers, matches, groupName);
      qualified.push(...standings.slice(0, 2));
    }
    const bracketMatches = generateEliminationBracket(qualified);
    onUpdate({
      ...competition,
      matches: [...matches.filter(m => m.group), ...bracketMatches],
      status: 'bracket',
    });
  };

  // Champion check
  if (competition.champion) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-5 py-8">
        <motion.div animate={{ rotate: [-5, 5, -5], y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 2.5 }} className="text-6xl">👑</motion.div>
        <h2 className="font-nunito font-black text-2xl text-center">{competition.name}</h2>
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center animate-pulse-glow-golden" style={{ background: competition.champion.color }}>
          <Crown className="w-10 h-10 text-white" />
        </div>
        <p className="font-nunito font-black text-3xl text-glow-golden" style={{ color: 'hsl(var(--golden))' }}>{competition.champion.pseudo}</p>
      </motion.div>
    );
  }

  // ── Bracket phase ────────────────────────────────────────────────────────────
  if (status === 'bracket') {
    return (
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5" style={{ color: 'hsl(var(--lumios-red))' }} />
          <h3 className="font-nunito font-black text-base">Phase Finale</h3>
        </div>
        <TournamentBracket
          competition={{ ...competition, matches: competition.matches.filter(m => !m.group) }}
          onUpdate={c => onUpdate({ ...competition, matches: [...competition.matches.filter(m => m.group), ...c.matches], champion: c.champion, status: c.status })}
        />
      </div>
    );
  }

  // ── Pool phase ───────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className="font-nunito font-black text-base">Phase de Poules</span>
        {poolComplete && <span className="badge-lumios badge-green">Terminé ✓</span>}
      </div>

      {/* Group accordions */}
      <div className="flex flex-col gap-3 mb-5">
        {Object.entries(groups).map(([groupName, groupPlayers]) => {
          const poolMatches = matches.filter(m => m.group === groupName);
          const standings = getGroupStandings(groupPlayers, poolMatches, groupName);
          const isOpen = openGroups.has(groupName);

          return (
            <div key={groupName} className="card-lumios overflow-hidden">
              {/* Accordion header */}
              <button
                onClick={() => toggleGroup(groupName)}
                className="w-full flex items-center justify-between p-3 text-left"
              >
                <span className="font-nunito font-black">Groupe {groupName}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{groupPlayers.length} joueurs</span>
                  {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                </div>
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-3">
                      {/* Standings table */}
                      <div className="mb-3 rounded-xl overflow-hidden border border-border">
                        <div className="grid grid-cols-4 bg-muted px-3 py-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wide">
                          <span className="col-span-2">Joueur</span>
                          <span className="text-center">V / D</span>
                          <span className="text-center">Pts</span>
                        </div>
                        {standings.map((p, i) => (
                          <div key={p.id} className={`grid grid-cols-4 px-3 py-2 items-center text-sm ${i < standings.length - 1 ? 'border-b border-border' : ''} ${i < 2 ? 'bg-primary/3' : ''}`}>
                            <div className="col-span-2 flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ background: p.color }} />
                              <span className="font-semibold truncate">{p.pseudo}</span>
                              {i < 2 && <span className="text-xs" style={{ color: 'hsl(var(--primary))' }}>Q</span>}
                            </div>
                            <span className="text-center text-muted-foreground">{p.wins}/{p.losses}</span>
                            <span className="text-center font-bold font-nunito">{p.points}</span>
                          </div>
                        ))}
                      </div>

                      {/* Pool matches */}
                      <div className="flex flex-col gap-1.5">
                        {poolMatches.map(match => (
                          <PoolMatchRow key={match.id} match={match} onDeclare={handleDeclarePoolWinner} />
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Launch finals button */}
      {poolComplete && (
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="btn-primary w-full py-4"
          onClick={handleLaunchFinals}
        >
          <Trophy className="w-5 h-5" /> Lancer la phase finale
        </motion.button>
      )}
    </div>
  );
}

function PoolMatchRow({ match, onDeclare }: {
  match: CompetitionMatch;
  onDeclare: (m: CompetitionMatch, w: CompetitionPlayer) => void;
}) {
  const { player1, player2, winner } = match;
  if (!player1 || !player2) return null;

  return (
    <div className="flex items-center gap-2 bg-muted rounded-xl px-2 py-1.5">
      <button
        onClick={() => !winner && onDeclare(match, player1)}
        disabled={!!winner}
        className={`flex items-center gap-1.5 flex-1 rounded-lg px-2 py-1 text-left transition-all ${winner?.id === player1.id ? 'bg-primary/10 border border-primary/30' : winner ? 'opacity-40' : 'hover:bg-background'}`}
      >
        <div className="w-3 h-3 rounded-full" style={{ background: player1.color }} />
        <span className="text-xs font-bold truncate">{player1.pseudo}</span>
      </button>

      <span className="text-xs font-black text-muted-foreground font-nunito">VS</span>

      <button
        onClick={() => !winner && onDeclare(match, player2)}
        disabled={!!winner}
        className={`flex items-center gap-1.5 flex-1 rounded-lg px-2 py-1 text-right justify-end transition-all ${winner?.id === player2.id ? 'bg-primary/10 border border-primary/30' : winner ? 'opacity-40' : 'hover:bg-background'}`}
      >
        <span className="text-xs font-bold truncate">{player2.pseudo}</span>
        <div className="w-3 h-3 rounded-full" style={{ background: player2.color }} />
      </button>
    </div>
  );
}
