import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, UserPlus, QrCode, MessageSquare, Swords, Wifi, WifiOff, Loader2 } from 'lucide-react';
import type { ChildProfile, Friend } from '../../lib/types';
import { getFriends } from '../../lib/api';

const QUICK_MESSAGES = ['Bien joué ! 👏', 'Revanche ? 🔄', 'On arrive au parc 🏃', 'GG ! 🎉', 'Tu joues ? ⚡'];

// Removed DEMO_FRIENDS

interface FriendsScreenProps {
  profile: ChildProfile;
}

type FriendFilter = 'all' | 'online';

export default function FriendsScreen({ profile }: FriendsScreenProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FriendFilter>('all');
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [sentMessage, setSentMessage] = useState('');
  const [friendsList, setFriendsList] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchFr() {
      const { data } = await getFriends(profile.id);
      setFriendsList(data);
      setIsLoading(false);
    }
    fetchFr();
  }, [profile.id]);

  const filtered = friendsList.filter(f => {
    const matchesSearch = f.pseudo.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || f.isOnline;
    return matchesSearch && matchesFilter;
  });

  const onlineCount = friendsList.filter(f => f.isOnline).length;

  return (
    <div className="screen-wrapper">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
        <h1 className="font-nunito font-black text-2xl mb-0.5">Amis</h1>
        <p className="text-muted-foreground text-sm">{onlineCount} en ligne · {friendsList.length} total</p>
      </motion.div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input className="input-lumios pl-9" placeholder="Rechercher un ami…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Filters + Add */}
      <div className="flex items-center gap-2 mb-5">
        {(['all', 'online'] as FriendFilter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${filter === f ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground'}`}
          >
            {f === 'all' ? 'Tous' : '🟢 En ligne'}
          </button>
        ))}
        <div className="flex gap-2 ml-auto">
          <button className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-all">
            <QrCode className="w-4 h-4" />
          </button>
          <button className="w-9 h-9 rounded-xl gradient-lumios flex items-center justify-center text-white shadow-sm">
            <UserPlus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Friend List */}
      <div className="flex flex-col gap-2">
        {isLoading ? (
          <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <p className="text-3xl mb-2">🔍</p>
            <p className="font-semibold">Aucun ami trouvé</p>
          </div>
        ) : filtered.map((friend, i) => (
          <motion.button
            key={friend.id}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedFriend(friend)}
            className="w-full flex items-center gap-3 p-3.5 card-lumios card-lumios-hover text-left"
          >
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-12 h-12 gradient-lumios rounded-2xl flex items-center justify-center text-2xl">
                {friend.avatarEmoji}
              </div>
              {/* Online indicator */}
              <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card ${friend.isOnline ? 'bg-emerald-400' : 'bg-muted-foreground/40'}`} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-nunito font-black text-sm">{friend.pseudo}</span>
                {friend.hasLumios && <span className="badge-lumios badge-golden text-[10px] px-1.5 py-0.5">⚡</span>}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-muted-foreground">{friend.city}</span>
                <span className="text-xs font-bold" style={{ color: 'hsl(var(--primary))' }}>⭐ {friend.elo}</span>
              </div>
            </div>

            {/* Online status */}
            <div className="flex items-center gap-1 text-muted-foreground">
              {friend.isOnline
                ? <><Wifi className="w-3.5 h-3.5 text-emerald-400" /><span className="text-xs text-emerald-500 font-semibold">En ligne</span></>
                : <WifiOff className="w-3.5 h-3.5" />
              }
            </div>
          </motion.button>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">
            <p className="text-3xl mb-2">🔍</p>
            <p className="font-semibold">Aucun ami trouvé</p>
          </div>
        )}
      </div>

      {/* Friend Action Sheet */}
      <AnimatePresence>
        {selectedFriend && (
          <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setSelectedFriend(null); setSentMessage(''); }}>
            <motion.div className="modal-sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 280 }} onClick={e => e.stopPropagation()}>
              {/* Profile */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 gradient-lumios rounded-2xl flex items-center justify-center text-3xl">
                  {selectedFriend.avatarEmoji}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-nunito font-black text-xl">{selectedFriend.pseudo}</span>
                    {selectedFriend.hasLumios && <span className="badge-lumios badge-golden">⚡ Lumios</span>}
                  </div>
                  <p className="text-muted-foreground text-sm">{selectedFriend.city} · {selectedFriend.elo} ELO</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <div className={`w-2 h-2 rounded-full ${selectedFriend.isOnline ? 'bg-emerald-400' : 'bg-muted-foreground/40'}`} />
                    <span className={`text-xs font-semibold ${selectedFriend.isOnline ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                      {selectedFriend.isOnline ? 'En ligne' : 'Hors ligne'}
                    </span>
                  </div>
                </div>
              </div>
              {/* Actions */}
              <div className="flex gap-3 mb-5">
                <button className="btn-primary flex-1 py-3">
                  <Swords className="w-5 h-5" /> Défier
                </button>
                <button className="btn-outline flex-1 py-3">
                  <MessageSquare className="w-5 h-5" /> Message
                </button>
              </div>

              {/* Quick Messages */}
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Messages rapides</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_MESSAGES.map(msg => (
                  <motion.button
                    key={msg}
                    whileTap={{ scale: 0.93 }}
                    onClick={() => setSentMessage(msg)}
                    className={`text-sm px-3 py-2 rounded-xl border transition-all font-medium ${sentMessage === msg ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-card text-foreground'}`}
                  >
                    {msg}
                  </motion.button>
                ))}
              </div>
              {sentMessage && (
                <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-center text-sm text-muted-foreground mt-3">
                  ✅ Message envoyé à {selectedFriend.pseudo}
                </motion.p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
