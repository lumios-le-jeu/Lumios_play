import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Search, Navigation, Users, Filter, Loader2 } from 'lucide-react';
import type { ChildProfile } from '../../lib/types';
import { formatDistance } from '../../lib/utils';
import { getSocket } from '../../lib/socket';

interface FindGameModalProps {
  profile: ChildProfile;
  onClose: () => void;
}

// DEMO_GAMES removed
type GameFilter = 'all' | 'friends';

export default function FindGameModal({ profile, onClose }: FindGameModalProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<GameFilter>('all');
  const [joining, setJoining] = useState<string | null>(null);
  const [games, setGames] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [geoError, setGeoError] = useState('');

  useEffect(() => {
    const socket = getSocket();
    
    const handleLobbies = (list: any[]) => {
      // Map server lobby format to what UI expects
      const formatted = list.map(l => ({
        id: l.id,
        name: `Arène de ${l.hostPseudo}`,
        distance: 0.1, // Server doesn't send dist back yet
        playerCount: Object.keys(l.players).length,
        maxPlayers: l.maxPlayers,
        level: 'Tout niveau',
        status: l.status === 'playing' ? 'playing' : 'open',
        type: l.mode === 'arena' ? 'Arène' : 'Duel',
      }));
      setGames(formatted);
      setIsLoading(false);
    };
    
    socket.on('lobbies-list', handleLobbies);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          socket.emit('find-lobbies', { lat: pos.coords.latitude, lng: pos.coords.longitude, radius: 50 });
        },
        (err) => {
          console.error(err);
          setGeoError('Accès GPS refusé');
          setIsLoading(false);
        }
      );
    } else {
      setGeoError('GPS non supporté');
      setIsLoading(false);
    }

    return () => {
      socket.off('lobbies-list', handleLobbies);
    };
  }, []);

  const filtered = games.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleJoin = (id: string) => {
    setJoining(id);
    setTimeout(() => { onClose(); }, 1500);
  };

  return (
    <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="modal-sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 280 }} onClick={e => e.stopPropagation()} style={{ maxHeight: '88dvh' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'hsl(var(--lumios-green)/0.12)' }}>
              <Search className="w-5 h-5" style={{ color: 'hsl(var(--lumios-green))' }} />
            </div>
            <h3 className="font-nunito font-black text-lg">Trouver une Partie</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input className="input-lumios pl-9" placeholder="Rechercher une arène…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4">
          {(['all', 'friends'] as GameFilter[]).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${filter === f ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground'}`}>
              {f === 'all' ? '🌍 Toutes' : '👥 Amis'}
            </button>
          ))}
          <button className="ml-auto px-3 py-1.5 rounded-lg text-xs font-bold border border-border flex items-center gap-1 text-muted-foreground">
            <Filter className="w-3 h-3" /> Filtres
          </button>
        </div>

        {/* List */}
        <div className="flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: '50dvh' }}>
          {isLoading ? (
            <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : geoError ? (
            <div className="text-center py-10 text-muted-foreground p-4">
              <p className="font-semibold text-rose-500 mb-2">Erreur de localisation</p>
              <p className="text-sm">{geoError}. Veuillez autoriser la localisation pour trouver des arènes.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <p className="font-semibold">Aucune partie trouvée à proximité (50km).</p>
            </div>
          ) : filtered.map(game => (
            <motion.div key={game.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 p-3.5 card-lumios">
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${game.status === 'open' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <div className="flex-1 min-w-0">
                <p className="font-nunito font-bold text-sm truncate">{game.name}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                    <Users className="w-3 h-3" /> {game.playerCount}/{game.maxPlayers}
                  </span>
                  <span className="text-xs text-muted-foreground">· {game.level}</span>
                  <span className={`badge-lumios text-[10px] ${game.status === 'open' ? 'badge-green' : 'badge-red'}`}>
                    {game.status === 'open' ? 'Ouvert' : 'En cours'}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                  <Navigation className="w-3 h-3" /> {formatDistance(game.distance)}
                </span>
                {game.status === 'open' ? (
                  <button
                    onClick={() => handleJoin(game.id)}
                    className="px-3 py-1 rounded-lg text-xs font-bold text-white transition-all"
                    style={{ background: joining === game.id ? 'hsl(var(--lumios-green))' : 'hsl(var(--primary))' }}
                    disabled={!!joining}
                  >
                    {joining === game.id ? '✓ Rejoint' : 'Rejoindre'}
                  </button>
                ) : (
                  <span className="text-xs text-muted-foreground">Spectateur</span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
