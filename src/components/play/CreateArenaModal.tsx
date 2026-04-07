import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Users, ShieldCheck, Loader2, Check, Trophy } from 'lucide-react';
import type { ChildProfile } from '../../lib/types';
import { getSocket } from '../../lib/socket';

interface CreateArenaModalProps {
  profile: ChildProfile;
  onClose: () => void;
}

const LEVELS = ['Tout niveau', 'Argent+', 'Or+', 'Diatome+', 'Mythique+'];
const TYPES = ['Match libre', 'Tournoi rapide', 'Entraînement'];

export default function CreateArenaModal({ profile, onClose }: CreateArenaModalProps) {
  const [name, setName] = useState('');
  const [level, setLevel] = useState(LEVELS[0]);
  const [type, setType] = useState(TYPES[0]);
  const [publicArena, setPublicArena] = useState(true);
  const [step, setStep] = useState<'form' | 'lobby'>('form');
  const [isCreating, setIsCreating] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [lobbyId, setLobbyId] = useState('');
  const [playerCount, setPlayerCount] = useState(1);

  useEffect(() => {
    if (step === 'lobby') {
      const socket = getSocket();
      const handleJoined = (data: any) => {
        setPlayerCount(prev => prev + 1);
      };
      socket.on('player-joined', handleJoined);
      return () => { socket.off('player-joined', handleJoined); };
    }
  }, [step]);

  const handleCreate = () => {
    if (!name.trim()) return;
    setIsCreating(true);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const socket = getSocket();
          socket.emit('create-lobby', {
            hostProfileId: profile.id,
            hostPseudo: profile.pseudo,
            hostElo: profile.elo,
            hostRankTier: profile.rankTier,
            hostRankStep: profile.rankStep,
            mode: 'arena',
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            maxPlayers: 10,
            isPrivate: !publicArena,
          });
          
          socket.once('lobby-created', (id) => {
            setLobbyId(id);
            setIsCreating(false);
            setStep('lobby');
          });
        },
        (err) => {
          console.error(err);
          setGeoError('GPS désactivé. Autorisez la localisation.');
          setIsCreating(false);
        }
      );
    } else {
      setGeoError('GPS non supporté sur cet appareil.');
      setIsCreating(false);
    }
  };

  const handleCloseArena = () => {
    // Dans le futur, on pourrait émettre un event 'close-arena'
    onClose();
  };

  return (
    <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="modal-sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 280 }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'hsl(var(--lumios-red)/0.12)' }}>
              <MapPin className="w-5 h-5" style={{ color: 'hsl(var(--lumios-red))' }} />
            </div>
            <h3 className="font-nunito font-black text-lg">{step === 'form' ? 'Créer une Arène' : 'Arène Active'}</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {step === 'form' ? (
            <motion.div key="form" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1 block">Nom de l'arène</label>
                <input className="input-lumios" placeholder="ex: Arène du Parc Central" maxLength={40} value={name} onChange={e => setName(e.target.value)} />
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">Type de partie</label>
                <div className="flex flex-col gap-2">
                  {TYPES.map(t => (
                    <button key={t} onClick={() => setType(t)} className={`p-3 rounded-xl text-sm font-semibold text-left border-2 transition-all ${type === t ? 'border-accent bg-accent/5' : 'border-border bg-card'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted rounded-xl">
                <div>
                  <p className="font-semibold text-sm">Arène publique</p>
                  <p className="text-xs text-muted-foreground">Visible par tous les joueurs à proximité</p>
                </div>
                <motion.button onClick={() => setPublicArena(p => !p)} className={`w-12 h-6 rounded-full flex items-center transition-all ${publicArena ? 'gradient-lumios justify-end' : 'bg-border justify-start'}`} style={{ padding: '2px' }}>
                  <motion.div layout className="w-5 h-5 bg-white rounded-full shadow-sm" />
                </motion.button>
              </div>

              {geoError && <p className="text-xs text-rose-500 font-bold mt-1 text-center">{geoError}</p>}

              <button className="btn-accent w-full py-4 mt-2" onClick={handleCreate} disabled={isCreating}>
                {isCreating ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (
                  <><MapPin className="w-5 h-5" /> Créer l'arène</>
                )}
              </button>
            </motion.div>
          ) : (
            <motion.div key="lobby" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-6 py-4">
              <div className="w-20 h-20 rounded-3xl gradient-lumios-warm flex items-center justify-center animate-bounce-in shadow-lg">
                <MapPin className="w-10 h-10 text-white" />
              </div>
              
              <div className="text-center">
                <h4 className="font-nunito font-black text-2xl mb-1">{name}</h4>
                <div className="flex items-center justify-center gap-2 text-primary font-bold">
                  <span className="px-2 py-0.5 bg-primary/10 rounded-lg text-primary text-xs">CODE: {lobbyId}</span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">{type}</span>
                </div>
              </div>

              <div className="w-full grid grid-cols-2 gap-3">
                <div className="p-4 bg-muted rounded-2xl text-center">
                  <Users className="w-5 h-5 mx-auto mb-1 text-primary" />
                  <p className="text-xl font-black">{playerCount}</p>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Joueurs</p>
                </div>
                <div className="p-4 bg-muted rounded-2xl text-center">
                  <Trophy className="w-5 h-5 mx-auto mb-1 text-amber-500" />
                  <p className="text-xl font-black">0</p>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Matchs</p>
                </div>
              </div>

              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl w-full flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-xs font-medium text-emerald-800">L'arène est ouverte et visible sur la carte.</p>
              </div>

              <button className="btn-accent w-full py-4 text-lg" onClick={handleCloseArena}>
                🛑 Fermer l'Arène
              </button>
              <p className="text-[10px] text-muted-foreground italic text-center px-6">
                En fermant l'arène, vous déconnectez tous les joueurs et arrêtez les matchs en cours.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
