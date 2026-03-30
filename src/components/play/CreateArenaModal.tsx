import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, MapPin, Users, ShieldCheck, Loader2 } from 'lucide-react';
import type { ChildProfile } from '../../lib/types';
import { getSocket } from '../../lib/socket';

interface CreateArenaModalProps {
  profile: ChildProfile;
  onClose: () => void;
}

const LEVELS = ['Tout niveau', '500+ ELO', '800+ ELO', '1100+ ELO'];
const TYPES = ['Match libre', 'Tournoi rapide', 'Entraînement'];

export default function CreateArenaModal({ profile, onClose }: CreateArenaModalProps) {
  const [name, setName] = useState('');
  const [level, setLevel] = useState(LEVELS[0]);
  const [type, setType] = useState(TYPES[0]);
  const [publicArena, setPublicArena] = useState(true);
  const [created, setCreated] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [geoError, setGeoError] = useState('');

  const handleCreate = () => {
    if (!name.trim()) return;
    setIsCreating(true);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const socket = getSocket();
          socket.emit('create-lobby', {
            hostId: profile.id,
            hostPseudo: profile.pseudo,
            mode: 'arena',
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            maxPlayers: 10,
            isPrivate: !publicArena,
          });
          
          socket.once('lobby-created', (lobbyId) => {
            setIsCreating(false);
            setCreated(true);
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

  return (
    <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="modal-sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 280 }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'hsl(var(--lumios-red)/0.12)' }}>
              <MapPin className="w-5 h-5" style={{ color: 'hsl(var(--lumios-red))' }} />
            </div>
            <h3 className="font-nunito font-black text-lg">Créer une Arène</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {!created ? (
          <div className="flex flex-col gap-4">
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

            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">Niveau requis</label>
              <div className="flex flex-wrap gap-2">
                {LEVELS.map(l => (
                  <button key={l} onClick={() => setLevel(l)} className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all ${level === l ? 'border-primary bg-primary/5' : 'border-border'}`}>
                    {l}
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

            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
              Les inconnus doivent d'abord être validés par un parent pour rejoindre.
            </p>

            {geoError && <p className="text-xs text-rose-500 font-bold mt-1 text-center">{geoError}</p>}

            <button className="btn-accent w-full py-4 mt-2" onClick={handleCreate} disabled={isCreating}>
              {isCreating ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (
                <><MapPin className="w-5 h-5" /> Créer l'arène</>
              )}
            </button>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4 py-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center animate-bounce-in" style={{ background: 'hsl(var(--lumios-red)/0.12)' }}>
              <MapPin className="w-8 h-8" style={{ color: 'hsl(var(--lumios-red))' }} />
            </div>
            <div className="text-center">
              <h4 className="font-nunito font-black text-xl">Arène créée !</h4>
              <p className="font-bold mt-1">{name}</p>
              <p className="text-muted-foreground text-sm mt-1">En attente de joueurs…</p>
            </div>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-xl">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">1 / ∞ joueurs</span>
            </div>
            <button className="btn-glass w-full py-3" onClick={onClose}>Fermer</button>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
