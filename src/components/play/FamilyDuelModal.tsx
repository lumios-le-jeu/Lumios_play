import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Trophy, Swords, Check, ChevronRight, Loader2, User, RotateCcw } from 'lucide-react';
import type { ChildProfile, MatchMode, ScoreDetail } from '../../lib/types';
import { getTierConfig } from '../../lib/types';
import { getRankDisplayName, calculateRankingUpdate } from '../../lib/ranking';
import { getFriends } from '../../lib/api';
import { submitMatchResult, updateProfileRank } from '../../lib/api';
import { formatStepChange } from '../../lib/utils';
import { MAX_COMPETITIVE_DUELS_PER_DAY } from '../../lib/ranking';
import { getDailyDuelCount } from '../../lib/api';

interface FamilyDuelModalProps {
  profile: ChildProfile;
  onRefreshProfile?: (updates?: Partial<ChildProfile>) => Promise<void>;
  onClose: () => void;
}

type FamilyStep = 'select-opponent' | 'select-mode' | 'playing' | 'score-entry' | 'result';

export default function FamilyDuelModal({ profile, onClose, onRefreshProfile }: FamilyDuelModalProps) {
  const [step, setStep] = useState<FamilyStep>('select-opponent');
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [opponent, setOpponent] = useState<ChildProfile | null>(null);
  const [matchMode, setMatchMode] = useState<MatchMode>('competitive');
  const [selectedScore, setSelectedScore] = useState<ScoreDetail | null>(null);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [result, setResult] = useState<{
    winnerId: string;
    stepChangeP1: number;
    stepChangeP2: number;
    xpP1: number;
    xpP2: number;
    bonuses: string[];
    newTierP1: string;
    newRankStepP1: number;
    newTierP2: string;
    newRankStepP2: number;
  } | null>(null);

  // Charger les membres famille (= amis isFamily + liste profils même parent)
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const { data: friends } = await getFriends(profile.id);
      // Filtrer uniquement les membres famille (isFamily) et les membres acceptés
      const familyOnly = friends.filter(f => f.isFamily || f.status === 'accepted');
      setFamilyMembers(familyOnly);
      setIsLoading(false);
    };
    load();
  }, [profile.id]);

  const handleSelectOpponent = (member: any) => {
    // Convertir le member Friend en ChildProfile-like
    setOpponent({
      id: member.id,
      parentId: profile.parentId,
      pseudo: member.pseudo,
      avatarEmoji: member.avatarEmoji,
      ageRange: '18+',
      hasLumios: member.hasLumios,
      elo: member.elo,
      city: member.city || 'France',
      createdAt: '',
      rankTier: member.rankTier || 'bronze',
      rankStep: member.rankStep ?? 0,
      seasonXp: member.seasonXp ?? 0,
      winStreak: 0,
      accountType: 'family',
    });
    setStep('select-mode');
  };

  const handleScoreSelect = (score: ScoreDetail) => {
    setSelectedScore(score);
    // P1 = joueur actif (profile), P2 = adversaire (opponent)
    const [p1Wins] = score.split('-').map(Number);
    setWinnerId(p1Wins === 2 ? profile.id : opponent!.id);
  };

  const handleSubmit = async () => {
    if (!opponent || !selectedScore || !winnerId) return;
    setIsProcessing(true);

    // Vérifier la limite journalière
    if (matchMode === 'competitive') {
      const count = await getDailyDuelCount(profile.id, opponent.id);
      if (count >= MAX_COMPETITIVE_DUELS_PER_DAY) {
        setLimitReached(true);
        setIsProcessing(false);
        return;
      }
    }

    const p1Won = winnerId === profile.id;

    // Calculer les changements de rang
    const p1Update = calculateRankingUpdate(
      { tier: profile.rankTier, rankStep: profile.rankStep },
      { tier: opponent.rankTier, rankStep: opponent.rankStep },
      p1Won,
      matchMode,
      profile.winStreak,
    );
    const p2Update = calculateRankingUpdate(
      { tier: opponent.rankTier, rankStep: opponent.rankStep },
      { tier: profile.rankTier, rankStep: profile.rankStep },
      !p1Won,
      matchMode,
    );

    // Soumettre le match directement (pas de socket — 1 seul téléphone)
    const scoreStr = selectedScore.replace('-', ' - ');
    const { error } = await submitMatchResult({
      player1Id: profile.id,
      player2Id: opponent.id,
      winnerId,
      score: scoreStr,
      scoreDetail: selectedScore,
      matchMode,
      matchType: 'duel',
      stepChangeP1: p1Update.stepChange,
      stepChangeP2: p2Update.stepChange,
      validatedByLoser: true, // auto-validé car sur 1 seul téléphone
    });

    if (!error) {
      // Mettre à jour les rangs en DB pour les deux joueurs
      await Promise.all([
        updateProfileRank(
          profile.id,
          p1Update.newTier,
          p1Update.newRankStep,
          profile.seasonXp + p1Update.xpChange,
          p1Won ? profile.winStreak + 1 : 0,
        ),
        updateProfileRank(
          opponent.id,
          p2Update.newTier,
          p2Update.newRankStep,
          opponent.seasonXp + p2Update.xpChange,
          p1Won ? 0 : 1,
        ),
      ]);

      setResult({
        winnerId,
        stepChangeP1: p1Update.stepChange,
        stepChangeP2: p2Update.stepChange,
        xpP1: p1Update.xpChange,
        xpP2: p2Update.xpChange,
        bonuses: p1Won ? p1Update.bonuses : p2Update.bonuses,
        newTierP1: p1Update.newTier,
        newRankStepP1: p1Update.newRankStep,
        newTierP2: p2Update.newTier,
        newRankStepP2: p2Update.newRankStep,
      });
      setStep('result');
    } else {
      alert('Erreur lors de l\'enregistrement du match. Réessayez.');
    }
    setIsProcessing(false);
  };

  const handleClose = async () => {
    if (result && onRefreshProfile) {
      await onRefreshProfile({
        rankTier: result.newTierP1 as any,
        rankStep: result.newRankStepP1,
        seasonXp: profile.seasonXp + result.xpP1,
        winStreak: result.winnerId === profile.id ? profile.winStreak + 1 : 0,
      });
    }
    onClose();
  };

  const playerTier = getTierConfig(profile.rankTier);

  return (
    <motion.div
      className="modal-backdrop"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="modal-sheet max-h-[90vh] overflow-y-auto"
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'hsl(var(--lumios-green)/0.12)' }}>
              {step === 'result' ? <Trophy className="w-5 h-5 text-amber-500" /> : <Users className="w-5 h-5" style={{ color: 'hsl(var(--lumios-green))' }} />}
            </div>
            <h3 className="font-nunito font-black text-lg">
              {step === 'result' ? 'Résultats' : step === 'score-entry' ? 'Score du match' : step === 'playing' ? 'Partie en cours' : step === 'select-mode' ? 'Mode de jeu' : 'Défi Famille'}
            </h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <AnimatePresence mode="wait">

          {/* ── SÉLECTION ADVERSAIRE ── */}
          {step === 'select-opponent' && (
            <motion.div key="select" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
              <p className="text-sm text-muted-foreground mb-4">
                Choisissez votre adversaire parmi vos proches. Le score sera enregistré pour les deux joueurs.
              </p>
              {isLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
              ) : familyMembers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-3xl mb-2">👨‍👩‍👧</p>
                  <p className="font-semibold text-sm">Aucun membre famille trouvé</p>
                  <p className="text-xs mt-1 px-4">Ajoutez des membres via le profil de votre compte famille, ou ajoutez des amis.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {familyMembers.map(member => {
                    const tierCfg = getTierConfig(member.rankTier || 'bronze');
                    const rankName = getRankDisplayName(member.rankTier || 'bronze', member.rankStep ?? 0);
                    return (
                      <motion.button
                        key={member.id}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSelectOpponent(member)}
                        className="w-full flex items-center gap-3 p-3.5 card-lumios card-lumios-hover text-left"
                      >
                        <div className="w-12 h-12 gradient-lumios rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">
                          {member.avatarEmoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-nunito font-black text-sm">{member.pseudo}</span>
                            {member.isFamily && (
                              <span className="badge-lumios badge-blue text-[9px]">👨‍👩‍👧 Famille</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-xs">{tierCfg.icon}</span>
                            <span className="text-[10px] font-semibold" style={{ color: tierCfg.color }}>{rankName}</span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* ── SÉLECTION MODE ── */}
          {step === 'select-mode' && opponent && (
            <motion.div key="mode" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="flex flex-col gap-4">
              {/* Récap adversaire */}
              <div className="flex items-center gap-4 p-4 bg-muted rounded-2xl">
                <div className="flex-1 text-center">
                  <p className="text-2xl">{profile.avatarEmoji}</p>
                  <p className="font-nunito font-bold text-sm mt-1">{profile.pseudo}</p>
                  <p className="text-xs" style={{ color: playerTier.color }}>{getRankDisplayName(profile.rankTier, profile.rankStep)}</p>
                </div>
                <div className="text-xl font-black text-muted-foreground font-nunito">VS</div>
                <div className="flex-1 text-center">
                  <p className="text-2xl">{opponent.avatarEmoji}</p>
                  <p className="font-nunito font-bold text-sm mt-1">{opponent.pseudo}</p>
                  <p className="text-xs" style={{ color: getTierConfig(opponent.rankTier).color }}>{getRankDisplayName(opponent.rankTier, opponent.rankStep)}</p>
                </div>
              </div>

              {/* Mode */}
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">Mode de jeu</label>
                <div className="flex gap-3">
                  {[
                    { val: 'competitive' as MatchMode, icon: <Trophy className="w-4 h-4" />, label: 'Compétitif', desc: 'Impact sur le rang', color: 'text-amber-600' },
                    { val: 'friendly' as MatchMode, icon: <Swords className="w-4 h-4" />, label: 'Amical', desc: 'Fun uniquement', color: 'text-blue-600' },
                  ].map(m => (
                    <button
                      key={m.val}
                      onClick={() => setMatchMode(m.val)}
                      className={`flex-1 py-3 px-3 rounded-xl border-2 font-nunito font-bold text-sm transition-all text-left ${
                        matchMode === m.val ? 'border-primary bg-primary/5' : 'border-border bg-card'
                      }`}
                    >
                      <div className={`flex items-center gap-2 mb-0.5 ${m.color}`}>{m.icon}<span>{m.label}</span></div>
                      <span className="text-[10px] font-medium text-muted-foreground">{m.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                className="btn-primary w-full py-4 font-nunito font-black text-base"
                onClick={() => setStep('playing')}
              >
                🎮 Lancer la partie !
              </button>
            </motion.div>
          )}

          {/* ── PLAYING ── */}
          {step === 'playing' && opponent && (
            <motion.div key="playing" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-6 py-4">
              <motion.div
                animate={{ rotate: [0, -5, 5, -5, 5, 0] }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="text-5xl"
              >⚔️</motion.div>
              <div className="text-center">
                <h4 className="font-nunito font-black text-2xl mb-1">Match en cours !</h4>
                <p className="text-sm text-muted-foreground">Passez le téléphone et jouez 🍀</p>
              </div>

              <div className="flex items-center gap-6 p-4 bg-muted rounded-2xl w-full">
                <div className="flex-1 text-center">
                  <p className="text-2xl">{profile.avatarEmoji}</p>
                  <p className="font-nunito font-bold text-sm mt-1">{profile.pseudo}</p>
                </div>
                <div className="text-xl font-black text-primary font-nunito">VS</div>
                <div className="flex-1 text-center">
                  <p className="text-2xl">{opponent.avatarEmoji}</p>
                  <p className="font-nunito font-bold text-sm mt-1">{opponent.pseudo}</p>
                </div>
              </div>

              <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl w-full text-center">
                <p className="text-xs text-muted-foreground font-semibold">
                  📱 Passez le téléphone au prochain joueur entre chaque manche
                </p>
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                className="btn-primary w-full py-4 text-base"
                onClick={() => setStep('score-entry')}
              >
                🏁 Terminer & Indiquer le score
              </motion.button>
            </motion.div>
          )}

          {/* ── SCORE ENTRY ── */}
          {step === 'score-entry' && opponent && (
            <motion.div key="score" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-5 py-2">
              <div className="text-center mb-2">
                <h4 className="font-nunito font-black text-xl mb-1">Saisissez le score</h4>
                <p className="text-sm text-muted-foreground">{profile.pseudo} vs {opponent.pseudo} · 2 manches gagnantes</p>
              </div>

              {limitReached && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-xs font-bold text-center w-full">
                  ⚠️ Limite de {MAX_COMPETITIVE_DUELS_PER_DAY} défis compétitifs/jour atteinte contre ce joueur !
                </div>
              )}

              <div className="w-full grid grid-cols-2 gap-3">
                {(['2-0', '2-1', '1-2', '0-2'] as ScoreDetail[]).map(s => {
                  const [p1Wins] = s.split('-').map(Number);
                  const p1IsWinner = p1Wins === 2;
                  return (
                    <motion.button
                      key={s}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleScoreSelect(s)}
                      className={`p-4 rounded-2xl border-2 text-center transition-all ${
                        selectedScore === s
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-border bg-card hover:border-border/80'
                      }`}
                    >
                      <p className="font-nunito font-black text-2xl mb-1">{s}</p>
                      <p className={`text-xs font-bold ${p1IsWinner ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {p1IsWinner ? `${profile.pseudo} gagne` : `${opponent.pseudo} gagne`}
                      </p>
                    </motion.button>
                  );
                })}
              </div>

              {selectedScore && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="btn-primary w-full py-4"
                  onClick={handleSubmit}
                  disabled={isProcessing}
                >
                  {isProcessing
                    ? <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                    : <><Check className="w-5 h-5" /> Valider le score</>
                  }
                </motion.button>
              )}

              <button className="btn-glass w-full py-3 text-sm" onClick={() => setStep('playing')}>
                <RotateCcw className="w-4 h-4" /> Retour
              </button>
            </motion.div>
          )}

          {/* ── RÉSULTAT ── */}
          {step === 'result' && opponent && result && (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-5 py-4">
              <div className="text-center">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3 ${result.winnerId === profile.id ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                  {result.winnerId === profile.id
                    ? <Trophy className="w-8 h-8 text-emerald-600" />
                    : <User className="w-8 h-8 text-rose-600" />
                  }
                </div>
                <h4 className="font-nunito font-black text-2xl">
                  {result.winnerId === profile.id ? 'Victoire ! 🎉' : 'Défaite 👏'}
                </h4>
                {selectedScore && <p className="text-lg font-bold text-muted-foreground mt-1">{selectedScore}</p>}
              </div>

              {result.bonuses.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-center">
                  {result.bonuses.map((b, i) => (
                    <span key={i} className="badge-lumios badge-golden text-xs">{b}</span>
                  ))}
                </div>
              )}

              <div className="w-full bg-muted rounded-2xl p-5 space-y-4 shadow-inner border border-white/40">
                {/* Joueur actif */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{profile.avatarEmoji}</span>
                    <span className="font-nunito font-black text-sm">{profile.pseudo}</span>
                    {result.winnerId === profile.id && <Trophy className="w-3 h-3 text-emerald-500" />}
                  </div>
                  <div className="text-right">
                    {matchMode === 'competitive' && (
                      <span className={`font-black font-nunito text-sm ${result.stepChangeP1 > 0 ? 'text-emerald-500' : result.stepChangeP1 < 0 ? 'text-rose-500' : 'text-muted-foreground'}`}>
                        {formatStepChange(result.stepChangeP1)}
                      </span>
                    )}
                    <span className="text-xs text-amber-600 font-bold ml-2">+{result.xpP1} XP</span>
                  </div>
                </div>

                <div className="h-px bg-border/50" />

                {/* Adversaire */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{opponent.avatarEmoji}</span>
                    <span className="font-nunito font-black text-sm">{opponent.pseudo}</span>
                    {result.winnerId === opponent.id && <Trophy className="w-3 h-3 text-emerald-500" />}
                  </div>
                  <div className="text-right">
                    {matchMode === 'competitive' && (
                      <span className={`font-black font-nunito text-sm ${result.stepChangeP2 > 0 ? 'text-emerald-500' : result.stepChangeP2 < 0 ? 'text-rose-500' : 'text-muted-foreground'}`}>
                        {formatStepChange(result.stepChangeP2)}
                      </span>
                    )}
                    <span className="text-xs text-amber-600 font-bold ml-2">+{result.xpP2} XP</span>
                  </div>
                </div>
              </div>

              {matchMode === 'friendly' && (
                <p className="text-xs text-muted-foreground italic text-center">Match amical — pas d'impact sur le classement</p>
              )}

              <button className="btn-primary w-full py-4 font-nunito font-black" onClick={handleClose}>
                Terminer ✅
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
