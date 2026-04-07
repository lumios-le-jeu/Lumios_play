import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Crown, Loader2, Flame } from 'lucide-react';
import type { ChildProfile, LeaderboardFilter } from '../../lib/types';
import { getTierConfig, MYTHIC_TOP_N } from '../../lib/types';
import { getRankDisplayName } from '../../lib/ranking';
import { getGlobalLeaderboard } from '../../lib/api';
import DashboardScreen from '../dashboard/DashboardScreen';

const FILTER_LABELS: { value: LeaderboardFilter; label: string }[] = [
  { value: 'city',    label: 'Ma Ville' },
  { value: 'region',  label: 'Région' },
  { value: 'country', label: 'Pays' },
  { value: 'world',   label: 'Monde' },
];

const PODIUM_HEIGHTS: Record<number, string> = { 1: 'h-24', 2: 'h-16', 3: 'h-12' };
const PODIUM_ORDER = [2, 1, 3] as const;

interface LeaderboardScreenProps {
  profile: ChildProfile;
  onRefreshProfile?: () => Promise<void>;
}

type TabType = 'rank' | 'stats';

export default function LeaderboardScreen({ profile, onRefreshProfile }: LeaderboardScreenProps) {
  const [activeTab, setActiveTab] = useState<TabType>('rank');
  const [filter, setFilter] = useState<LeaderboardFilter>('world');
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchLB() {
      const { data } = await getGlobalLeaderboard();
      setLeaderboard(data || []);
      setIsLoading(false);
    }
    fetchLB();
  }, []);

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  // Current month name
  const monthName = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date());

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
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
            <h1 className="font-nunito font-black text-2xl mb-0.5">Classement</h1>
            <p className="text-muted-foreground text-sm capitalize">Saison — {monthName}</p>
          </motion.div>

      {/* Filter tabs */}
      <div className="flex bg-muted rounded-2xl p-1 mb-5">
        {FILTER_LABELS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all font-nunito ${filter === f.value ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground'}`}
          >
            {f.label}
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
        <Crown className="w-5 h-5 flex-shrink-0" />
        <div>
          <p className="font-nunito font-black text-sm">Championnat Régional</p>
          <p className="text-white/80 text-xs">Top {MYTHIC_TOP_N} = Rang Mythique 🔥</p>
        </div>
        <span className="ml-auto text-xs font-bold bg-white/20 px-2 py-1 rounded-lg capitalize">{monthName}</span>
      </motion.div>

      {isLoading ? (
        <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <>
          {/* Podium */}
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
                        isFirst
                          ? 'w-14 h-14 animate-pulse-glow-golden gradient-golden'
                          : 'w-12 h-12 surface-glass'
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

          {/* Rest of leaderboard */}
          <div className="flex flex-col gap-2">
            {rest.map((player: any, i: number) => {
              const isCurrentUser = player.pseudo === profile.pseudo;
              const tierCfg = getTierConfig(player.rankTier || 'bronze');
              const rankName = getRankDisplayName(player.rankTier || 'bronze', player.rankStep ?? 0);

              return (
                <motion.div
                  key={player.pseudo}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.04 }}
                  className={`flex items-center gap-3 p-3 card-lumios ${isCurrentUser ? 'border-primary/30 bg-primary/3' : ''}`}
                >
                  <span className="font-nunito font-black text-sm text-muted-foreground w-6 text-center">#{player.rank}</span>
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
                  <span className="text-xs text-muted-foreground">{player.city}</span>
                </motion.div>
              );
            })}
          </div>
        </>
      )}
      </>
      )}
    </div>
  );
}
