import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Award, Lock, Loader2, Trophy, RotateCcw, Flame, Star, Calendar } from 'lucide-react';
import type { ChildProfile } from '../../lib/types';
import { getTierConfig, RANK_TIERS, getCurrentGameSeason } from '../../lib/types';
import { fromGlobalStep, getRankDisplayName, getRankProgress, getNextRankName } from '../../lib/ranking';
import { formatStepChange } from '../../lib/utils';
import { getMatchHistory } from '../../lib/api';

const BADGES = [
  { id: 'b1', name: 'Fair-Play',    icon: '🤝', desc: 'Jouer et valider 10 défaites sans quitter.', earned: false },
  { id: 'b2', name: 'En Feu',       icon: '🔥', desc: 'Enchaîner 3 victoires consécutives en duel.', earned: false },
  { id: 'b3', name: 'Globe-Trotter',icon: '🌍', desc: 'Participer à des matchs dans 3 villes différentes.', earned: false },
  { id: 'b4', name: 'Champion',     icon: '🏆', desc: 'Remporter la première place d\'un tournoi.', earned: false },
  { id: 'b5', name: 'First Blood',  icon: '⚡', desc: 'Remporter sa toute première victoire sur Lumios.', earned: false },
  { id: 'b6', name: 'Diplomate',    icon: '🕊️', desc: 'Avoir au moins 5 amis dans sa liste.', earned: false },
  { id: 'b7', name: 'Marathonien',  icon: '🏃', desc: 'Jouer un total de 50 matchs, victoires ou défaites.', earned: false },
  { id: 'b8', name: 'Lumios Pro',   icon: '💎', desc: 'Atteindre le rang de Diamant.', earned: false },
];

type PeriodFilter = 'month' | 'season' | 'year' | 'all';

const PERIOD_LABELS: { value: PeriodFilter; label: string }[] = [
  { value: 'month',  label: 'Ce mois' },
  { value: 'season', label: 'Saison' },
  { value: 'year',   label: 'Année' },
  { value: 'all',    label: 'Tout' },
];

interface DashboardScreenProps {
  profile: ChildProfile;
  onRefreshProfile?: () => Promise<void>;
}

export default function DashboardScreen({ profile, onRefreshProfile }: DashboardScreenProps) {
  const [matches, setMatches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBadge, setSelectedBadge] = useState<any | null>(null);
  const [period, setPeriod] = useState<PeriodFilter>('month');

  const fetchMatches = async () => {
    setIsLoading(true);
    const { data } = await getMatchHistory(profile.id);
    setMatches(data || []);
    setIsLoading(false);
  };

  useEffect(() => { fetchMatches(); }, [profile.id]);

  const handleManualRefresh = async () => {
    if (onRefreshProfile) await onRefreshProfile();
    await fetchMatches();
  };

  // ── Filtrage par période ───────────────────────────────────────────────────────
  const filteredMatches = useMemo(() => {
    const now = new Date();
    return matches.filter(m => {
      const d = new Date(m.date);
      if (period === 'all') return true;
      if (period === 'month') {
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      }
      if (period === 'season') {
        const month = d.getMonth() + 1;
        const season = getCurrentGameSeason();
        if (season.season === 'spring')  return month >= 4  && month <= 6;
        if (season.season === 'summer')  return month >= 7  && month <= 8;
        if (season.season === 'autumn')  return month >= 9  && month <= 11;
        if (season.season === 'winter')  return month === 12 || month <= 3;
      }
      if (period === 'year') {
        return d.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [matches, period]);

  // ── Graphe d'évolution du rang ─────────────────────────────────────────────────
  // On reconstitue l'évolution du rang sur les 12 derniers mois
  const rankEvolution = useMemo(() => {
    const now = new Date();
    const months: { label: string; step: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(d);
      // Calcul du rank_step reconstruit à partir de l'historique
      const matchesUpToMonth = matches.filter(m => {
        const md = new Date(m.date);
        return md <= new Date(d.getFullYear(), d.getMonth() + 1, 0);
      });
      // Step simulé : on part du step actuel et on "remonte" en inversant les changements
      let step = profile.rankStep;
      for (const m of matches) {
        const md = new Date(m.date);
        if (md > new Date(d.getFullYear(), d.getMonth() + 1, 0)) {
          step -= m.stepChange;
        }
      }
      months.push({ label, step: Math.max(0, step) });
    }
    return months;
  }, [matches, profile.rankStep]);

  // Min/Max pour normaliser le graphe
  const minStep = Math.min(...rankEvolution.map(m => m.step));
  const maxStep = Math.max(...rankEvolution.map(m => m.step));
  const range = Math.max(1, maxStep - minStep);

  // ── Rank info ────────────────────────────────────────────────────────────────
  const rankInfo = fromGlobalStep(profile.rankStep);
  const tierCfg = getTierConfig(rankInfo.tier);
  const rankName = getRankDisplayName(profile.rankTier, profile.rankStep);
  const progress = getRankProgress(profile.rankStep);
  const nextRank = getNextRankName(profile.rankStep);

  // ── Stats filtrés ─────────────────────────────────────────────────────────────
  const wins   = filteredMatches.filter(m => m.won).length;
  const losses = filteredMatches.filter(m => !m.won).length;
  const ratio  = (wins + losses) > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;

  const seasonInfo = getCurrentGameSeason();
  const periodDisplayLabel = period === 'month'
    ? new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date())
    : period === 'season' ? `${seasonInfo.label} ${seasonInfo.months}`
    : period === 'year' ? `Année ${new Date().getFullYear()}`
    : 'Tout';

  return (
    <div className="screen-wrapper">
      <div className="flex items-center justify-between mb-5">
        <motion.h1 initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} className="font-nunito font-black text-2xl">
          Mes Stats
        </motion.h1>
        <button
          onClick={handleManualRefresh}
          className="p-2 rounded-xl bg-muted/50 text-muted-foreground hover:bg-muted transition-colors"
        >
          <RotateCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ── Filtre de période — #8 ─────────────────────────────────────────────── */}
      <div className="flex bg-muted rounded-2xl p-1 mb-5">
        {PERIOD_LABELS.map(p => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all font-nunito ${period === p.value ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground'}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Période active */}
      <div className="flex items-center gap-2 mb-4 px-1">
        <Calendar className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground capitalize">{periodDisplayLabel}</span>
      </div>

      {/* ── RANK CARD ─────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="relative overflow-hidden rounded-3xl p-5 mb-4 text-white"
        style={{
          background: `linear-gradient(135deg, ${tierCfg.color}dd, ${tierCfg.color}88)`,
          boxShadow: `0 4px 24px ${tierCfg.color}55`,
        }}
      >
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/10 rounded-full" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">{tierCfg.icon}</span>
            <span className="font-nunito font-bold text-white/90 text-lg">{rankName}</span>
          </div>
          {rankInfo.tier !== 'mythic' && (
            <div className="mb-4">
              <div className="flex gap-1.5 mb-2">
                {Array.from({ length: progress.totalSteps }).map((_, i) => (
                  <div
                    key={i}
                    className={`flex-1 h-3 rounded-full transition-all ${i < progress.currentStep ? 'bg-white shadow-sm' : 'bg-white/25'}`}
                  />
                ))}
              </div>
              <div className="flex justify-between text-xs text-white/70 font-semibold">
                <span>{rankName}</span>
                {nextRank && <span>{nextRank}</span>}
              </div>
            </div>
          )}
          {rankInfo.tier === 'mythic' && (
            <div className="mb-4 p-3 bg-white/15 rounded-2xl text-center">
              <p className="text-sm font-black">🔥 TOP 100 National</p>
              <p className="text-xs text-white/70 mt-0.5">Classement Mythique par XP de saison</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Graphe d'évolution du rang — #8 ──────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="card-lumios p-4 mb-4"
      >
        <div className="flex items-center justify-between mb-3">
          <p className="font-nunito font-black text-sm">Évolution du rang</p>
          <Trophy className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="relative h-20">
          <svg viewBox={`0 0 ${rankEvolution.length * 20} 60`} className="w-full h-full overflow-visible">
            {/* Grille */}
            {[0, 20, 40, 60].map(y => (
              <line key={y} x1="0" y1={y} x2={rankEvolution.length * 20} y2={y} stroke="hsl(var(--border))" strokeWidth="0.5" />
            ))}
            {/* Ligne d'évolution */}
            <polyline
              fill="none"
              stroke={tierCfg.color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={rankEvolution.map((m, i) => {
                const x = i * 20 + 10;
                const y = 55 - ((m.step - minStep) / range) * 50;
                return `${x},${y}`;
              }).join(' ')}
            />
            {/* Points */}
            {rankEvolution.map((m, i) => {
              const x = i * 20 + 10;
              const y = 55 - ((m.step - minStep) / range) * 50;
              const isLast = i === rankEvolution.length - 1;
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r={isLast ? 4 : 3}
                  fill={isLast ? tierCfg.color : 'hsl(var(--background))'}
                  stroke={tierCfg.color}
                  strokeWidth="2"
                />
              );
            })}
          </svg>
        </div>
        {/* Labels axe X */}
        <div className="flex justify-between mt-1">
          {rankEvolution.filter((_, i) => i % 3 === 0 || i === rankEvolution.length - 1).map((m, i) => (
            <span key={i} className="text-[9px] text-muted-foreground capitalize">{m.label}</span>
          ))}
        </div>
      </motion.div>

      {/* ── Season XP + Win Streak ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 gap-3 mb-4"
      >
        <div className="card-lumios p-4">
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-4 h-4 text-amber-500" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase">XP Saison</span>
          </div>
          <p className="font-nunito font-black text-2xl" style={{ color: 'hsl(var(--golden))' }}>
            {profile.seasonXp}
          </p>
          <p className="text-[10px] text-muted-foreground font-semibold mt-0.5 capitalize">{periodDisplayLabel}</p>
        </div>
        <div className="card-lumios p-4">
          <div className="flex items-center gap-2 mb-2">
            <Flame className={`w-4 h-4 ${profile.winStreak >= 3 ? 'text-orange-500' : 'text-muted-foreground'}`} />
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Série</span>
          </div>
          <p className={`font-nunito font-black text-2xl ${profile.winStreak >= 3 ? 'text-orange-500' : ''}`}>
            {profile.winStreak}
            {profile.winStreak >= 3 && <span className="text-sm ml-1">🔥</span>}
          </p>
          <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
            {profile.winStreak >= 3 ? '+20 XP bonus/match' : 'victoires consécutives'}
          </p>
        </div>
      </motion.div>

      {/* ── Stats Grid ─────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-3 gap-3 mb-5"
      >
        {[
          { label: 'Victoires', value: wins,        color: 'lumios-green', icon: '🏆' },
          { label: 'Défaites',  value: losses,      color: 'lumios-red',   icon: '💀' },
          { label: 'Ratio',     value: `${ratio}%`, color: 'lumios-blue',  icon: '📊' },
        ].map(stat => (
          <div key={stat.label} className="card-lumios p-3 text-center">
            <p className="text-xl mb-1">{stat.icon}</p>
            <p className="font-nunito font-black text-xl" style={{ color: `hsl(var(--${stat.color}))` }}>{stat.value}</p>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-tighter">{stat.label}</p>
          </div>
        ))}
      </motion.div>

      {/* ── Badges ─────────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mb-5"
      >
        <h2 className="font-nunito font-black text-base mb-3">Badges</h2>
        <div className="grid grid-cols-4 gap-3">
          {BADGES.map(badge => (
            <motion.div
              key={badge.id}
              whileTap={{ scale: 0.92 }}
              onClick={() => setSelectedBadge(badge)}
              className={`flex flex-col items-center gap-1 p-2.5 card-lumios transition-all cursor-pointer ${!badge.earned ? 'opacity-40 grayscale-[0.5]' : 'card-lumios-hover'}`}
            >
              <span className="text-2xl">{badge.icon}</span>
              <span className="text-[10px] font-bold text-center leading-tight font-nunito">{badge.name}</span>
              {!badge.earned && <Lock className="w-3 h-3 text-muted-foreground mt-0.5 opacity-60" />}
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Badge Modal */}
      <AnimatePresence>
        {selectedBadge && (
          <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedBadge(null)}>
            <motion.div
              className="modal-sheet text-center"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="w-20 h-20 bg-muted rounded-3xl flex items-center justify-center text-5xl mx-auto mb-4">
                {selectedBadge.icon}
              </div>
              <h3 className="font-nunito font-black text-xl mb-2">{selectedBadge.name}</h3>
              <p className="text-sm text-muted-foreground mb-6 px-4">{selectedBadge.desc}</p>
              <button className="btn-primary w-full py-4" onClick={() => setSelectedBadge(null)}>D'accord !</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Derniers matchs (filtrés) ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="font-nunito font-black text-base mb-3">Derniers matchs</h2>
        <div className="flex flex-col gap-2">
          {isLoading ? (
            <div className="flex justify-center p-5"><Loader2 className="animate-spin text-primary w-6 h-6" /></div>
          ) : filteredMatches.length === 0 ? (
            <div className="text-center p-5 text-muted-foreground text-sm card-lumios">Aucun match sur cette période.</div>
          ) : filteredMatches.map((match, i) => (
            <motion.div
              key={match.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.05 }}
              className="flex items-center gap-3 p-3 card-lumios"
            >
              <div className={`w-1 h-10 rounded-full flex-shrink-0 ${match.won ? 'bg-emerald-400' : 'bg-red-400'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-nunito font-bold text-sm">vs {match.opponentPseudo}</p>
                  {match.matchMode === 'friendly' && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-bold">Amical</span>
                  )}
                  {match.contested && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 font-bold">Contesté</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {match.scoreDetail || match.score} · {match.date}
                </p>
              </div>
              <div className={`flex items-center gap-1 font-nunito font-black text-sm ${
                match.stepChange > 0 ? 'text-emerald-500' :
                match.stepChange < 0 ? 'text-red-500' : 'text-muted-foreground'
              }`}>
                {match.stepChange > 0
                  ? <TrendingUp className="w-3.5 h-3.5" />
                  : match.stepChange < 0
                    ? <TrendingDown className="w-3.5 h-3.5" />
                    : null
                }
                {formatStepChange(match.stepChange)}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
