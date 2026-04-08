import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Loader2, Flame, Calendar, Trophy, TrendingUp, ChevronLeft, ChevronRight, History } from 'lucide-react';
import type { ChildProfile, LeaderboardFilter } from '../../lib/types';
import { getTierConfig, MYTHIC_TOP_N, getCurrentGameSeason } from '../../lib/types';
import { getRankDisplayName } from '../../lib/ranking';
import { getGlobalLeaderboard } from '../../lib/api';
import DashboardScreen from '../dashboard/DashboardScreen';

// ── Période helpers ────────────────────────────────────────────────────────────

const FILTER_LABELS: { value: LeaderboardFilter; label: string; icon: string }[] = [
  { value: 'month',  label: 'Mois',   icon: '📅' },
  { value: 'season', label: 'Saison', icon: '🌸' },
  { value: 'year',   label: 'Année',  icon: '🏆' },
];

function getPeriodLabel(filter: LeaderboardFilter): string {
  const now = new Date();
  if (filter === 'month') {
    return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(now);
  }
  if (filter === 'season') {
    const s = getCurrentGameSeason();
    return `${s.label} (${s.months})`;
  }
  return `Année ${now.getFullYear()}`;
}

const PODIUM_HEIGHTS: Record<number, string> = { 1: 'h-24', 2: 'h-16', 3: 'h-12' };
const PODIUM_ORDER = [2, 1, 3] as const;

interface LeaderboardScreenProps {
  profile: ChildProfile;
  onRefreshProfile?: () => Promise<void>;
}

type TabType = 'rank' | 'stats';

export default function LeaderboardScreen({ profile, onRefreshProfile }: LeaderboardScreenProps) {
  const [activeTab, setActiveTab] = useState<TabType>('rank');
  const [filter, setFilter] = useState<LeaderboardFilter>('month');
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  const fetchLB = useCallback(async () => {
    setIsLoading(true);
    const { data } = await getGlobalLeaderboard();
    setLeaderboard(data || []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchLB();
  }, [fetchLB, filter]);

  // ── Calculs classement ────────────────────────────────────────────────────────
  const top3 = leaderboard.slice(0, 3);
  const myRankEntry = leaderboard.find(p => p.pseudo === profile.pseudo);
  const myRank = myRankEntry?.rank ?? 0;

  // 5 devant + moi + 5 derrière (exclut le top3)
  const restFull = leaderboard.slice(3);
  const myIndexInRest = restFull.findIndex(p => p.pseudo === profile.pseudo);

  let visibleRest: any[];
  if (myIndexInRest === -1) {
    // Pas dans le top (non classé), on affiche les 10 premiers de la liste hors podium
    visibleRest = restFull.slice(0, 10);
  } else {
    const start = Math.max(0, myIndexInRest - 5);
    const end   = Math.min(restFull.length, myIndexInRest + 6);
    visibleRest = restFull.slice(start, end);
  }

  // ── Gamification ──────────────────────────────────────────────────────────────
  // Victoires nécessaires pour monter d'un rang (basé sur tier actuel)
  function winsToNextRank(): number {
    // Chaque victoire = +2 steps en bronze, +1 sinon. totalSteps = 4 ou 6 ou 7
    // On simplifie : on regarde le stepChange sur dernier match ou on utilise tierConfig
    const tierName = profile.rankTier;
    const winGain = { bronze: 2, silver: 2, gold: 1, platinum: 1, diamond: 1, mythic: 0 }[tierName] ?? 1;
    const progress = profile.rankStep % (tierName === 'gold' || tierName === 'platinum' || tierName === 'diamond' ? 7 : 4);
    const stepsLeft = (tierName === 'gold' || tierName === 'platinum' || tierName === 'diamond' ? 7 : 4) - progress;
    return winGain > 0 ? Math.ceil(stepsLeft / winGain) : 0;
  }

  function winsToTop3(): string {
    if (!myRankEntry || myRank <= 3) return '';
    const gap = myRank - 3;
    return `${gap} victoire${gap > 1 ? 's' : ''} pour entrer dans le Top 3`;
  }

  const periodLabel = getPeriodLabel(filter);

  return (
    <div className="screen-wrapper">
      {/* Tab toggle */}
      <div className="flex bg-muted rounded-2xl p-1 mb-5">
        <button
          onClick={() => setActiveTab('rank')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-black transition-all font-nunito flex items-center justify-center gap-2 ${activeTab === 'rank' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground'}`}
        >
          <Crown className="w-4 h-4" /> Classement
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-black transition-all font-nunito flex items-center justify-center gap-2 ${activeTab === 'stats' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground'}`}
        >
          <Flame className="w-4 h-4" /> Mes Stats
        </button>
      </div>

      {activeTab === 'stats' ? (
        <DashboardScreen profile={profile} onRefreshProfile={onRefreshProfile} />
      ) : (
        <>
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-4">
            <div>
              <h1 className="font-nunito font-black text-2xl mb-0.5">Classement National</h1>
              <p className="text-muted-foreground text-sm capitalize">{periodLabel}</p>
            </div>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="p-2 rounded-xl bg-muted text-muted-foreground hover:text-primary transition-colors"
              title="Historique"
            >
              <History className="w-4 h-4" />
            </button>
          </motion.div>

          {/* Historique simplifié */}
          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 overflow-hidden"
              >
                <div className="p-4 rounded-2xl bg-muted/50 border border-border">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Historique</p>
                  <div className="flex flex-col gap-2">
                    {(['month','season','year'] as LeaderboardFilter[]).map(f => (
                      <button
                        key={f}
                        onClick={() => { setFilter(f); setShowHistory(false); }}
                        className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${filter === f ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}
                      >
                        <span className="text-lg">{FILTER_LABELS.find(x => x.value === f)?.icon}</span>
                        <div>
                          <p className="font-nunito font-bold text-sm">{FILTER_LABELS.find(x => x.value === f)?.label}</p>
                          <p className="text-xs text-muted-foreground">{getPeriodLabel(f)}</p>
                        </div>
                        {filter === f && <div className="ml-auto w-5 h-5 gradient-lumios rounded-full flex items-center justify-center"><Crown className="w-3 h-3 text-white" /></div>}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Période filter tabs */}
          <div className="flex bg-muted rounded-2xl p-1 mb-5">
            {FILTER_LABELS.map(f => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all font-nunito flex items-center justify-center gap-1.5 ${filter === f.value ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground'}`}
              >
                <span>{f.icon}</span> {f.label}
              </button>
            ))}
          </div>

          {/* Season banner */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.05 }}
            className="flex items-center gap-3 p-3.5 rounded-2xl mb-5 gradient-golden text-white"
            style={{ boxShadow: '0 4px 16px hsl(var(--golden)/0.3)' }}
          >
            <Trophy className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-nunito font-black text-sm">Championnat National</p>
              <p className="text-white/80 text-xs">Top {MYTHIC_TOP_N} = Rang Mythique 🔥</p>
            </div>
            <span className="ml-auto text-xs font-bold bg-white/20 px-2 py-1 rounded-lg capitalize">{periodLabel}</span>
          </motion.div>

          {isLoading ? (
            <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : (
            <>
              {/* Podium top 3 */}
              {top3.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex items-end justify-center gap-3 mb-7 px-4"
                >
                  {PODIUM_ORDER.map(rank => {
                    const player = top3.find((p: any) => p.rank === rank);
                    if (!player) return null;
                    const isFirst = rank === 1;
                    const tierCfg = getTierConfig(player.rankTier || 'bronze');
                    const rankName = getRankDisplayName(player.rankTier || 'bronze', player.rankStep ?? 0);
                    return (
                      <div key={rank} className="flex flex-col items-center gap-2" style={{ width: '30%' }}>
                        {isFirst && (
                          <motion.div
                            animate={{ y: [0, -5, 0] }}
                            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                            className="text-2xl"
                          >
                            👑
                          </motion.div>
                        )}
                        <div
                          className={`rounded-2xl flex items-center justify-center text-2xl shadow-md ${
                            isFirst ? 'w-14 h-14 animate-pulse-glow-golden gradient-golden' : 'w-12 h-12 surface-glass'
                          }`}
                          style={isFirst ? {} : {
                            border: rank === 2 ? '2px solid rgba(200,200,220,0.5)' : '2px solid hsl(0 75% 70% / 0.4)',
                          }}
                        >
                          {player.avatarEmoji}
                        </div>
                        <div className="text-center">
                          <p className={`font-nunito font-black text-xs truncate ${isFirst ? 'text-glow-golden' : ''}`} style={isFirst ? { color: 'hsl(var(--golden))' } : {}}>
                            {player.pseudo}
                          </p>
                          <div className="flex items-center justify-center gap-1 mt-0.5">
                            <span className="text-xs">{tierCfg.icon}</span>
                            <span className="text-[10px] font-semibold" style={{ color: tierCfg.color }}>{rankName}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground font-semibold">{player.seasonXp ?? 0} XP</p>
                        </div>
                        <div
                          className={`w-full rounded-t-xl flex items-center justify-center font-nunito font-black text-white text-sm ${
                            isFirst ? 'gradient-golden' : 'bg-muted'
                          } ${PODIUM_HEIGHTS[rank]}`}
                        >
                          #{rank}
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              )}

              {/* Gamification — ma position */}
              {myRankEntry && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="p-3 rounded-2xl mb-4 border border-primary/20 bg-primary/3"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <span className="font-nunito font-black text-sm text-primary">Ma position : #{myRank}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {winsToNextRank() > 0 && (
                      <p className="text-xs text-muted-foreground">
                        🎯 <strong>{winsToNextRank()} victoire{winsToNextRank() > 1 ? 's' : ''}</strong> pour passer au rang supérieur
                      </p>
                    )}
                    {winsToTop3() && (
                      <p className="text-xs text-muted-foreground">
                        👑 <strong>{winsToTop3()}</strong>
                      </p>
                    )}
                    {myRank <= 3 && (
                      <p className="text-xs text-emerald-500 font-semibold">🏆 Tu es dans le Top 3 ! Maintiens ta place !</p>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Séparateur si pas dans le top 3 mais classement commence depuis position > 4 */}
              {myRankEntry && myRank > 9 && visibleRest[0]?.rank > 4 && (
                <div className="flex items-center gap-2 my-2">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">···</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              )}

              {/* Liste autour de l'utilisateur (5 devant + moi + 5 derrière) */}
              <div className="flex flex-col gap-2">
                {visibleRest.map((player: any, i: number) => {
                  const isCurrentUser = player.pseudo === profile.pseudo;
                  const tierCfg = getTierConfig(player.rankTier || 'bronze');
                  const rankName = getRankDisplayName(player.rankTier || 'bronze', player.rankStep ?? 0);

                  return (
                    <motion.div
                      key={player.pseudo}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 + i * 0.04 }}
                      className={`flex items-center gap-3 p-3 card-lumios ${isCurrentUser ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/20' : ''}`}
                    >
                      <span className="font-nunito font-black text-sm text-muted-foreground w-7 text-center">#{player.rank}</span>
                      <div className="w-9 h-9 bg-muted rounded-xl flex items-center justify-center text-lg flex-shrink-0">
                        {player.avatarEmoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-nunito font-black text-sm ${isCurrentUser ? 'text-primary' : ''}`}>{player.pseudo}</span>
                          {player.hasLumios && <span className="text-xs">⚡</span>}
                          {isCurrentUser && <span className="badge-lumios badge-blue text-[10px]">Moi</span>}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs">{tierCfg.icon}</span>
                          <span className="text-[10px] font-semibold" style={{ color: tierCfg.color }}>{rankName}</span>
                          <span className="text-[10px] text-muted-foreground">· {player.seasonXp ?? 0} XP</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Non classé */}
              {!myRankEntry && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mt-4 p-4 rounded-2xl bg-muted/50 text-center"
                >
                  <p className="text-sm text-muted-foreground">
                    🎮 Joue tes premiers matchs pour apparaître dans le classement !
                  </p>
                </motion.div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
