import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Crown, Loader2 } from 'lucide-react';
import type { ChildProfile, LeaderboardFilter } from '../../lib/types';
import { getGlobalLeaderboard } from '../../lib/api';

const FILTER_LABELS: { value: LeaderboardFilter; label: string }[] = [
  { value: 'city',    label: 'Ma Ville' },
  { value: 'region',  label: 'Région' },
  { value: 'country', label: 'Pays' },
  { value: 'world',   label: 'Monde' },
];

const PODIUM_HEIGHTS = { 1: 'h-24', 2: 'h-16', 3: 'h-12' };
const PODIUM_ORDER = [2, 1, 3] as const; // Left: 2nd, Center: 1st, Right: 3rd

interface LeaderboardScreenProps {
  profile: ChildProfile;
}

export default function LeaderboardScreen({ profile }: LeaderboardScreenProps) {
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

  return (
    <div className="screen-wrapper">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
        <h1 className="font-nunito font-black text-2xl mb-0.5">Classement</h1>
        <p className="text-muted-foreground text-sm">Saison 3 — Mars 2026</p>
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
          <p className="text-white/80 text-xs">Top 10 qualifié à la fin du mois</p>
        </div>
        <span className="ml-auto text-xs font-bold bg-white/20 px-2 py-1 rounded-lg">Mars 2026</span>
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
                const player = top3.find(p => p.rank === rank);
                if (!player) return null;
                const isFirst = rank === 1;

                return (
                  <div key={rank} className="flex flex-col items-center gap-2" style={{ width: '30%' }}>
                    {/* Crown for 1st */}
                    {isFirst && (
                      <motion.div
                        animate={{ y: [0, -5, 0] }}
                        transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                        className="text-2xl"
                      >
                        👑
                      </motion.div>
                    )}

                    {/* Avatar */}
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

                    {/* Info */}
                    <div className="text-center">
                      <p className={`font-nunito font-black text-xs truncate ${isFirst ? 'text-glow-golden' : ''}`} style={isFirst ? { color: 'hsl(var(--golden))' } : {}}>
                        {player.pseudo}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-semibold">{player.elo} ELO</p>
                    </div>

                    {/* Podium base */}
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
            {rest.map((player, i) => {
              const isCurrentUser = player.pseudo === profile.pseudo;
              return (
                <motion.div
                  key={player.pseudo}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.04 }}
                  className={`flex items-center gap-3 p-3 card-lumios ${isCurrentUser ? 'border-primary/30 bg-primary/3' : ''}`}
                >
                  {/* Rank */}
                  <span className="font-nunito font-black text-sm text-muted-foreground w-6 text-center">#{player.rank}</span>

                  {/* Avatar */}
                  <div className="w-9 h-9 bg-muted rounded-xl flex items-center justify-center text-lg flex-shrink-0">
                    {player.avatarEmoji}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`font-nunito font-black text-sm ${isCurrentUser ? 'text-primary' : ''}`}>{player.pseudo}</span>
                      {player.hasLumios && <span className="text-xs">⚡</span>}
                      {isCurrentUser && <span className="badge-lumios badge-blue text-[10px]">Moi</span>}
                    </div>
                    <span className="text-xs text-muted-foreground">{player.city}</span>
                  </div>

                  {/* ELO */}
                  <span className="font-nunito font-black text-sm" style={{ color: 'hsl(var(--primary))' }}>
                    {player.elo}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
