import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, X, Trophy, ChevronRight } from 'lucide-react';
import type { GuestProfile } from '../../lib/types';

interface GuestConversionModalProps {
  guest: GuestProfile;
  xpEarned: number;
  won: boolean;
  onCreateAccount: (pseudo: string) => void;
  onDismiss: () => void;
}

export default function GuestConversionModal({ guest, xpEarned, won, onCreateAccount, onDismiss }: GuestConversionModalProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      className="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onDismiss}
    >
      <motion.div
        className="modal-sheet"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl gradient-lumios flex items-center justify-center">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-nunito font-black text-lg">Bravo {guest.pseudo} !</h3>
          </div>
          <button onClick={onDismiss} className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Result */}
        <div className="flex flex-col items-center gap-4 py-4">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="text-6xl"
          >
            {won ? '🏆' : '👏'}
          </motion.div>

          <div className="text-center">
            <h4 className="font-nunito font-black text-2xl mb-2">
              {won ? 'Victoire !' : 'Belle partie !'}
            </h4>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-2xl">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <span className="font-nunito font-black text-emerald-600">+{xpEarned} XP</span>
            </div>
          </div>

          {/* CTA */}
          <div className="w-full space-y-3 mt-2">
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl text-center">
              <p className="text-sm font-bold mb-1">
                Crée ton compte pour conserver tes <strong className="text-primary">{xpEarned} XP</strong>
              </p>
              <p className="text-xs text-muted-foreground">
                et monter en <strong>Bronze 4</strong> dès maintenant !
              </p>
            </div>

            <motion.button
              className="btn-primary w-full py-4 text-base"
              whileTap={{ scale: 0.97 }}
              onClick={() => onCreateAccount(guest.pseudo)}
            >
              <Sparkles className="w-5 h-5" />
              Créer mon compte en 1 clic
              <ChevronRight className="w-5 h-5" />
            </motion.button>

            <button
              className="w-full py-3 text-sm text-muted-foreground font-semibold"
              onClick={onDismiss}
            >
              Peut-être plus tard
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
