import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, ChevronRight, ChevronLeft, Plus, Trash2, Search, Users } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { getSocket } from '../../lib/socket';
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
  const [type, setType] = useState<CompetitionType>('ranked');
  const [format, setFormat] = useState<CompetitionFormat>('elimination');
  const [homeAway, setHomeAway] = useState(false); // #9 — option aller-retour
  const [players, setPlayers] = useState<{ pseudo: string; elo?: number }[]>([]);
  const [newPseudo, setNewPseudo] = useState('');
  const [competition, setCompetition] = useState<ReturnType<typeof createCompetition> | null>(null);
  const [compCode] = useState(() => Math.random().toString(36).substring(2, 8).toUpperCase());

  useEffect(() => {
    if (step !== 4) return;
    const socket = getSocket();
    
    socket.emit('create-comp-lobby', compCode);
    
    const handlePlayerJoined = (player: any) => {
      setPlayers(prev => {
        if (prev.find(p => p.pseudo === player.pseudo)) return prev;
        return [...prev, { pseudo: player.pseudo, elo: player.elo, avatarEmoji: player.avatarEmoji, id: player.id }];
      });
    };
    
    socket.on('comp-player-joined', handlePlayerJoined);
    
    return () => {
      socket.off('comp-player-joined', handlePlayerJoined);
    };
  }, [step, compCode]);

  const canGoNext = () => {
    if (step === 1) return name.trim().length >= 2;
    if (step === 4) {
      // #16 — minimum 4 joueurs, peu importe la puissance de 2
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
      // #16 — passer le type pour le seeding (compétitif = meilleur joueur en tête de série)
      comp.matches = generateEliminationBracket(comp.players, type as any);
    } else {
      comp.matches = generateCupPoolMatches(comp.players, homeAway);
      comp.status = 'pool';
    }
    setCompetition(comp);
    setStep('play');
  };

  const validationMsg = () => {
    if (step !== 4) return null;
    if (players.length < 4) return `Minimum 4 joueurs (${players.length}/4)`;
    // #16 — plus de restriction puissance de 2, les byes gèrent les nombres impairs
    if (format === 'elimination' && players.length < 4) return `Minimum 4 joueurs pour un tournoi`;
    if (format === 'elimination' && players.length > 0) {
      const bracketSize = Math.pow(2, Math.ceil(Math.log2(players.length)));
      const byes = bracketSize - players.length;
      if (byes > 0) return `ℹ️ ${byes} joueur(s) exempté(s) du 1er tour (tête${byes > 1 ? 's' : ''} de série)`;
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
                    {/* #9 — Option aller-retour (uniquement pour Coupe) */}
                    {format === 'cup' && (
                      <button
                        onClick={() => setHomeAway(h => !h)}
                        className={`mt-3 w-full flex items-center gap-3 p-3 rounded-2xl border-2 text-left transition-all ${
                          homeAway ? 'border-primary bg-primary/5' : 'border-border bg-card'
                        }`}
                      >
                        <span className="text-2xl">{homeAway ? '🔄' : '➡️'}</span>
                        <div className="flex-1">
                          <p className="font-nunito font-bold text-sm">Matchs aller-retour</p>
                          <p className="text-xs text-muted-foreground">
                            {homeAway ? 'Activé — chaque adversaire se rencontre 2 fois' : 'Désactivé — format aller simple'}
                          </p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${homeAway ? 'border-primary bg-primary' : 'border-border'}`}>
                          {homeAway && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                      </button>
                    )}
                  </div>
                )}

                {/* Step 4 — Players */}
                {step === 4 && (
                  <div>
                    <h4 className="font-nunito font-black text-base mb-1">Inscriptions ouvertes !</h4>
                    <p className="text-xs text-muted-foreground mb-4">
                      {format === 'elimination' ? 'Tournoi : 4, 8 ou 16 joueurs requis' : 'Coupe : minimum 4 joueurs'}
                    </p>

                    {/* QR Code */}
                    <div className="flex flex-col items-center bg-white p-4 rounded-3xl mx-auto shadow-sm mb-4 w-max border-4 border-primary/20">
                      <QRCodeSVG
                        value={JSON.stringify({ type: 'comp-join', code: compCode })}
                        size={160}
                        bgColor="#ffffff"
                        fgColor="#000000"
                        level="M"
                      />
                      <div className="mt-3 flex items-center gap-2 bg-muted px-3 py-1.5 rounded-xl">
                        <span className="font-nunito font-black text-lg tracking-widest text-primary">{compCode}</span>
                      </div>
                    </div>
                    <p className="text-xs text-center text-muted-foreground mb-4">
                      Les joueurs doivent scanner ce code depuis l'onglet Accueil → <strong>Rejoindre un tournoi</strong>
                    </p>

                    {/* Player list */}
                    <div className="flex flex-col gap-2 max-h-48 overflow-y-auto mb-3">
                      {players.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-6 px-4 bg-muted/50 rounded-2xl border border-dashed border-border text-center">
                          <Users className="w-8 h-8 text-muted-foreground mb-2 opacity-50" />
                          <p className="text-sm font-nunito font-bold text-muted-foreground">En attente d'inscrits...</p>
                        </div>
                      )}
                      <AnimatePresence>
                        {players.map((p: any, i: number) => (
                          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9 }} key={p.pseudo} className="flex items-center gap-3 p-3 bg-muted rounded-xl border border-border/50">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 shadow-sm" style={{ background: PLAYER_COLORS[i % PLAYER_COLORS.length] }}>
                              {p.avatarEmoji || '🎮'}
                            </div>
                            <span className="font-nunito font-bold text-sm flex-1">{p.pseudo}</span>
                            <button onClick={() => removePlayer(i)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-card text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </motion.div>
                        ))}
                      </AnimatePresence>
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
