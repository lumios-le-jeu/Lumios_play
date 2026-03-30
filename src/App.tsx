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
import type { ChildProfile, ParentAccount } from './lib/types';
import { getProfilesForParent } from './lib/api';
import { Loader2 } from 'lucide-react';

export type AppScreen = 'play' | 'friends' | 'dashboard' | 'leaderboard' | 'profile';
type AuthState = 'landing' | 'parent-auth' | 'profile-select' | 'app';

// ─── Demo Data ─────────────────────────────────────────────────────────────────
// Removed DEMO DATA


export default function App() {
  const [authState, setAuthState] = useState<AuthState>('landing');
  const [activeScreen, setActiveScreen] = useState<AppScreen>('play');
  const [parent, setParent] = useState<ParentAccount | null>(null);
  const [profiles, setProfiles] = useState<ChildProfile[]>([]);
  const [currentProfile, setCurrentProfile] = useState<ChildProfile | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  const handleAuthComplete = async (p: ParentAccount) => {
    setParent(p);
    setIsFetching(true);
    const { data } = await getProfilesForParent(p.id);
    setProfiles(data);
    setIsFetching(false);
    setAuthState('profile-select');
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
    setAuthState('landing');
  };

  const handleSwitchProfile = () => {
    setCurrentProfile(null);
    setAuthState('profile-select');
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
    return <AuthScreen onAuthComplete={handleAuthComplete} />;
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

  // ── MAIN APP ──────────────────────────────────────────────────────────────
  const screens: Record<AppScreen, React.ReactNode> = {
    play:        <PlayScreen profile={currentProfile} />,
    friends:     <FriendsScreen profile={currentProfile} />,
    dashboard:   <DashboardScreen profile={currentProfile} />,
    leaderboard: <LeaderboardScreen profile={currentProfile} />,
    profile:     <ProfileScreen profile={currentProfile} onLogout={handleLogout} onSwitchProfile={handleSwitchProfile} />,
  };

  return (
    <div className="flex flex-col min-h-dvh gradient-background">
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
      <BottomNav activeScreen={activeScreen} onNavigate={setActiveScreen} />
    </div>
  );
}
