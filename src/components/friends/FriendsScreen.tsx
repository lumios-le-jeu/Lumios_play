import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, UserPlus, QrCode, Swords, Wifi, WifiOff, Loader2, Check, X, Crown, TrendingUp } from 'lucide-react';
import type { ChildProfile, Friend } from '../../lib/types';
import { getTierConfig } from '../../lib/types';
import { getRankDisplayName } from '../../lib/ranking';
import { getFriends, searchProfiles, addFriend, getPendingFriendRequests, acceptFriendRequest, declineFriendRequest } from '../../lib/api';

// #11 — Suppression des messages rapides et du bouton Message

interface FriendsScreenProps {
  profile: ChildProfile;
}

type FriendFilter = 'all' | 'online';

export default function FriendsScreen({ profile }: FriendsScreenProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FriendFilter>('all');
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [friendsList, setFriendsList] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [globalResults, setGlobalResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [addRequestSent, setAddRequestSent] = useState<string | null>(null);

  const loadFriends = async () => {
    const [{ data: friends }, { data: pending }] = await Promise.all([
      getFriends(profile.id),
      getPendingFriendRequests(profile.id),
    ]);
    setFriendsList(friends);
    setPendingRequests(pending);
    setIsLoading(false);
  };

  useEffect(() => {
    loadFriends();
  }, [profile.id]);

  // #12 — Envoyer une demande (pending)
  const handleAddFriend = async (friendId: string) => {
    await addFriend(profile.id, friendId);
    setAddRequestSent(friendId);
    setSearch('');
    setGlobalResults([]);
  };

  // #12 — Accepter une demande
  const handleAccept = async (requesterId: string) => {
    await acceptFriendRequest(profile.id, requesterId);
    await loadFriends();
  };

  // #12 — Refuser une demande
  const handleDecline = async (requesterId: string) => {
    await declineFriendRequest(profile.id, requesterId);
    setPendingRequests(prev => prev.filter(r => r.id !== requesterId));
  };

  useEffect(() => {
    if (search.length < 2) { setGlobalResults([]); return; }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      const { data } = await searchProfiles(search, profile.id);
      const filtered = (data || []).filter((u: any) => !friendsList.find(f => f.id === u.id));
      setGlobalResults(filtered);
      setIsSearching(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [search, profile.id, friendsList]);

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

      {/* #12 — Demandes reçues */}
      {pendingRequests.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 px-1">
            Demandes d'ami ({pendingRequests.length})
          </p>
          <div className="flex flex-col gap-2">
            {pendingRequests.map(req => {
              const tierCfg = getTierConfig(req.rankTier || 'bronze');
              const rankName = getRankDisplayName(req.rankTier || 'bronze', req.rankStep ?? 0);
              return (
                <div key={req.id} className="flex items-center gap-3 p-3 card-lumios border-primary/20 bg-primary/3">
                  <div className="w-10 h-10 gradient-lumios rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                    {req.avatarEmoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-nunito font-bold text-sm">{req.pseudo}</p>
                    <div className="flex items-center gap-1">
                      <span className="text-xs">{tierCfg.icon}</span>
                      <span className="text-[10px] font-semibold" style={{ color: tierCfg.color }}>{rankName}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDecline(req.id)}
                      className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleAccept(req.id)}
                      className="w-8 h-8 rounded-lg gradient-lumios flex items-center justify-center text-white shadow-sm"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input className="input-lumios pl-9" placeholder="Rechercher un ami…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Filters + QR */}
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
        ) : filtered.map((friend, i) => {
          const tierCfg = getTierConfig(friend.rankTier || 'bronze');
          const rankName = getRankDisplayName(friend.rankTier || 'bronze', friend.rankStep ?? 0);
          return (
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
                <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card ${friend.isOnline ? 'bg-emerald-400' : 'bg-muted-foreground/40'}`} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-nunito font-black text-sm">{friend.pseudo}</span>
                  {friend.hasLumios && <span className="badge-lumios badge-golden text-[10px] px-1.5 py-0.5">⚡</span>}
                </div>
                {/* #10 — Rang tiered au lieu de l'ELO */}
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs">{tierCfg.icon}</span>
                  <span className="text-[10px] font-semibold" style={{ color: tierCfg.color }}>{rankName}</span>
                  {(friend as any).matchCount > 0 && (
                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                      {(friend as any).matchCount} parties
                    </span>
                  )}
                </div>
              </div>

              {/* Online status */}
              <div className="flex items-center gap-1 text-muted-foreground flex-shrink-0">
                {friend.isOnline
                  ? <><Wifi className="w-3.5 h-3.5 text-emerald-400" /><span className="text-xs text-emerald-500 font-semibold">En ligne</span></>
                  : <WifiOff className="w-3.5 h-3.5" />
                }
              </div>
            </motion.button>
          );
        })}

        {/* Global Search Results */}
        {search.length >= 2 && (
          <div className="mt-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 px-1">Résultats Globaux</h3>
            {isSearching ? (
              <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : globalResults.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center p-4 italic">Aucun autre utilisateur trouvé</p>
            ) : (
              <div className="flex flex-col gap-2">
                {globalResults.map(user => {
                  const tierCfg = getTierConfig(user.rank_tier || 'bronze');
                  const rankName = getRankDisplayName(user.rank_tier || 'bronze', user.rank_step ?? 0);
                  const isRequested = addRequestSent === user.id;
                  return (
                    <div key={user.id} className="w-full flex items-center gap-3 p-3 card-lumios bg-card/40">
                      <div className="w-10 h-10 gradient-lumios rounded-xl flex items-center justify-center text-xl">
                        {user.avatar_emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-nunito font-bold text-sm">{user.pseudo}</p>
                        {/* #10 — Rang tiered */}
                        <div className="flex items-center gap-1">
                          <span className="text-xs">{tierCfg.icon}</span>
                          <span className="text-[10px] font-semibold" style={{ color: tierCfg.color }}>{rankName}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => !isRequested && handleAddFriend(user.id)}
                        disabled={isRequested}
                        className={`py-1.5 px-3 text-xs rounded-xl font-nunito font-bold flex items-center gap-1 transition-all ${isRequested ? 'bg-muted text-muted-foreground' : 'btn-primary'}`}
                      >
                        {isRequested ? <><Check className="w-3.5 h-3.5" /> Demande envoyée</> : <><UserPlus className="w-3.5 h-3.5" /> Ajouter</>}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* #12 — Fiche ami complète (sans ELO, sans messages) */}
      <AnimatePresence>
        {selectedFriend && (
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSelectedFriend(null)}
          >
            <motion.div
              className="modal-sheet"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              onClick={e => e.stopPropagation()}
            >
              {/* Profil complet */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 gradient-lumios rounded-2xl flex items-center justify-center text-3xl">
                  {selectedFriend.avatarEmoji}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-nunito font-black text-xl">{selectedFriend.pseudo}</span>
                    {selectedFriend.hasLumios && <span className="badge-lumios badge-golden">⚡ Lumios</span>}
                  </div>
                  {/* #10 — Rang (pas ELO) */}
                  {(() => {
                    const tierCfg = getTierConfig(selectedFriend.rankTier || 'bronze');
                    const rankName = getRankDisplayName(selectedFriend.rankTier || 'bronze', selectedFriend.rankStep ?? 0);
                    return (
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-base">{tierCfg.icon}</span>
                        <span className="font-nunito font-bold text-sm" style={{ color: tierCfg.color }}>{rankName}</span>
                      </div>
                    );
                  })()}
                  <div className="flex items-center gap-1 mt-1">
                    <div className={`w-2 h-2 rounded-full ${selectedFriend.isOnline ? 'bg-emerald-400' : 'bg-muted-foreground/40'}`} />
                    <span className={`text-xs font-semibold ${selectedFriend.isOnline ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                      {selectedFriend.isOnline ? 'En ligne' : 'Hors ligne'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats de l'ami */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="p-3 rounded-2xl bg-muted/50 text-center">
                  <Crown className="w-4 h-4 mx-auto mb-1 text-amber-500" />
                  <p className="font-nunito font-black text-sm">
                    {(() => {
                      const tierCfg = getTierConfig(selectedFriend.rankTier || 'bronze');
                      return <span style={{ color: tierCfg.color }}>{tierCfg.icon} {getRankDisplayName(selectedFriend.rankTier || 'bronze', selectedFriend.rankStep ?? 0)}</span>;
                    })()}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold mt-0.5">Rang actuel</p>
                </div>
                <div className="p-3 rounded-2xl bg-muted/50 text-center">
                  <TrendingUp className="w-4 h-4 mx-auto mb-1 text-primary" />
                  <p className="font-nunito font-black text-sm text-primary">
                    {(selectedFriend as any).matchCount ?? 0}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold mt-0.5">Parties jouées</p>
                </div>
              </div>

              {/* Action : Défier uniquement (#11 — pas de message) */}
              <button className="btn-primary w-full py-3">
                <Swords className="w-5 h-5" /> Défier
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
