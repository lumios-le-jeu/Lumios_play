import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import AuthScreen from './components/auth/AuthScreen';
import ProfileSelector from './components/auth/ProfileSelector';
import BottomNav from './components/nav/BottomNav';
import PlayScreen from './components/play/PlayScreen';
import FriendsScreen from './components/friends/FriendsScreen';
import DashboardScreen from './components/dashboard/DashboardScreen';
import LeaderboardScreen from './components/leaderboard/LeaderboardScreen';
import ProfileScreen from './components/profile/ProfileScreen';
import type { ChildProfile, ParentAccount, GuestProfile } from './lib/types';
import { getProfilesForParent } from './lib/api';
import { Loader2 } from 'lucide-react';

export type AppScreen = 'play' | 'friends' | 'leaderboard' | 'profile';
type AuthState = 'landing' | 'parent-auth' | 'profile-select' | 'guest' | 'app';

export default function App() {
  const [authState, setAuthState] = useState<AuthState>('landing');
  const [activeScreen, setActiveScreen] = useState<AppScreen>('play');
  const [parent, setParent] = useState<ParentAccount | null>(null);
  const [profiles, setProfiles] = useState<ChildProfile[]>([]);
  const [currentProfile, setCurrentProfile] = useState<ChildProfile | null>(null);
  const [guestProfile, setGuestProfile] = useState<GuestProfile | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  const handleAuthComplete = async (p: ParentAccount) => {
    setParent(p);
    setIsFetching(true);
    const { data } = await getProfilesForParent(p.id);
    setProfiles(data);
    setIsFetching(false);

    // Individuel avec 1 seul profil → accès direct
    if (p.accountType === 'individual' && data.length === 1) {
      setCurrentProfile(data[0]);
      setAuthState('app');
    } else {
      setAuthState('profile-select');
    }
  };

  const handleGuestStart = (guest: GuestProfile) => {
    setGuestProfile(guest);
    // Créer un profil "fake" pour le mode invité
    setCurrentProfile({
      id: guest.tempId,
      parentId: '',
      pseudo: guest.pseudo,
      avatarEmoji: guest.avatarEmoji,
      ageRange: '18+',
      hasLumios: false,
      elo: 800,
      city: 'Invité',
      createdAt: new Date().toISOString(),
      rankTier: 'bronze',
      rankStep: 0,
      seasonXp: 0,
      winStreak: 0,
      accountType: 'individual',
    });
    setAuthState('guest');
  };

  const handleProfileSelect = (profile: ChildProfile) => {
    setCurrentProfile(profile);
    setAuthState('app');
  };

  const handleAddProfile = (profile: ChildProfile) => {
    setProfiles(prev => [...prev, profile]);
  };

  const handleLogout = () => {
    setCurrentProfile(null);
    setParent(null);
    setGuestProfile(null);
    setAuthState('landing');
  };

  const handleSwitchProfile = () => {
    setCurrentProfile(null);
    setAuthState('profile-select');
  };

  const handleGuestConvert = () => {
    // Retour au landing pour créer un compte
    setGuestProfile(null);
    setCurrentProfile(null);
    setAuthState('landing');
  };

  const refreshCurrentProfile = async () => {
    if (!currentProfile || !parent) return;
    const { data } = await getProfilesForParent(parent.id);
    const updated = data.find(p => p.id === currentProfile.id);
    if (updated) {
      setCurrentProfile(updated);
      setProfiles(data);
    }
  };

  // ── Transition variants ────────────────────────────────────────────────────
  const pageVariants = {
    initial: { opacity: 0, x: 24 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -24 },
  };

  const transition: any = { duration: 0.22, ease: [0.4, 0, 0.2, 1] };

  // ── AUTH FLOW ─────────────────────────────────────────────────────────────
  if (authState === 'landing') {
    return (
      <AuthScreen
        onAuthComplete={handleAuthComplete}
        onGuestStart={handleGuestStart}
      />
    );
  }

  if (authState === 'profile-select') {
    if (isFetching) {
      return (
        <div className="min-h-dvh gradient-background flex flex-col items-center justify-center text-primary">
          <Loader2 className="w-10 h-10 animate-spin mb-4" />
          <p className="font-nunito font-bold">Chargement des profils...</p>
        </div>
      );
    }

    return (
      <ProfileSelector
        parent={parent!}
        profiles={profiles}
        onSelectProfile={handleProfileSelect}
        onAddProfile={handleAddProfile}
      />
    );
  }

  if (!currentProfile) return null;

  const isGuest = authState === 'guest';

  // ── MAIN APP ──────────────────────────────────────────────────────────────
  // En mode invité, accès limité : seulement Play
  const screens: Record<AppScreen, React.ReactNode> = {
    play: <PlayScreen
      profile={currentProfile}
      onRefreshProfile={refreshCurrentProfile}
      isGuest={isGuest}
    />,
    friends: isGuest
      ? <GuestLockScreen onCreateAccount={handleGuestConvert} />
      : <FriendsScreen profile={currentProfile} onRefreshProfile={refreshCurrentProfile} />,
    leaderboard: isGuest
      ? <GuestLockScreen onCreateAccount={handleGuestConvert} />
      : <LeaderboardScreen profile={currentProfile} onRefreshProfile={refreshCurrentProfile} />,
    profile: isGuest
      ? <GuestLockScreen onCreateAccount={handleGuestConvert} />
      : <ProfileScreen profile={currentProfile} onLogout={handleLogout} onSwitchProfile={handleSwitchProfile} parentAccount={parent || undefined} familyProfiles={profiles} onSelectProfile={handleProfileSelect} />,
  };

  return (
    <div className="flex flex-col min-h-dvh gradient-background">
      {/* Guest banner */}
      {isGuest && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between"
        >
          <p className="text-xs font-bold text-amber-800">
            🎮 Mode Invité — Créez un compte pour sauvegarder
          </p>
          <button
            onClick={handleGuestConvert}
            className="text-xs font-black text-primary bg-primary/10 px-2 py-1 rounded-lg"
          >
            Créer
          </button>
        </motion.div>
      )}

      {/* Main content area */}
      <main className="flex-1 overflow-y-auto" style={{ paddingBottom: '5rem' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeScreen}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={transition}
            className="min-h-full"
          >
            {screens[activeScreen]}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Nav */}
      <BottomNav activeScreen={activeScreen} onNavigate={setActiveScreen} isGuest={isGuest} />
    </div>
  );
}

/** Écran affiché aux invités pour les sections verrouillées */
function GuestLockScreen({ onCreateAccount }: { onCreateAccount: () => void }) {
  return (
    <div className="screen-wrapper flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="text-6xl"
      >
        🔒
      </motion.div>
      <h2 className="font-nunito font-black text-xl text-center">Section réservée</h2>
      <p className="text-sm text-muted-foreground text-center px-8">
        Créez un compte gratuit pour accéder à vos stats, amis et classement.
      </p>
      <motion.button
        whileTap={{ scale: 0.97 }}
        className="btn-primary py-3 px-6"
        onClick={onCreateAccount}
      >
        Créer mon compte 🚀
      </motion.button>
    </div>
  );
}
