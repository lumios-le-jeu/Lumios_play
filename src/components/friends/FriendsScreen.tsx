import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, UserPlus, QrCode, Swords, Loader2, Check, X, Crown, TrendingUp, Zap, Clock } from 'lucide-react';
import type { ChildProfile, Friend } from '../../lib/types';
import { getTierConfig } from '../../lib/types';
import { getRankDisplayName } from '../../lib/ranking';
import { getFriends, searchProfiles, addFriend, getPendingFriendRequests, acceptFriendRequest, declineFriendRequest, getSuggestedFriends, getSentPendingRequests } from '../../lib/api';
import FriendDuelModal from '../play/FriendDuelModal';

interface FriendsScreenProps {
  profile: ChildProfile;
  onRefreshProfile?: () => Promise<void>;
}

export default function FriendsScreen({ profile, onRefreshProfile }: FriendsScreenProps) {
  const [search, setSearch] = useState('');
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [friendsList, setFriendsList] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [sentPending, setSentPending] = useState<any[]>([]);
  const [suggestedFriends, setSuggestedFriends] = useState<any[]>([]);
  const [globalResults, setGlobalResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [addRequestSent, setAddRequestSent] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState<string | null>(null);
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
                    alert('Vous ne pouvez pas vous ajouter vous-même !');
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
    const [{ data: friends }, { data: pending }, { data: sent }, { data: suggestions }] = await Promise.all([
      getFriends(profile.id),
      getPendingFriendRequests(profile.id),
      getSentPendingRequests(profile.id),
      getSuggestedFriends(profile.id),
    ]);
    setFriendsList(friends);
    setPendingRequests(pending);
    setSentPending(sent);
    // Filtrer les suggestions : exclure amis déjà dans la liste
    const friendIds = new Set(friends.map((f: any) => f.id));
    setSuggestedFriends((suggestions || []).filter((s: any) => !friendIds.has(s.id)));
    setIsLoading(false);
  };

  useEffect(() => {
    loadFriends();
  }, [profile.id]);

  const handleAddFriend = async (friendId: string) => {
    setIsAdding(friendId);
    setAddError(null);
    const success = await addFriend(profile.id, friendId);
    setIsAdding(null);
    if (success) {
      setAddRequestSent(friendId);
      setTimeout(() => loadFriends(), 1000);
    } else {
      setAddError('Erreur lors de l\'envoi. Veuillez réessayer.');
    }
    setSearch('');
    setGlobalResults([]);
  };

  const handleAccept = async (requesterId: string) => {
    await acceptFriendRequest(profile.id, requesterId);
    await loadFriends();
  };

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

  const filteredFriends = friendsList.filter(f =>
    f.pseudo.toLowerCase().includes(search.toLowerCase())
  );

  // ── Carte ami réutilisable ──────────────────────────────────────────────────
  const FriendCard = ({ friend, i, onClick }: { friend: Friend; i: number; onClick: () => void }) => {
    const tierCfg = getTierConfig(friend.rankTier || 'bronze');
    const rankName = getRankDisplayName(friend.rankTier || 'bronze', friend.rankStep ?? 0);
    return (
      <motion.button
        key={friend.id}
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: i * 0.05 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className="w-full flex items-center gap-3 p-3.5 card-lumios card-lumios-hover text-left"
      >
        <div className="w-12 h-12 gradient-lumios rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">
          {friend.avatarEmoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-nunito font-black text-sm">{friend.pseudo}</span>
            {friend.isFamily && (
              <span className="badge-lumios badge-blue text-[9px] px-1.5 py-0.5">👨‍👩‍👧 Famille</span>
            )}
            <div className="flex items-center gap-0.5 text-amber-500 font-black text-[10px] bg-amber-50 px-1.5 py-0.5 rounded-lg border border-amber-200">
              <Zap className="w-2.5 h-2.5 fill-amber-500" />
              {friend.seasonXp ?? 0}
            </div>
          </div>
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
      </motion.button>
    );
  };

  return (
    <div className="screen-wrapper">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
        <h1 className="font-nunito font-black text-2xl mb-0.5">Amis</h1>
        <p className="text-muted-foreground text-sm">{friendsList.length} ami{friendsList.length !== 1 ? 's' : ''}</p>
      </motion.div>

      {/* Demandes reçues */}
      {pendingRequests.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 px-1">
            Demandes reçues ({pendingRequests.length})
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
                    <button onClick={() => handleDecline(req.id)} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-all">
                      <X className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleAccept(req.id)} className="w-8 h-8 rounded-lg gradient-lumios flex items-center justify-center text-white shadow-sm">
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Demandes envoyées en attente */}
      {sentPending.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 px-1">
            <Clock className="w-3 h-3 inline mr-1" />Demandes envoyées ({sentPending.length})
          </p>
          <div className="flex flex-col gap-2">
            {sentPending.map(req => {
              const tierCfg = getTierConfig(req.rankTier || 'bronze');
              const rankName = getRankDisplayName(req.rankTier || 'bronze', req.rankStep ?? 0);
              return (
                <div key={req.id} className="flex items-center gap-3 p-3 card-lumios border-amber-200/40 bg-amber-50/30">
                  <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                    {req.avatarEmoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-nunito font-bold text-sm">{req.pseudo}</p>
                    <div className="flex items-center gap-1">
                      <span className="text-xs">{tierCfg.icon}</span>
                      <span className="text-[10px] font-semibold" style={{ color: tierCfg.color }}>{rankName}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-amber-600 font-bold bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">En attente</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Search */}
      <div className="flex items-center gap-2 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input className="input-lumios pl-9 w-full" placeholder="Rechercher un joueur…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button
          onClick={() => setShowScanner(true)}
          className="w-12 h-12 flex-shrink-0 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all shadow-sm border border-border"
        >
          <QrCode className="w-5 h-5" />
        </button>
      </div>

      {/* Friend List */}
      <div className="flex flex-col gap-2">
        {isLoading ? (
          <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : search.length >= 2 ? (
          <>
            {filteredFriends.length > 0 && (
              <>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1 px-1">Mes amis</p>
                {filteredFriends.map((friend, i) => (
                  <FriendCard key={friend.id} friend={friend} i={i} onClick={() => setSelectedFriend(friend)} />
                ))}
              </>
            )}
            {/* Résultats globaux */}
            <div className="mt-2">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 px-1">Autres joueurs</h3>
              {isSearching ? (
                <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
              ) : globalResults.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center p-4 italic">Aucun utilisateur trouvé</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {globalResults.map(user => {
                    const tierCfg = getTierConfig(user.rank_tier || 'bronze');
                    const rankName = getRankDisplayName(user.rank_tier || 'bronze', user.rank_step ?? 0);
                    const isRequested = addRequestSent === user.id;
                    return (
                      <div key={user.id} className="w-full flex items-center gap-3 p-3 card-lumios bg-card/40">
                        <div className="w-10 h-10 gradient-lumios rounded-xl flex items-center justify-center text-xl">{user.avatar_emoji}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-nunito font-bold text-sm">{user.pseudo}</p>
                          <div className="flex items-center gap-1">
                            <span className="text-xs">{tierCfg.icon}</span>
                            <span className="text-[10px] font-semibold" style={{ color: tierCfg.color }}>{rankName}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => !isRequested && !isAdding && handleAddFriend(user.id)}
                          disabled={isRequested || isAdding === user.id}
                          className={`py-1.5 px-3 text-xs rounded-xl font-nunito font-bold flex items-center gap-1 transition-all ${isRequested ? 'bg-muted text-muted-foreground' : 'btn-primary'}`}
                        >
                          {isAdding === user.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isRequested ? <><Check className="w-3.5 h-3.5" /> Envoyé</> : <><UserPlus className="w-3.5 h-3.5" /> Ajouter</>}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : friendsList.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <p className="text-3xl mb-2">👥</p>
            <p className="font-semibold">Aucun ami pour l'instant</p>
            <p className="text-sm mt-1">Recherchez des joueurs ou scannez un QR Code</p>
          </div>
        ) : (
          friendsList.map((friend, i) => (
            <FriendCard key={friend.id} friend={friend} i={i} onClick={() => setSelectedFriend(friend)} />
          ))
        )}

        {addError && (
          <p className="text-xs text-red-500 font-bold text-center mt-2 p-2 bg-red-50 rounded-xl">{addError}</p>
        )}
      </div>

      {/* Propositions d'amis */}
      {suggestedFriends.length > 0 && search.length < 2 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 px-1">
            🎮 Joueurs affrontés — Ajouter en ami ?
          </p>
          <div className="flex flex-col gap-2">
            {suggestedFriends.map(user => {
              const tierCfg = getTierConfig(user.rank_tier || 'bronze');
              const rankName = getRankDisplayName(user.rank_tier || 'bronze', user.rank_step ?? 0);
              const isRequested = addRequestSent === user.id;
              return (
                <div key={user.id} className="w-full flex items-center gap-3 p-3 card-lumios bg-primary/3 border-primary/10">
                  <div className="w-10 h-10 gradient-lumios rounded-xl flex items-center justify-center text-xl flex-shrink-0">{user.avatar_emoji}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-nunito font-bold text-sm">{user.pseudo}</p>
                    <div className="flex items-center gap-1">
                      <span className="text-xs">{tierCfg.icon}</span>
                      <span className="text-[10px] font-semibold" style={{ color: tierCfg.color }}>{rankName}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => !isRequested && !isAdding && handleAddFriend(user.id)}
                    disabled={isRequested || isAdding === user.id}
                    className={`py-1.5 px-3 text-xs rounded-xl font-nunito font-bold flex items-center gap-1 transition-all ${isRequested ? 'bg-muted text-muted-foreground' : 'btn-primary'}`}
                  >
                    {isAdding === user.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isRequested ? <><Check className="w-3.5 h-3.5" /> Envoyé</> : <><UserPlus className="w-3.5 h-3.5" /> Ajouter</>}
                  </button>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Fiche ami complète */}
      <AnimatePresence>
        {selectedFriend && (
          <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedFriend(null)}>
            <motion.div
              className="modal-sheet"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 gradient-lumios rounded-2xl flex items-center justify-center text-3xl">{selectedFriend.avatarEmoji}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-nunito font-black text-xl">{selectedFriend.pseudo}</span>
                    {selectedFriend.hasLumios && <span className="badge-lumios badge-golden">⚡ Lumios</span>}
                  </div>
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
                </div>
              </div>

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
                  <p className="font-nunito font-black text-sm text-primary">{selectedFriend.seasonXp ?? 0} XP</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold mt-0.5">Niveau Saison</p>
                </div>
                <div className="p-3 rounded-2xl bg-muted/50 text-center col-span-2">
                  <TrendingUp className="w-4 h-4 mx-auto mb-1 text-primary" />
                  <p className="font-nunito font-black text-sm text-primary">{(selectedFriend as any).matchCount ?? 0} parties jouées</p>
                </div>
              </div>

              <button onClick={() => { setSelectedFriend(null); setShowDuelModal(true); }} className="btn-primary w-full py-3">
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
            <motion.div className="modal-sheet text-center" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-nunito font-black text-lg">Scanner un ami</h3>
                <button onClick={() => setShowScanner(false)} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center"><X className="w-4 h-4" /></button>
              </div>
              <p className="text-sm text-muted-foreground mb-4">Scannez le QR Code depuis le profil d'un joueur.</p>
              <div className="rounded-3xl overflow-hidden mb-6 relative aspect-square bg-black">
                <div id="friend-qr-scanner-div" className="w-full h-full" />
                <div className="absolute inset-0 border-[6px] border-primary/20 pointer-events-none rounded-3xl" />
              </div>
              <button className="btn-glass w-full py-3 text-sm text-muted-foreground" onClick={() => setShowScanner(false)}>Annuler</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Duel d'Amis */}
      <AnimatePresence>
        {showDuelModal && (
          <FriendDuelModal profile={profile} onClose={() => setShowDuelModal(false)} onRefreshProfile={onRefreshProfile} />
        )}
      </AnimatePresence>
    </div>
  );
}
