import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Award, Lock, Loader2 } from 'lucide-react';
import type { ChildProfile } from '../../lib/types';
import { getRankForElo, ELO_RANKS } from '../../lib/types';
import { clamp, formatEloChange } from '../../lib/utils';
import { getMatchHistory } from '../../lib/api';

// DEMO_MATCHES removed in favor of real API call


const BADGES = [
  { id: 'b1', name: 'Fair-Play',   icon: '🤝', desc: '10 défaites validées', earned: true },
  { id: 'b2', name: 'En Feu',      icon: '🔥', desc: '3 victoires consécutives', earned: true },
  { id: 'b3', name: 'Globe-Trotter', icon: '🌍', desc: 'Jouer dans 3 villes', earned: false },
  { id: 'b4', name: 'Champion',    icon: '🏆', desc: 'Gagner un tournoi', earned: false },
  { id: 'b5', name: 'First Blood', icon: '⚡', desc: 'Première victoire', earned: true },
  { id: 'b6', name: 'Diplomate',   icon: '🕊️', desc: 'Ajouter 5 amis', earned: false },
  { id: 'b7', name: 'Marathonien', icon: '🏃', desc: '50 matchs joués', earned: false },
  { id: 'b8', name: 'Lumios Pro',  icon: '💎', desc: 'Atteindre 1500 ELO', earned: false },
];

interface DashboardScreenProps {
  profile: ChildProfile;
}

export default function DashboardScreen({ profile }: DashboardScreenProps) {
  const [matches, setMatches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchMatches() {
      const { data } = await getMatchHistory(profile.id);
      setMatches(data || []);
      setIsLoading(false);
    }
    fetchMatches();
  }, [profile.id]);

  const rank = getRankForElo(profile.elo);
  const nextRankIdx = ELO_RANKS.findIndex(r => r.name === rank.name) + 1;
  const nextRank = ELO_RANKS[nextRankIdx];
  const progress = nextRank
    ? clamp((profile.elo - rank.minElo) / (nextRank.minElo - rank.minElo) * 100, 0, 100)
    : 100;

  const wins = matches.filter(m => m.won).length;
  const losses = matches.filter(m => !m.won).length;
  const ratio = (wins + losses) > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;

  return (
    <div className="screen-wrapper">
      <motion.h1 initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="font-nunito font-black text-2xl mb-5">
        Mes Stats
      </motion.h1>

      {/* ── ELO Card ──────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="relative overflow-hidden rounded-3xl p-5 mb-4 gradient-lumios text-white"
        style={{ boxShadow: '0 4px 24px hsl(var(--lumios-blue)/0.35)' }}
      >
        {/* Background orb */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/10 rounded-full" />

        <div className="relative">
          {/* Rank name */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">{rank.icon}</span>
            <span className="font-nunito font-bold text-white/90 text-sm">{rank.name}</span>
          </div>

          {/* ELO */}
          <div className="flex items-end gap-3 mb-4">
            <span className="font-nunito font-black text-5xl text-glow-blue" style={{ textShadow: '0 0 30px rgba(255,255,255,0.4)' }}>
              {profile.elo}
            </span>
            <div className="mb-1.5">
              <span className="text-white/70 text-sm font-semibold">ELO</span>
              <div className="flex items-center gap-1 mt-0.5">
                <TrendingUp className="w-3.5 h-3.5 text-white/80" />
                <span className="text-xs text-white/80 font-semibold">+52 ce mois</span>
              </div>
            </div>
          </div>

          {/* Progress to next rank */}
          {nextRank && (
            <div>
              <div className="flex justify-between text-xs text-white/70 mb-1 font-semibold">
                <span>{rank.name}</span>
                <span>{nextRank.name} ({nextRank.minElo} ELO)</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-white rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1, ease: [0.34, 1.56, 0.64, 1] }}
                />
              </div>
              <p className="text-xs text-white/60 mt-1 font-medium">
                {nextRank.minElo - profile.elo} ELO pour le prochain rang
              </p>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Stats Grid ────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-3 gap-3 mb-5"
      >
        {[
          { label: 'Victoires', value: wins, color: 'lumios-green', icon: '🏆' },
          { label: 'Défaites',  value: losses, color: 'lumios-red', icon: '💀' },
          { label: 'Ratio',     value: `${ratio}%`, color: 'lumios-blue', icon: '📊' },
        ].map(stat => (
          <div key={stat.label} className="card-lumios p-3 text-center">
            <p className="text-xl mb-1">{stat.icon}</p>
            <p className="font-nunito font-black text-xl" style={{ color: `hsl(var(--${stat.color}))` }}>
              {stat.value}
            </p>
            <p className="text-xs text-muted-foreground font-semibold">{stat.label}</p>
          </div>
        ))}
      </motion.div>

      {/* ── Badges ────────────────────────────────────────────────────────────── */}
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
              whileTap={{ scale: badge.earned ? 0.92 : 1 }}
              className={`flex flex-col items-center gap-1 p-2.5 card-lumios transition-all ${!badge.earned ? 'opacity-30' : 'card-lumios-hover'}`}
              title={badge.desc}
            >
              <span className="text-2xl">{badge.icon}</span>
              <span className="text-[10px] font-bold text-center leading-tight font-nunito">{badge.name}</span>
              {!badge.earned && <Lock className="w-3 h-3 text-muted-foreground" />}
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ── Recent Matches ─────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="font-nunito font-black text-base mb-3">Derniers matchs</h2>
        <div className="flex flex-col gap-2">
          {isLoading ? (
            <div className="flex justify-center p-5"><Loader2 className="animate-spin text-primary w-6 h-6" /></div>
          ) : matches.length === 0 ? (
            <div className="text-center p-5 text-muted-foreground text-sm card-lumios">Aucun match joué.</div>
          ) : matches.map((match, i) => (
            <motion.div
              key={match.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.05 }}
              className="flex items-center gap-3 p-3 card-lumios"
            >
              <div className={`w-1 h-10 rounded-full flex-shrink-0 ${match.won ? 'bg-emerald-400' : 'bg-red-400'}`} />
              <div className="flex-1 min-w-0">
                <p className="font-nunito font-bold text-sm">vs {match.opponentPseudo}</p>
                <p className="text-xs text-muted-foreground">{match.score} · {match.date}</p>
              </div>
              <div className={`flex items-center gap-1 font-nunito font-black text-sm ${match.eloChange >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {match.eloChange >= 0
                  ? <TrendingUp className="w-3.5 h-3.5" />
                  : <TrendingDown className="w-3.5 h-3.5" />
                }
                {formatEloChange(match.eloChange)}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
