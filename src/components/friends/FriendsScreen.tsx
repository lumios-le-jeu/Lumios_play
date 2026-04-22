import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, UserPlus, QrCode, Swords, Wifi, WifiOff, Loader2, Check, X, Crown, TrendingUp, Zap } from 'lucide-react';
import type { ChildProfile, Friend } from '../../lib/types';
import { getTierConfig } from '../../lib/types';
import { getRankDisplayName } from '../../lib/ranking';
import { getFriends, searchProfiles, addFriend, getPendingFriendRequests, acceptFriendRequest, declineFriendRequest } from '../../lib/api';
import FriendDuelModal from '../play/FriendDuelModal';

// #11 — Suppression des messages rapides et du bouton Message

interface FriendsScreenProps {
  profile: ChildProfile;
  onRefreshProfile?: () => Promise<void>;
}

type FriendFilter = 'all' | 'online';

export default function FriendsScreen({ profile, onRefreshProfile }: FriendsScreenProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FriendFilter>('all');
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [friendsList, setFriendsList] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [globalResults, setGlobalResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [addRequestSent, setAddRequestSent] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showDuelModal, setShowDuelModal] = useState(false);

  // ── Scanner QR Code d'ajout d'ami ──
  useEffect(() => {
    if (!showScanner) return;
    let html5QrCode: any = null;

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        const element = document.getElementById('friend-qr-scanner-div');
        if (!element) return;
        html5QrCode = new Html5Qrcode('friend-qr-scanner-div');

        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText: string) => {
            html5QrCode.stop().then(async () => {
              setShowScanner(false);
              try {
                const data = JSON.parse(decodedText);
                if (data.type === 'add-friend' && data.profileId) {
                  if (data.profileId !== profile.id) {
                    await handleAddFriend(data.profileId);
                    alert(`Demande d'ami envoyée à ${data.pseudo || 'ce joueur'} !`);
                  } else {
                    alert("Vous ne pouvez pas vous ajouter vous-même !");
                  }
                } else {
                  alert('Ce QR Code n\'est pas un profil Lumios Play.');
                }
              } catch (err) {
                alert('Format de QR Code invalide.');
              }
            }).catch(() => {});
          }
        );
      } catch (err: any) {
        if (err?.toString().includes('NotAllowedError')) {
          alert('Accès caméra refusé.');
        }
      }
    };

    const timer = setTimeout(startScanner, 200);
    return () => {
      clearTimeout(timer);
      if (html5QrCode?.isScanning) html5QrCode.stop().catch(() => {});
    };
  }, [showScanner, profile.id]);

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
    const success = await addFriend(profile.id, friendId);
    if (success) {
      setAddRequestSent(friendId);
      // Recharger la liste après un court délai
      setTimeout(() => loadFriends(), 1000);
    } else {
      console.error('[FriendsScreen] addFriend failed for', friendId);
    }
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
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input className="input-lumios pl-9 w-full" placeholder="Rechercher un ami…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button
          onClick={() => setShowScanner(true)}
          className="w-12 h-12 flex-shrink-0 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all shadow-sm border border-border"
        >
          <QrCode className="w-5 h-5" />
        </button>
      </div>

      {/* Filters */}
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
      </div>

      {/* Friend List */}
      <div className="flex flex-col gap-2">
        {isLoading ? (
          <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : search.length >= 2 ? (
          // En mode recherche : afficher uniquement les amis qui correspondent
          filtered.length > 0 ? (
            filtered.map((friend, i) => {
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
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 gradient-lumios rounded-2xl flex items-center justify-center text-2xl">
                      {friend.avatarEmoji}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card ${friend.isOnline ? 'bg-emerald-400' : 'bg-muted-foreground/40'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-nunito font-black text-sm">{friend.pseudo}</span>
                      {(friend as any).isFamily && (
                        <span className="badge-lumios badge-blue text-[9px] px-1.5 py-0.5">👨‍👩‍👧 Famille</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs">{tierCfg.icon}</span>
                      <span className="text-[10px] font-semibold" style={{ color: tierCfg.color }}>{rankName}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground flex-shrink-0">
                    {friend.isOnline
                      ? <><Wifi className="w-3.5 h-3.5 text-emerald-400" /><span className="text-xs text-emerald-500 font-semibold">En ligne</span></>
                      : <WifiOff className="w-3.5 h-3.5" />
                    }
                  </div>
                </motion.button>
              );
            })
          ) : null // pas de message 'aucun ami' quand les résultats globaux sont affichés
        ) : friendsList.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <p className="text-3xl mb-2">👥</p>
            <p className="font-semibold">Aucun ami pour l'instant</p>
            <p className="text-sm mt-1">Recherchez des joueurs ou scannez un QR Code</p>
          </div>
        ) : (
          filtered.map((friend, i) => {
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
                    {(friend as any).isFamily && (
                      <span className="badge-lumios badge-blue text-[9px] px-1.5 py-0.5">👨‍👩‍👧 Famille</span>
                    )}
                    <div className="flex items-center gap-0.5 text-amber-500 font-black text-[10px] bg-amber-50 px-1.5 py-0.5 rounded-lg border border-amber-200">
                      <Zap className="w-2.5 h-2.5 fill-amber-500" />
                      {friend.seasonXp ?? 0}
                    </div>
                    {friend.hasLumios && <span className="badge-lumios badge-golden text-[10px] px-1.5 py-0.5">⚡</span>}
                  </div>
                  {/* Rang tiered */}
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
          })
        )}

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
                <div className="p-3 rounded-2xl bg-primary/5 border border-primary/10 text-center">
                  <Zap className="w-4 h-4 mx-auto mb-1 text-amber-500 fill-amber-500" />
                  <p className="font-nunito font-black text-sm text-primary">
                    {selectedFriend.seasonXp ?? 0} XP
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold mt-0.5">Niveau Saison</p>
                </div>
                <div className="p-3 rounded-2xl bg-muted/50 text-center col-span-2">
                  <TrendingUp className="w-4 h-4 mx-auto mb-1 text-primary" />
                  <p className="font-nunito font-black text-sm text-primary">
                    {(selectedFriend as any).matchCount ?? 0} parties jouées
                  </p>
                </div>
              </div>

              {/* Action : Défier uniquement (#11 — pas de message) */}
              <button 
                onClick={() => {
                  setSelectedFriend(null);
                  setShowDuelModal(true);
                }}
                className="btn-primary w-full py-3"
              >
                <Swords className="w-5 h-5" /> Défier
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QR Scanner Modal */}
      <AnimatePresence>
        {showScanner && (
          <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowScanner(false)}>
            <motion.div
              className="modal-sheet text-center"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-nunito font-black text-lg">Scanner un ami</h3>
                <button onClick={() => setShowScanner(false)} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground mb-4">Scannez le QR Code depuis le profil d'un joueur pour l'ajouter.</p>
              
              <div className="rounded-3xl overflow-hidden mb-6 relative aspect-square bg-black">
                <div id="friend-qr-scanner-div" className="w-full h-full" />
                <div className="absolute inset-0 border-[6px] border-primary/20 pointer-events-none rounded-3xl" />
              </div>

              <button className="btn-glass w-full py-3 text-sm text-muted-foreground" onClick={() => setShowScanner(false)}>
                Annuler
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Duel d'Amis */}
      <AnimatePresence>
        {showDuelModal && (
          <FriendDuelModal
            profile={profile}
            onClose={() => setShowDuelModal(false)}
            onRefreshProfile={onRefreshProfile}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
