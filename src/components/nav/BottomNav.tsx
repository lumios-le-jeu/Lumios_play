import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Users, LayoutDashboard, Trophy, User } from 'lucide-react';
import type { AppScreen } from '../../App';

const TABS: { id: AppScreen; label: string; Icon: React.ElementType }[] = [
  { id: 'play',        label: 'Jouer',  Icon: Swords        },
  { id: 'friends',     label: 'Amis',   Icon: Users         },
  { id: 'dashboard',   label: 'Stats',  Icon: LayoutDashboard },
  { id: 'leaderboard', label: 'Rang',   Icon: Trophy        },
  { id: 'profile',     label: 'Compte', Icon: User          },
];

interface BottomNavProps {
  activeScreen: AppScreen;
  onNavigate: (screen: AppScreen) => void;
}

export default function BottomNav({ activeScreen, onNavigate }: BottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[512px] pb-safe z-40"
      style={{
        background: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid hsl(var(--border))',
      }}
    >
      <div className="flex items-stretch h-16">
        {TABS.map(tab => {
          const isActive = activeScreen === tab.id;
          return (
            <motion.button
              key={tab.id}
              onClick={() => onNavigate(tab.id)}
              whileTap={{ scale: 0.88 }}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 relative outline-none"
            >
              {/* Active indicator */}
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] gradient-lumios rounded-b-full"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}

              <motion.div
                animate={{
                  scale: isActive ? 1.15 : 1,
                  y: isActive ? -1 : 0,
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                <tab.Icon
                  className="w-5 h-5 transition-colors"
                  style={{
                    color: isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                  }}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
              </motion.div>

              <span
                className="text-[10px] font-bold transition-colors"
                style={{
                  color: isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                  fontFamily: 'Nunito, sans-serif',
                }}
              >
                {tab.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
