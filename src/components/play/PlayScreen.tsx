import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, MapPin, Search, Trophy, Sparkles, Navigation, Loader2, Gamepad2, ExternalLink } from 'lucide-react';
import type { ChildProfile } from '../../lib/types';
import { getRankDisplayName } from '../../lib/ranking';
import { getTierConfig } from '../../lib/types';
import FriendDuelModal from './FriendDuelModal';
import CreateArenaModal from './CreateArenaModal';
import FindGameModal from './FindGameModal';
import JoinCompModal from './JoinCompModal';
import CompetitionFlow from '../competition/CompetitionFlow';
import GuestConversionModal from '../auth/GuestConversionModal';
import { formatDistance } from '../../lib/utils';
import { getSocket } from '../../lib/socket';

const MODES = [
  {
    id: 'duel',
    title: 'Défi entre Amis',
    desc: 'Scannez le QR de votre adversaire',
    Icon: QrCode,
    color: 'lumios-blue' as const,
    gradient: 'from-blue-500 to-blue-400',
    badge: 'En personne',
  },
  {
    id: 'competition',
    title: 'Compétition',
    desc: 'Tournoi ou Coupe organisée',
    Icon: Trophy,
    color: 'lumios-red' as const,
    gradient: 'from-orange-500 to-red-400',
    badge: 'Classé',
  },
  {
    id: 'comp-join',
    title: 'Rejoindre un Tournoi',
    desc: 'Scannez le code du créateur',
    Icon: Sparkles,
    color: 'emerald' as const,
    gradient: 'from-emerald-500 to-emerald-400',
    badge: 'Scanner',
  },
];

type ModalType = 'duel' | 'arena' | 'find' | 'competition' | 'comp-join' | null;

interface PlayScreenProps {
  profile: ChildProfile;
  onRefreshProfile?: () => Promise<void>;
  isGuest?: boolean;
}

export default function PlayScreen({ profile, onRefreshProfile, isGuest }: PlayScreenProps) {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [nearbyArenas, setNearbyArenas] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showGuestConversion, setShowGuestConversion] = useState(false);

  const rankName = getRankDisplayName(profile.rankTier, profile.rankStep);
  const tierCfg = getTierConfig(profile.rankTier);

  useEffect(() => {
    const socket = getSocket();

    const handleLobbies = (list: any[]) => {
      const arenas = list
        .filter(l => l.mode === 'arena')
        .map(l => ({
          id: l.id,
          name: `Arène de ${l.hostPseudo}`,
          distance: l.distance || 0,
          playerCount: Object.keys(l.players).length,
          level: 'Tout niveau',
          status: l.status,
        }));
      setNearbyArenas(arenas);
      setIsLoading(false);
    };

    socket.on('lobbies-list', handleLobbies);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        socket.emit('find-lobbies', { lat: pos.coords.latitude, lng: pos.coords.longitude, radius: 20 });
      });
    }

    const interval = setInterval(() => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          socket.emit('find-lobbies', { lat: pos.coords.latitude, lng: pos.coords.longitude, radius: 20 });
        });
      }
    }, 10000);

    return () => {
      socket.off('lobbies-list', handleLobbies);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="screen-wrapper">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 gradient-lumios rounded-xl flex items-center justify-center text-lg">{profile.avatarEmoji}</div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Bonjour,</p>
            <h1 className="font-nunito font-black text-lg leading-tight">{profile.pseudo} 👋</h1>
          </div>
          <div className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-card rounded-xl border border-border shadow-card">
            <span className="text-sm">{tierCfg.icon}</span>
            <span className="text-xs font-bold font-nunito" style={{ color: tierCfg.color }}>{rankName}</span>
          </div>
        </div>
      </motion.div>

      <h2 className="font-nunito font-black text-lg mb-4 mt-2">Choisissez votre jeu</h2>

      {/* MODES */}
      <div className="grid grid-cols-2 gap-3 mb-7">
        {MODES.map((mode, i) => (
          <motion.button 
            key={mode.id} 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: i * 0.07 }} 
            whileTap={{ scale: 0.95 }} 
            onClick={() => {
              if (isGuest && (mode.id === 'competition' || mode.id === 'comp-join')) {
                setShowGuestConversion(true);
                return;
              }
              setActiveModal(mode.id as ModalType);
            }} 
            className="relative flex flex-col items-start p-4 card-lumios card-lumios-hover overflow-hidden text-left"
          >
            <div className={`absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-10 bg-gradient-to-br ${mode.gradient}`} />
            <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3 shadow-sm" style={{ background: `hsl(var(--${mode.color}) / 0.12)` }}>
              <mode.Icon className="w-5 h-5" style={{ color: `hsl(var(--${mode.color}))` }} strokeWidth={2.2} />
            </div>
            <p className="font-nunito font-black text-sm leading-tight mb-0.5">{mode.title}</p>
            <p className="text-xs text-muted-foreground leading-snug">{mode.desc}</p>
            <span className={`badge-lumios mt-2 ${mode.color === 'lumios-blue' ? 'badge-blue' : 'badge-red'}`}>
              {mode.badge}
            </span>
          </motion.button>
        ))}
      </div>

      {/* ── Footer : Jouer en ligne + Version ──────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mt-8 mb-4 flex flex-col items-center gap-3"
      >
        {/* Lien jeu en ligne */}
        <a
          href="https://lumios-le-jeu.github.io/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-card border border-border shadow-card hover:shadow-card-hover transition-all group"
        >
          <Gamepad2 className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
          <span className="text-sm font-nunito font-bold">S'entraîner en ligne</span>
          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
        </a>

        <div className="flex flex-col items-center gap-1 opacity-50">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Lumios Play v2.0.0</p>
          <button
            onClick={() => window.location.reload()}
            className="text-[9px] font-black text-primary bg-primary/10 px-2 py-1 rounded-full uppercase tracking-tighter hover:bg-primary/20 transition-colors"
          >
            Forcer la mise à jour
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {activeModal === 'duel'        && <FriendDuelModal profile={profile} onRefreshProfile={onRefreshProfile} onClose={() => setActiveModal(null)} />}
        {activeModal === 'arena'       && <CreateArenaModal profile={profile} onClose={() => setActiveModal(null)} />}
        {activeModal === 'find'        && <FindGameModal profile={profile} onClose={() => setActiveModal(null)} />}
        {activeModal === 'competition' && <CompetitionFlow onClose={() => setActiveModal(null)} />}
        {activeModal === 'comp-join'   && <JoinCompModal profile={profile} onClose={() => setActiveModal(null)} />}
      </AnimatePresence>

      <AnimatePresence>
        {showGuestConversion && <GuestConversionModal onClose={() => setShowGuestConversion(false)} />}
      </AnimatePresence>
    </div>
  );
}
