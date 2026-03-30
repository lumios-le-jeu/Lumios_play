import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Bell, Shield, Settings, LogOut, Sparkles, ChevronRight, RotateCcw } from 'lucide-react';
import type { ChildProfile } from '../../lib/types';
import { getRankForElo } from '../../lib/types';
import { formatDate } from '../../lib/utils';

interface ProfileScreenProps {
  profile: ChildProfile;
  onLogout: () => void;
  onSwitchProfile: () => void;
}

const MENU_ITEMS = [
  { id: 'notifications', icon: Bell,     label: 'Notifications',     desc: 'Gérer les alertes' },
  { id: 'parental',      icon: Shield,   label: 'Contrôle Parental', desc: 'PIN & restrictions' },
  { id: 'settings',      icon: Settings, label: 'Paramètres',        desc: 'Langue, son, apparence' },
];

export default function ProfileScreen({ profile, onLogout, onSwitchProfile }: ProfileScreenProps) {
  const [hasLumios, setHasLumios] = useState(profile.hasLumios);
  const rank = getRankForElo(profile.elo);

  return (
    <div className="screen-wrapper">
      {/* Header Card */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-lumios p-5 mb-5 text-center relative overflow-hidden"
      >
        {/* Background gradient */}
        <div className="absolute inset-0 gradient-lumios opacity-5" />

        <div className="relative">
          {/* Avatar */}
          <motion.div
            whileTap={{ scale: 0.95 }}
            className="w-20 h-20 gradient-lumios rounded-3xl flex items-center justify-center text-5xl mx-auto mb-4 shadow-glow-blue animate-pulse-glow"
          >
            {profile.avatarEmoji || <User className="w-10 h-10 text-white" />}
          </motion.div>

          {/* Name and rank */}
          <h1 className="font-nunito font-black text-2xl mb-0.5">{profile.pseudo}</h1>
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-base">{rank.icon}</span>
            <span className="text-sm text-muted-foreground font-semibold">{rank.name}</span>
          </div>

          {/* Badges row */}
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span className="badge-lumios badge-blue">{profile.elo} ELO</span>
            <span className="badge-lumios badge-blue">{profile.ageRange} ans</span>
            <span className="badge-lumios" style={{ background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }}>{profile.city}</span>
          </div>

          <p className="text-xs text-muted-foreground mt-3">
            Membre depuis {formatDate(profile.createdAt)}
          </p>
        </div>
      </motion.div>

      {/* Lumios Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="card-lumios p-4 mb-5 flex items-center gap-3"
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center animate-pulse-glow-golden gradient-golden">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="font-nunito font-black text-sm">Je possède un Lumios</p>
          {hasLumios ? (
            <p className="text-xs text-muted-foreground">Badge doré actif ⚡</p>
          ) : (
            <p className="text-xs text-muted-foreground">Activez pour débloquer les fonctionnalités</p>
          )}
        </div>
        <motion.button
          onClick={() => setHasLumios(p => !p)}
          className={`w-14 h-7 rounded-full flex items-center transition-all ${hasLumios ? 'justify-end animate-pulse-glow-golden gradient-golden' : 'justify-start bg-muted'}`}
          style={{ padding: '3px' }}
        >
          <motion.div layout className="w-6 h-6 bg-white rounded-full shadow-sm flex items-center justify-center">
            {hasLumios && <Sparkles className="w-3 h-3 text-amber-500" />}
          </motion.div>
        </motion.button>
      </motion.div>

      {/* Menu Items */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="card-lumios mb-4 overflow-hidden"
      >
        {MENU_ITEMS.map((item, i) => (
          <motion.button
            key={item.id}
            whileTap={{ scale: 0.98 }}
            className={`w-full flex items-center gap-3 p-4 text-left transition-colors hover:bg-muted ${i < MENU_ITEMS.length - 1 ? 'border-b border-border' : ''}`}
          >
            <div className="w-9 h-9 bg-muted rounded-xl flex items-center justify-center">
              <item.icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-nunito font-bold text-sm">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </motion.button>
        ))}
      </motion.div>

      {/* Switch Profile */}
      <motion.button
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16 }}
        whileTap={{ scale: 0.97 }}
        className="btn-glass w-full py-3.5 mb-3"
        onClick={onSwitchProfile}
      >
        <RotateCcw className="w-4 h-4" />
        Changer de profil
      </motion.button>

      {/* Logout */}
      <motion.button
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        whileTap={{ scale: 0.97 }}
        onClick={onLogout}
        className="w-full py-3.5 rounded-xl font-nunito font-bold text-sm border-2 transition-all flex items-center justify-center gap-2"
        style={{ borderColor: 'hsl(var(--accent)/0.4)', color: 'hsl(var(--accent))' }}
      >
        <LogOut className="w-4 h-4" />
        Déconnexion
      </motion.button>

      {/* App version */}
      <p className="text-center text-xs text-muted-foreground mt-6">Lumios Play v1.0 · Mars 2026</p>
    </div>
  );
}
