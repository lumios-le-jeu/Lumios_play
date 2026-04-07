import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, ChevronRight, ChevronLeft, Plus, Trash2, Search } from 'lucide-react';
import type { CompetitionType, CompetitionFormat } from '../../lib/types';
import { PLAYER_COLORS } from '../../lib/types';
import { createCompetition, isPowerOfTwo, generateEliminationBracket, generateCupPoolMatches } from '../../lib/competition';
import TournamentBracket from './TournamentBracket';
import CupFormat from './CupFormat';

interface CompetitionFlowProps {
  onClose: () => void;
}

type Step = 1 | 2 | 3 | 4 | 'play';

export default function CompetitionFlow({ onClose }: CompetitionFlowProps) {
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState('');
  const [type, setType] = useState<CompetitionType>('friendly');
  const [format, setFormat] = useState<CompetitionFormat>('elimination');
  const [players, setPlayers] = useState<{ pseudo: string; elo?: number }[]>([]);
  const [newPseudo, setNewPseudo] = useState('');
  const [competition, setCompetition] = useState<ReturnType<typeof createCompetition> | null>(null);

  const canGoNext = () => {
    if (step === 1) return name.trim().length >= 2;
    if (step === 4) {
      if (format === 'elimination') return isPowerOfTwo(players.length) && players.length >= 4;
      return players.length >= 4;
    }
    return true;
  };

  const addPlayer = () => {
    if (!newPseudo.trim() || players.find(p => p.pseudo === newPseudo)) return;
    setPlayers(prev => [...prev, { pseudo: newPseudo.trim() }]);
    setNewPseudo('');
  };

  const removePlayer = (i: number) => setPlayers(prev => prev.filter((_, idx) => idx !== i));

  const handleStart = () => {
    const rawPlayers = players.map((p, i) => ({
      id: `p-${i}`,
      pseudo: p.pseudo,
      elo: p.elo,
    }));
    const comp = createCompetition(name, type, format, rawPlayers);
    if (format === 'elimination') {
      comp.matches = generateEliminationBracket(comp.players);
    } else {
      comp.matches = generateCupPoolMatches(comp.players);
      comp.status = 'pool';
    }
    setCompetition(comp);
    setStep('play');
  };

  const validationMsg = () => {
    if (step !== 4) return null;
    if (players.length < 4) return `Minimum 4 joueurs (${players.length}/4)`;
    if (format === 'elimination' && !isPowerOfTwo(players.length)) {
      const next = [4, 8, 16].find(n => n > players.length) ?? 16;
      return `Le tournoi nécessite 4, 8 ou 16 joueurs (actuel: ${players.length})`;
    }
    return null;
  };

  return (
    <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={step === 'play' ? undefined : onClose}>
      <motion.div
        className={step === 'play' ? 'w-full max-w-[512px] bg-card flex flex-col' : 'modal-sheet'}
        style={step === 'play' ? { height: '100dvh' } : {}}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Play View */}
        {step === 'play' && competition && (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-nunito font-black text-lg truncate">{competition.name}</h3>
              <button onClick={onClose} className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {format === 'elimination'
                ? <TournamentBracket competition={competition} onUpdate={setCompetition} />
                : <CupFormat competition={competition} onUpdate={setCompetition} />
              }
            </div>
          </div>
        )}

        {/* Setup Steps */}
        {step !== 'play' && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'hsl(var(--lumios-red)/0.12)' }}>
                  <Trophy className="w-5 h-5" style={{ color: 'hsl(var(--lumios-red))' }} />
                </div>
                <div>
                  <h3 className="font-nunito font-black text-lg">Compétition</h3>
                  <p className="text-xs text-muted-foreground">Étape {step} / 4</p>
                </div>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Progress */}
            <div className="progress-bar mb-6">
              <div className="progress-bar-fill" style={{ width: `${(Number(step) / 4) * 100}%` }} />
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>

                {/* Step 1 — Name */}
                {step === 1 && (
                  <div>
                    <h4 className="font-nunito font-black text-base mb-4">Nom de la compétition</h4>
                    <input
                      className="input-lumios text-lg font-bold"
                      placeholder="ex: Tournoi du Parc"
                      maxLength={30}
                      value={name}
                      onChange={e => setName(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground text-right mt-1">{name.length}/30</p>
                  </div>
                )}

                {/* Step 2 — Type */}
                {step === 2 && (
                  <div>
                    <h4 className="font-nunito font-black text-base mb-4">Type de compétition</h4>
                    <div className="flex flex-col gap-3">
                      {([
                        { val: 'friendly', label: 'Amicale', icon: '🎮', desc: 'Pseudo libre, pas d\'impact sur le rang' },
                        { val: 'ranked',   label: 'Classée',  icon: '⚡', desc: 'Points de rang en jeu, comptes requis' },
                      ] as const).map(opt => (
                        <button key={opt.val} onClick={() => setType(opt.val)} className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${type === opt.val ? 'border-accent bg-accent/5' : 'border-border bg-card'}`}>
                          <span className="text-3xl">{opt.icon}</span>
                          <div>
                            <p className="font-nunito font-black">{opt.label}</p>
                            <p className="text-xs text-muted-foreground">{opt.desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 3 — Format */}
                {step === 3 && (
                  <div>
                    <h4 className="font-nunito font-black text-base mb-4">Format</h4>
                    <div className="flex flex-col gap-3">
                      {([
                        { val: 'elimination', label: 'Tournoi', icon: '🏆', desc: 'Élimination directe (4, 8, 16 joueurs)' },
                        { val: 'cup',          label: 'Coupe',   icon: '🥇', desc: 'Poules + élimination (4+ joueurs)' },
                      ] as const).map(opt => (
                        <button key={opt.val} onClick={() => setFormat(opt.val)} className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${format === opt.val ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}>
                          <span className="text-3xl">{opt.icon}</span>
                          <div>
                            <p className="font-nunito font-black">{opt.label}</p>
                            <p className="text-xs text-muted-foreground">{opt.desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 4 — Players */}
                {step === 4 && (
                  <div>
                    <h4 className="font-nunito font-black text-base mb-1">Ajout des joueurs</h4>
                    <p className="text-xs text-muted-foreground mb-4">
                      {format === 'elimination' ? 'Tournoi : 4, 8 ou 16 joueurs requis' : 'Coupe : minimum 4 joueurs (groupes de 4)'}
                    </p>

                    {/* Add player input */}
                    <div className="flex gap-2 mb-4">
                      <input className="input-lumios flex-1" placeholder="Pseudo du joueur" value={newPseudo} onChange={e => setNewPseudo(e.target.value)} onKeyDown={e => e.key === 'Enter' && addPlayer()} />
                      <button onClick={addPlayer} className="w-11 h-11 gradient-lumios rounded-xl flex items-center justify-center text-white flex-shrink-0">
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Player list */}
                    <div className="flex flex-col gap-2 max-h-48 overflow-y-auto mb-3">
                      {players.map((p, i) => (
                        <div key={i} className="flex items-center gap-3 p-2.5 bg-muted rounded-xl">
                          <div className="w-6 h-6 rounded-lg flex-shrink-0" style={{ background: PLAYER_COLORS[i % PLAYER_COLORS.length] }} />
                          <span className="font-nunito font-bold text-sm flex-1">{p.pseudo}</span>
                          <button onClick={() => removePlayer(i)} className="text-muted-foreground hover:text-accent transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {validationMsg() && (
                      <p className="text-xs text-amber-500 font-semibold">{validationMsg()}</p>
                    )}
                  </div>
                )}

              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex gap-3 mt-6">
              {Number(step) > 1 && (
                <button className="btn-glass flex-1 py-3" onClick={() => setStep(s => (Number(s) - 1) as Step)}>
                  <ChevronLeft className="w-4 h-4" /> Retour
                </button>
              )}
              {Number(step) < 4 ? (
                <button className="btn-primary flex-1 py-3" onClick={() => setStep(s => (Number(s) + 1) as Step)} disabled={!canGoNext()}>
                  Suivant <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button className={`flex-1 py-3 rounded-xl font-nunito font-bold text-white transition-all ${canGoNext() ? 'btn-primary' : 'bg-muted text-muted-foreground cursor-not-allowed'}`} onClick={handleStart} disabled={!canGoNext()}>
                  🏆 Lancer la compétition
                </button>
              )}
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
