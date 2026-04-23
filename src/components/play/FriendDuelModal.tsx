import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, QrCode, Scan, Check, Loader2, Trophy, ArrowRight, ChevronRight, User, Shield, Swords, Camera, MessageSquare, AlertTriangle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { ChildProfile, MatchMode, ScoreDetail } from '../../lib/types';
import { getTierConfig } from '../../lib/types';
import { generateGameCode, formatStepChange } from '../../lib/utils';
import { getRankDisplayName, calculateRankingUpdate } from '../../lib/ranking';
import { getSocket } from '../../lib/socket';
import { getDailyDuelCount, submitMatchResult, uploadMatchMedia, updateProfileRank, addFriend, getFriends } from '../../lib/api';
import { MAX_COMPETITIVE_DUELS_PER_DAY } from '../../lib/ranking';

interface FriendDuelModalProps {
  profile: ChildProfile;
  onRefreshProfile?: () => Promise<void>;
  onClose: () => void;
}

type DuelStep = 'setup' | 'qr-host' | 'scanning' | 'joining' | 'matched' | 'playing' | 'score-entry' | 'comments' | 'result';

export default function FriendDuelModal({ profile, onClose, onRefreshProfile }: FriendDuelModalProps) {
  const [step, setStep] = useState<DuelStep>('setup');
  const [matchMode, setMatchMode] = useState<MatchMode>('competitive');
  const [gameCode, setGameCode] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [opponent, setOpponent] = useState<{ id: string; pseudo: string; elo: number; rankTier: string; rankStep: number; avatarEmoji: string } | null>(null);
  const [result, setResult] = useState<{ winnerId: string; stepChangeP1: number; stepChangeP2: number; xpP1: number; xpP2: number; bonuses: string[]; p1Id?: string; newTierP1?: string; newRankStepP1?: number; newTierP2?: string; newRankStepP2?: number; seasonXpP1New?: number; seasonXpP2New?: number; winStreakP1New?: number; winStreakP2New?: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [mismatchError, setMismatchError] = useState<string | null>(null);
  const [isFriendAlready, setIsFriendAlready] = useState<boolean | null>(null);
  const [friendAdded, setFriendAdded] = useState(false);

  // Score entry
  const [selectedScore, setSelectedScore] = useState<ScoreDetail | null>(null);
  const [winnerId, setWinnerId] = useState<string | null>(null);

  // Comments & Media
  const [commentWinner, setCommentWinner] = useState('');
  const [commentLoser, setCommentLoser] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);

  // Daily limit
  const [dailyCount, setDailyCount] = useState(0);
  const [limitReached, setLimitReached] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── SOCKET HANDLERS ───────────────────────────────────────────────────────
  useEffect(() => {
    const socket = getSocket();

    const handlePlayerJoined = (data: any) => {
      setOpponent({
        id: data.profileId,
        pseudo: data.pseudo,
        elo: data.elo,
        rankTier: data.rankTier || 'bronze',
        rankStep: data.rankStep ?? 0,
        avatarEmoji: data.avatarEmoji || '🎮',
      });
      if (step !== 'result' && step !== 'score-entry' && step !== 'comments') setStep('matched');
    };

    const handleLobbyState = (lobby: any) => {
      const entries = Object.entries(lobby.players);
      const opp = entries.find(([, p]: any) => p.profileId !== profile.id);
      if (opp) {
        const [, p]: [string, any] = opp;
        setOpponent({ id: p.profileId, pseudo: p.pseudo, elo: p.elo, rankTier: p.rankTier || 'bronze', rankStep: p.rankStep ?? 0, avatarEmoji: p.avatarEmoji || '🎮' });
        // #14 — both host and scanner transition to 'matched' when lobby-state is received
        setStep(prev => (prev !== 'result' && prev !== 'score-entry' && prev !== 'comments') ? 'matched' : prev);
      }
    };

    const handleGameStarted = () => setStep('playing');

    const handleGameFinished = (data: any) => {
      setResult(data);
      setStep('result');
      setIsProcessing(false);
      // #3 — Vérifier si l'adversaire est déjà ami
      if (data.opponentId || opponent?.id) {
        const oppId = data.opponentId || opponent?.id;
        getFriends(profile.id).then(({ data: friends }) => {
          const already = friends.some((f: any) => f.id === oppId);
          setIsFriendAlready(already);
        });
      }
    };

    const handleLobbyCreated = (code: string) => {
      setGameCode(code);
    };

    const handleMismatch = (data: any) => {
      setMismatchError(data.message);
      setHasVoted(false);
      setIsProcessing(false);
    };

    socket.on('player-joined', handlePlayerJoined);
    socket.on('lobby-state', handleLobbyState);
    socket.on('game-started', handleGameStarted);
    socket.on('game-finished', handleGameFinished);
    socket.on('lobby-created', handleLobbyCreated);
    socket.on('result-mismatch', handleMismatch);

    return () => {
      socket.off('player-joined', handlePlayerJoined);
      socket.off('lobby-state', handleLobbyState);
      socket.off('game-started', handleGameStarted);
      socket.off('game-finished', handleGameFinished);
      socket.off('lobby-created', handleLobbyCreated);
      socket.off('result-mismatch', handleMismatch);
    };
  }, [profile.id, step]);

  // ── Create lobby ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (step === 'qr-host') {
      setIsHost(true);
      const socket = getSocket();

      // #14 — Générer le code côté client immédiatement pour afficher le QR sans attendre le serveur
      const clientCode = generateGameCode();
      setGameCode(clientCode);

      const createLobby = (lat?: number, lng?: number) => {
        socket.emit('create-lobby', {
          lobbyId: clientCode,   // on propose le code au serveur
          hostProfileId: profile.id,
          hostPseudo: profile.pseudo,
          hostElo: profile.elo,
          hostRankTier: profile.rankTier,
          hostRankStep: profile.rankStep,
          hostAvatarEmoji: profile.avatarEmoji,
          mode: 'duel',
          matchMode,
          lat, lng,
          maxPlayers: 2,
          isPrivate: true,
        });
      };

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => createLobby(pos.coords.latitude, pos.coords.longitude),
          () => createLobby(),
        );
      } else {
        createLobby();
      }
    }
  }, [step, profile, matchMode]);

  // QR Scanner
  useEffect(() => {
    if (step !== 'scanning') return;
    let html5QrCode: any = null;
    const socket = getSocket();

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        const element = document.getElementById("qr-scanner-div");
        if (!element) return;
        html5QrCode = new Html5Qrcode("qr-scanner-div");

        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 15, qrbox: { width: 250, height: 250 } },
          (decodedText: string) => {
            html5QrCode.stop().then(() => {
              let code = decodedText;
              try { const d = JSON.parse(decodedText); code = d.code || ''; } catch {}
              // #14 — ignorer les codes vides (QR affiché avant que le serveur réponde)
              if (!code || code.trim().length < 2) {
                html5QrCode.start({ facingMode: 'environment' }, { fps: 15, qrbox: { width: 250, height: 250 } }, startScanner as any, () => {});
                return;
              }
              setGameCode(code);
              setStep('joining');
              socket.emit('join-lobby', {
                lobbyId: code,
                profileId: profile.id,
                pseudo: profile.pseudo,
                elo: profile.elo,
                rankTier: profile.rankTier,
                rankStep: profile.rankStep,
                avatarEmoji: profile.avatarEmoji,
              });
            }).catch(() => {});
          }
        );
      } catch (err: any) {
        if (err?.toString().includes("NotAllowedError")) {
          alert("Accès caméra refusé.");
        }
      }
    };

    const timer = setTimeout(startScanner, 400);
    return () => {
      clearTimeout(timer);
      if (html5QrCode?.isScanning) html5QrCode.stop().catch(() => {});
    };
  }, [step, profile]);

  const handleStart = () => {
    getSocket().emit('start-game', { lobbyId: gameCode });
  };

  // ── Score select → determines winner ───────────────────────────────────────
  const handleScoreSelect = async (score: ScoreDetail) => {
    setSelectedScore(score);
    const isP1Winner = score === '2-0' || score === '2-1';
    const wId = isHost ? (isP1Winner ? profile.id : opponent!.id) : (isP1Winner ? opponent!.id : profile.id);
    setWinnerId(wId);
  };

  // ── Submit result via socket (double validation) ──────────────────────────
  const handleSubmitResult = async () => {
    if (!opponent || !selectedScore || !winnerId) return;
    setIsProcessing(true);

    // Check daily limit for competitive
    if (matchMode === 'competitive') {
      const count = await getDailyDuelCount(profile.id, opponent.id);
      if (count >= MAX_COMPETITIVE_DUELS_PER_DAY) {
        setLimitReached(true);
        setIsProcessing(false);
        return;
      }
    }

    const won = winnerId === profile.id;

    // Calculate ranking changes (used by server for DB write)
    const playerResult = calculateRankingUpdate(
      { tier: profile.rankTier, rankStep: profile.rankStep },
      { tier: opponent.rankTier as any, rankStep: opponent.rankStep },
      won,
      matchMode,
      profile.winStreak,
    );

    const oppResult = calculateRankingUpdate(
      { tier: opponent.rankTier as any, rankStep: opponent.rankStep },
      { tier: profile.rankTier, rankStep: profile.rankStep },
      !won,
      matchMode,
    );

    // Upload media first if any
    let mediaUrl: string | null = null;
    if (mediaFile) {
      mediaUrl = await uploadMatchMedia(mediaFile, `${Date.now()}`);
    }

    // ✅ Envoyer le vote au serveur — pas d'écriture directe en DB
    // Le serveur valide uniquement si les deux joueurs indiquent le même vainqueur
    const scoreStr = selectedScore.replace('-', ' - ');
    getSocket().emit('submit-score', {
      lobbyId: gameCode,
      voterId: profile.id,
      winnerId,
      score: scoreStr,
      scoreDetail: selectedScore,
      matchMode,
      isHost,
      // P1 = hôte, P2 = scanner
      p1Id: isHost ? profile.id : opponent.id,
      p2Id: isHost ? opponent.id : profile.id,
      stepChangeP1: isHost ? playerResult.stepChange : oppResult.stepChange,
      stepChangeP2: isHost ? oppResult.stepChange : playerResult.stepChange,
      xpP1: isHost ? playerResult.xpChange : oppResult.xpChange,
      xpP2: isHost ? oppResult.xpChange : playerResult.xpChange,
      bonuses: playerResult.bonuses,
      newRankStepP1: isHost ? playerResult.newRankStep : oppResult.newRankStep,
      newTierP1: isHost ? playerResult.newTier : oppResult.newTier,
      newRankStepP2: isHost ? oppResult.newRankStep : playerResult.newRankStep,
      newTierP2: isHost ? oppResult.newTier : playerResult.newTier,
      seasonXpP1New: isHost ? profile.seasonXp + playerResult.xpChange : opponent.elo,
      seasonXpP2New: isHost ? opponent.elo : profile.seasonXp + playerResult.xpChange,
      winStreakP1New: isHost ? (won ? profile.winStreak + 1 : 0) : (won ? 0 : opponent.rankStep),
      commentWinner: won ? commentWinner : commentLoser,
      commentLoser: won ? commentLoser : commentWinner,
      mediaUrl: mediaUrl || null,
    });

    // Marquer comme ayant voté — UI passe en attente
    setHasVoted(true);
    setIsProcessing(false);
  };

  const handleClose = async () => {
    if (onRefreshProfile) {
      if (result) {
        const isClientP1 = profile.id === result.p1Id;
        await onRefreshProfile({
           rankTier: isClientP1 ? result.newTierP1 : result.newTierP2,
           rankStep: isClientP1 ? result.newRankStepP1 : result.newRankStepP2,
           seasonXp: isClientP1 ? result.seasonXpP1New : result.seasonXpP2New,
           winStreak: isClientP1 ? result.winStreakP1New : result.winStreakP2New,
        });
      } else {
        await onRefreshProfile();
      }
    }
    onClose();
  };

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaFile(file);
      setMediaPreview(URL.createObjectURL(file));
    }
  };

  const qrPayload = JSON.stringify({ code: gameCode, host: profile.pseudo, mode: matchMode });

  const playerRankName = getRankDisplayName(profile.rankTier, profile.rankStep);
  const opponentRankName = opponent ? getRankDisplayName(opponent.rankTier as any, opponent.rankStep) : '';

  return (
    <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="modal-sheet max-h-[90vh] overflow-y-auto" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 280 }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'hsl(var(--lumios-blue)/0.12)' }}>
              {step === 'result' ? <Trophy className="w-5 h-5 text-amber-500" /> : <QrCode className="w-5 h-5" style={{ color: 'hsl(var(--lumios-blue))' }} />}
            </div>
            <h3 className="font-nunito font-black text-lg">
              {step === 'playing' || step === 'score-entry' ? 'Partie en cours' : step === 'result' ? 'Résultats' : step === 'comments' ? 'Commentaires' : 'Défi entre Amis'}
            </h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <AnimatePresence mode="wait">

          {/* ── SETUP ── */}
          {step === 'setup' && (
            <motion.div key="setup" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
              <p className="text-muted-foreground text-sm mb-5">Affrontez un ami physiquement côte à côte. Toujours en 2 manches gagnantes.</p>

              {/* Match Mode */}
              <div className="mb-5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">Mode de jeu</label>
                <div className="flex gap-3">
                  {([
                    { val: 'competitive' as MatchMode, icon: <Trophy className="w-4 h-4" />, label: 'Compétitif', desc: 'Impact sur le rang', color: 'text-amber-600 bg-amber-50 border-amber-200' },
                    { val: 'friendly' as MatchMode, icon: <Swords className="w-4 h-4" />, label: 'Amical', desc: 'Fun uniquement', color: 'text-blue-600 bg-blue-50 border-blue-200' },
                  ]).map(m => (
                    <button
                      key={m.val}
                      onClick={() => setMatchMode(m.val)}
                      className={`flex-1 py-3 px-3 rounded-xl border-2 font-nunito font-bold text-sm transition-all text-left ${
                        matchMode === m.val ? `border-primary bg-primary/5` : 'border-border bg-card'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        {m.icon}
                        <span>{m.label}</span>
                      </div>
                      <span className="text-[10px] font-medium text-muted-foreground">{m.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button className="btn-primary w-full py-3.5" onClick={() => setStep('qr-host')}><QrCode className="w-5 h-5" /> Afficher mon QR Code</button>
                <button className="btn-glass w-full py-3.5" onClick={() => setStep('scanning')}><Scan className="w-5 h-5" /> Scanner l'adversaire</button>
              </div>
            </motion.div>
          )}

          {/* ── QR HOST ── */}
          {step === 'qr-host' && (
            <motion.div key="qr-host" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-4">
              <div className={`px-3 py-1 rounded-lg text-xs font-bold ${matchMode === 'competitive' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                {matchMode === 'competitive' ? '🏆 Compétitif' : '⚔️ Amical'}
              </div>
              {/* #14 — Ne pas afficher le QR tant que le code est vide */}
              {gameCode ? (
                <div className="p-5 bg-white rounded-3xl shadow-card-hover border border-border animate-pulse-glow">
                  <QRCodeSVG value={qrPayload} size={200} fgColor="hsl(217, 85%, 30%)" level="M" />
                </div>
              ) : (
                <div className="w-[210px] h-[210px] flex items-center justify-center rounded-3xl border-2 border-dashed border-border bg-muted">
                  <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
                </div>
              )}
              <div className="text-center">
                <p className="text-3xl font-black font-nunito tracking-widest text-primary">{gameCode || '...'}</p>
                <p className="text-xs text-muted-foreground">En attente de l'adversaire…</p>
              </div>
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </motion.div>
          )}


          {/* ── SCANNING ── */}
          {step === 'scanning' && (
            <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div id="qr-scanner-div" className="w-full rounded-2xl overflow-hidden min-h-[240px] bg-muted flex items-center justify-center relative border-2 border-dashed border-border mb-4">
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
                   <Scan className="w-10 h-10 text-muted-foreground animate-pulse mb-2" />
                   <p className="text-[10px] uppercase font-bold text-muted-foreground">Initialisation caméra...</p>
                </div>
              </div>
              {!showManual ? (
                <button onClick={() => setShowManual(true)} className="w-full py-3 text-xs font-bold text-muted-foreground hover:text-primary transition-colors">
                  Problème de caméra ? Saisie manuelle
                </button>
              ) : (
                <div className="flex gap-2">
                  <input type="text" placeholder="Code à 4 chiffres" value={manualCode} onChange={(e) => setManualCode(e.target.value.toUpperCase())} className="flex-1 bg-muted border-2 border-border rounded-xl px-4 py-3 font-nunito font-bold text-center" maxLength={4} />
                  <button onClick={() => {
                    const code = manualCode.trim();
                    if (code.length >= 2) {
                      setGameCode(code);
                      setStep('joining');
                      getSocket().emit('join-lobby', { lobbyId: code, profileId: profile.id, pseudo: profile.pseudo, elo: profile.elo, rankTier: profile.rankTier, rankStep: profile.rankStep, avatarEmoji: profile.avatarEmoji });
                    }
                  }} className="btn-primary px-6">Valider</button>
                </div>
              )}
            </motion.div>
          )}

          {/* ── JOINING (transition state after scan) — #14 ── */}
          {step === 'joining' && (
            <motion.div key="joining" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-5 py-6">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <div className="text-center">
                <p className="font-nunito font-black text-lg">Connexion en cours…</p>
                <p className="text-sm text-muted-foreground mt-1">En attente de l'hôte</p>
              </div>
              <p className="text-xs text-muted-foreground font-mono bg-muted px-3 py-1.5 rounded-lg">{gameCode}</p>
            </motion.div>
          )}
          {step === 'matched' && opponent && (
            <motion.div key="matched" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-5 py-2">
              <div className={`px-3 py-1 rounded-lg text-xs font-bold ${matchMode === 'competitive' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                {matchMode === 'competitive' ? '🏆 Compétitif' : '⚔️ Amical'}
              </div>
              <div className="flex items-center gap-6 p-4 bg-muted rounded-2xl w-full">
                <div className="flex-1 text-center">
                  <p className="text-2xl">{profile.avatarEmoji}</p>
                  <p className="font-nunito font-bold text-sm mt-1">{profile.pseudo}</p>
                  <p className="text-xs text-muted-foreground" style={{ color: getTierConfig(profile.rankTier).color }}>{playerRankName}</p>
                </div>
                <div className="text-xl font-black text-muted-foreground font-nunito">VS</div>
                <div className="flex-1 text-center">
                  <p className="text-2xl">{opponent.avatarEmoji || '🐉'}</p>
                  <p className="font-nunito font-bold text-sm mt-1">{opponent.pseudo}</p>
                  <p className="text-xs text-muted-foreground" style={{ color: getTierConfig(opponent.rankTier as any).color }}>{opponentRankName}</p>
                </div>
              </div>
              {isHost ? (
                <button className="btn-primary w-full py-4 text-lg" onClick={handleStart}>🎮 Lancer la partie !</button>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <p className="text-sm font-bold text-primary">En attente du lancement…</p>
                </div>
              )}
            </motion.div>
          )}

          {/* ── PLAYING — Match en cours ── */}
          {step === 'playing' && opponent && (
            <motion.div key="playing" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-6 py-4">
              <motion.div
                animate={{ rotate: [0, -5, 5, -5, 5, 0] }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="text-5xl"
              >⚔️</motion.div>
              <div className="text-center">
                <h4 className="font-nunito font-black text-2xl mb-1">Match en cours !</h4>
                <p className="text-sm text-muted-foreground">Bonne chance à tous les deux 🍀</p>
              </div>
              <div className="flex items-center gap-6 p-4 bg-muted rounded-2xl w-full">
                <div className="flex-1 text-center">
                  <p className="text-2xl">{profile.avatarEmoji}</p>
                  <p className="font-nunito font-bold text-sm mt-1">{profile.pseudo}</p>
                </div>
                <div className="text-xl font-black text-primary font-nunito">VS</div>
                <div className="flex-1 text-center">
                  <p className="text-2xl">{opponent.avatarEmoji || '🐉'}</p>
                  <p className="font-nunito font-bold text-sm mt-1">{opponent.pseudo}</p>
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.97 }}
                className="btn-primary w-full py-4 text-base"
                onClick={() => setStep('score-entry')}
              >
                🏁 Terminer le match &amp; Indiquer le score
              </motion.button>
            </motion.div>
          )}

          {/* ── SCORE ENTRY ── */}
          {step === 'score-entry' && opponent && (
            <motion.div key="score-entry" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-5 py-2">
              <div className="text-center mb-2">
                <h4 className="font-nunito font-black text-xl mb-1">Saisissez le score</h4>
                <p className="text-sm text-muted-foreground">{profile.pseudo} vs {opponent.pseudo} · 2 manches gagnantes</p>
              </div>

              {limitReached && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-xs font-bold text-center w-full">
                  ⚠️ Limite de {MAX_COMPETITIVE_DUELS_PER_DAY} défis compétitifs/jour atteinte contre ce joueur !
                </div>
              )}

              {mismatchError && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-xs font-bold text-center w-full">
                  ⚠️ {mismatchError}
                </div>
              )}

              {/* Score buttons */}
              <div className="w-full grid grid-cols-2 gap-3">
                {(['2-0', '2-1', '1-2', '0-2'] as ScoreDetail[]).map(s => {
                  const parts = s.split('-');
                  const p1Wins = parseInt(parts[0]);
                  const isMeWinner = isHost ? p1Wins === 2 : p1Wins < 2;
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
                      <p className={`text-xs font-bold ${isMeWinner ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {isMeWinner ? `${profile.pseudo} gagne` : `${opponent.pseudo} gagne`}
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
                  onClick={() => setStep('comments')}
                >
                  Continuer <ChevronRight className="w-5 h-5 inline" />
                </motion.button>
              )}
            </motion.div>
          )}

          {/* ── COMMENTS & MEDIA ── */}
          {step === 'comments' && opponent && (
            <motion.div key="comments" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-4 py-2">
              <div className="text-center mb-2">
                <h4 className="font-nunito font-black text-xl mb-1">Un mot sur le match ?</h4>
                <p className="text-xs text-muted-foreground">Optionnel — ajoutez un commentaire ou un souvenir</p>
              </div>

              {/* Winner comment */}
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1 block">
                  💬 Commentaire du gagnant
                </label>
                <textarea
                  className="input-lumios min-h-[60px] resize-none"
                  placeholder="Belle partie !"
                  maxLength={200}
                  value={commentWinner}
                  onChange={e => setCommentWinner(e.target.value)}
                />
              </div>

              {/* Loser comment */}
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1 block">
                  💬 Commentaire du perdant
                </label>
                <textarea
                  className="input-lumios min-h-[60px] resize-none"
                  placeholder="Revanche !"
                  maxLength={200}
                  value={commentLoser}
                  onChange={e => setCommentLoser(e.target.value)}
                />
              </div>

              {/* Photo/video souvenir */}
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">
                  📸 Photo / Vidéo souvenir
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleMediaSelect}
                />
                {mediaPreview ? (
                  <div className="relative">
                    <img src={mediaPreview} alt="Souvenir" className="w-full h-32 object-cover rounded-xl" />
                    <button
                      onClick={() => { setMediaFile(null); setMediaPreview(null); }}
                      className="absolute top-2 right-2 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full p-4 rounded-xl border-2 border-dashed border-border flex items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-all"
                  >
                    <Camera className="w-5 h-5" />
                    <span className="text-sm font-semibold">Ajouter une photo</span>
                  </button>
                )}
              </div>

              {/* ─ Boutons Valider / Retour ─ */}
              {hasVoted ? (
                /* Waiting — l'autre joueur n'a pas encore validé */
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center gap-4 p-5 bg-muted rounded-2xl"
                >
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <div className="text-center">
                    <p className="font-nunito font-black text-base">Ton score est envoyé ✅</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      En attente que <strong>{opponent?.pseudo}</strong> valide aussi son score…
                    </p>
                  </div>
                  {mismatchError && (
                    <div className="w-full p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-xs font-bold text-center">
                      ⚠️ {mismatchError}
                      <br />
                      <button
                        className="mt-2 underline text-rose-500 font-bold"
                        onClick={() => { setHasVoted(false); setMismatchError(null); setSelectedScore(null); setWinnerId(null); setStep('score-entry'); }}
                      >
                        Modifier le score
                      </button>
                    </div>
                  )}
                </motion.div>
              ) : (
                <div className="flex gap-3 mt-2">
                  <button className="btn-glass flex-1 py-3.5" onClick={() => setStep('score-entry')}>
                    Retour
                  </button>
                  <button
                    className="btn-primary flex-1 py-3.5"
                    onClick={handleSubmitResult}
                    disabled={isProcessing}
                  >
                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (
                      <><Check className="w-5 h-5" /> Valider</>
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* ── RESULT ── */}
          {step === 'result' && opponent && result && (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-5 py-4">
              <div className="text-center">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3 ${result.winnerId === profile.id ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                  {result.winnerId === profile.id ? <Trophy className="w-8 h-8 text-emerald-600" /> : <User className="w-8 h-8 text-rose-600" />}
                </div>
                <h4 className="font-nunito font-black text-2xl">
                  {result.winnerId === profile.id ? 'Victoire ! 🎉' : 'Défaite 👏'}
                </h4>
                {selectedScore && (
                  <p className="text-lg font-bold text-muted-foreground mt-1">{selectedScore}</p>
                )}
              </div>

              {/* Bonuses */}
              {result.bonuses.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-center">
                  {result.bonuses.map((b, i) => (
                    <span key={i} className="badge-lumios badge-golden text-xs">{b}</span>
                  ))}
                </div>
              )}

              {/* Changes */}
              <div className="w-full bg-muted rounded-2xl p-5 space-y-4 shadow-inner border border-white/40">
                {/* Player */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-nunito font-black text-sm">{profile.pseudo}</span>
                    {result.winnerId === profile.id && <Trophy className="w-3 h-3 text-emerald-500" />}
                  </div>
                  <div className="text-right">
                    {matchMode === 'competitive' && (
                      <span className={`font-black font-nunito text-sm ${
                        (isHost ? result.stepChangeP1 : result.stepChangeP2) > 0 ? 'text-emerald-500' :
                        (isHost ? result.stepChangeP1 : result.stepChangeP2) < 0 ? 'text-rose-500' : 'text-muted-foreground'
                      }`}>
                        {formatStepChange(isHost ? result.stepChangeP1 : result.stepChangeP2)}
                      </span>
                    )}
                    <span className="text-xs text-amber-600 font-bold ml-2">
                      +{isHost ? result.xpP1 : result.xpP2} XP
                    </span>
                  </div>
                </div>

                <div className="h-px bg-border/50" />

                {/* Opponent */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-nunito font-black text-sm">{opponent.pseudo}</span>
                    {result.winnerId === opponent.id && <Trophy className="w-3 h-3 text-emerald-500" />}
                  </div>
                  <div className="text-right">
                    {matchMode === 'competitive' && (
                      <span className={`font-black font-nunito text-sm ${
                        (isHost ? result.stepChangeP2 : result.stepChangeP1) > 0 ? 'text-emerald-500' :
                        (isHost ? result.stepChangeP2 : result.stepChangeP1) < 0 ? 'text-rose-500' : 'text-muted-foreground'
                      }`}>
                        {formatStepChange(isHost ? result.stepChangeP2 : result.stepChangeP1)}
                      </span>
                    )}
                    <span className="text-xs text-amber-600 font-bold ml-2">
                      +{isHost ? result.xpP2 : result.xpP1} XP
                    </span>
                  </div>
                </div>
              </div>

              {matchMode === 'friendly' && (
                <p className="text-xs text-muted-foreground italic text-center">Match amical — pas d'impact sur le classement</p>
              )}

              {/* #3 — Suggestion d'ajout en ami */}
              {isFriendAlready === false && opponent && (
                <motion.button
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={async () => {
                    if (friendAdded) return;
                    const ok = await addFriend(profile.id, opponent.id);
                    if (ok) setFriendAdded(true);
                  }}
                  disabled={friendAdded}
                  className={`w-full py-3 rounded-2xl border-2 font-nunito font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                    friendAdded
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                      : 'border-primary/30 bg-primary/5 text-primary hover:bg-primary/10'
                  }`}
                >
                  {friendAdded ? '✅ Demande envoyée !' : `👥 Ajouter ${opponent.pseudo} en ami`}
                </motion.button>
              )}

              <button className="btn-primary w-full py-4 font-nunito font-black" onClick={handleClose}>Terminer</button>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

// Re-export for convenience
const ChevronRight2 = ArrowRight;
