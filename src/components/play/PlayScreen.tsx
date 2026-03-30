import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, MapPin, Search, Trophy, Sparkles, Navigation } from 'lucide-react';
import type { ChildProfile } from '../../lib/types';
import FriendDuelModal from './FriendDuelModal';
import CreateArenaModal from './CreateArenaModal';
import FindGameModal from './FindGameModal';
import CompetitionFlow from '../competition/CompetitionFlow';
import { formatDistance } from '../../lib/utils';

const DEMO_ARENAS = [
  { id: '1', name: 'Arène du Parc Monceau', distance: 0.4, playerCount: 6, level: 'Tout niveau', status: 'open' as const },
  { id: '2', name: 'Challenge Les Halles',    distance: 1.2, playerCount: 3, level: '800+ ELO',    status: 'playing' as const },
  { id: '3', name: 'Défi Trocadéro',          distance: 2.8, playerCount: 8, level: 'Tout niveau', status: 'open' as const },
];

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
    id: 'arena',
    title: 'Créer une Arène',
    desc: 'Ouvrez un lieu de rencontre',
    Icon: MapPin,
    color: 'lumios-red' as const,
    gradient: 'from-red-500 to-rose-400',
    badge: 'Multijoueur',
  },
  {
    id: 'find',
    title: 'Trouver une Partie',
    desc: 'Rejoindre des parties près de vous',
    Icon: Search,
    color: 'lumios-green' as const,
    gradient: 'from-emerald-500 to-green-400',
    badge: 'À proximité',
  },
  {
    id: 'competition',
    title: 'Compétition',
    desc: 'Tournoi ou Coupe organisée',
    Icon: Trophy,
    color: 'lumios-red' as const,
    gradient: 'from-orange-500 to-red-400',
    badge: 'ELO',
  },
];

type ModalType = 'duel' | 'arena' | 'find' | 'competition' | null;

interface PlayScreenProps {
  profile: ChildProfile;
}

export default function PlayScreen({ profile }: PlayScreenProps) {
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  return (
    <div className="screen-wrapper">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 gradient-lumios rounded-xl flex items-center justify-center text-lg">
            {profile.avatarEmoji}
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Bonjour,</p>
            <h1 className="font-nunito font-black text-lg leading-tight">{profile.pseudo} 👋</h1>
          </div>
          <div className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-card rounded-xl border border-border shadow-card">
            <Sparkles className="w-3.5 h-3.5" style={{ color: 'hsl(var(--golden))' }} />
            <span className="text-xs font-bold font-nunito">{profile.elo} ELO</span>
          </div>
        </div>
      </motion.div>

      {/* Section title */}
      <h2 className="font-nunito font-black text-lg mb-4">Choisissez votre jeu</h2>

      {/* Game Modes Grid */}
      <div className="grid grid-cols-2 gap-3 mb-7">
        {MODES.map((mode, i) => (
          <motion.button
            key={mode.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveModal(mode.id as ModalType)}
            className="relative flex flex-col items-start p-4 card-lumios card-lumios-hover overflow-hidden text-left"
          >
            {/* Background gradient blob */}
            <div
              className={`absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-10 bg-gradient-to-br ${mode.gradient}`}
            />

            {/* Icon */}
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center mb-3 shadow-sm"
              style={{ background: `hsl(var(--${mode.color}) / 0.12)` }}
            >
              <mode.Icon
                className="w-5 h-5"
                style={{ color: `hsl(var(--${mode.color}))` }}
                strokeWidth={2.2}
              />
            </div>

            {/* Text */}
            <p className="font-nunito font-black text-sm leading-tight mb-0.5">{mode.title}</p>
            <p className="text-xs text-muted-foreground leading-snug">{mode.desc}</p>

            {/* Badge */}
            <span className={`badge-lumios mt-2 ${
              mode.color === 'lumios-blue' ? 'badge-blue' :
              mode.color === 'lumios-green' ? 'badge-green' : 'badge-red'
            }`}>
              {mode.badge}
            </span>
          </motion.button>
        ))}
      </div>

      {/* Nearby Arenas */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-nunito font-black text-base">Arènes à proximité</h2>
          <button className="text-xs font-bold" style={{ color: 'hsl(var(--primary))' }} onClick={() => setActiveModal('find')}>
            Voir tout
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {DEMO_ARENAS.map((arena, i) => (
            <motion.button
              key={arena.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.06 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveModal('find')}
              className="flex items-center gap-3 p-3.5 card-lumios card-lumios-hover text-left"
            >
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${arena.status === 'open' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <div className="flex-1 min-w-0">
                <p className="font-nunito font-bold text-sm truncate">{arena.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground">{arena.playerCount} joueurs</span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">{arena.level}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Navigation className="w-3 h-3" />
                <span className="text-xs font-semibold">{formatDistance(arena.distance)}</span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {activeModal === 'duel'        && <FriendDuelModal profile={profile} onClose={() => setActiveModal(null)} />}
        {activeModal === 'arena'       && <CreateArenaModal profile={profile} onClose={() => setActiveModal(null)} />}
        {activeModal === 'find'        && <FindGameModal profile={profile} onClose={() => setActiveModal(null)} />}
        {activeModal === 'competition' && <CompetitionFlow onClose={() => setActiveModal(null)} />}
      </AnimatePresence>
    </div>
  );
}
