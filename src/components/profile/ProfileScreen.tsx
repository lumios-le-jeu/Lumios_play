import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Bell, Shield, Settings, LogOut, Sparkles, ChevronRight, RotateCcw, X, QrCode, Star, Flame, Users, Search, Check, Loader2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { ChildProfile, ParentAccount } from '../../lib/types';
import { getTierConfig } from '../../lib/types';
import { getRankDisplayName, getRankProgress, getNextRankName, fromGlobalStep } from '../../lib/ranking';
import { formatDate } from '../../lib/utils';
import { searchFamilyAccounts, requestFamilyLink, getPendingFamilyRequests, acceptFamilyLink, declineFamilyLink } from '../../lib/api';

interface ProfileScreenProps {
  profile: ChildProfile;
  parentAccount?: ParentAccount;
  familyProfiles?: ChildProfile[];
  onSelectProfile?: (profile: ChildProfile) => void;
  onLogout: () => void;
  onSwitchProfile: () => void;
}

const MENU_ITEMS = [
  { id: 'notifications', icon: Bell,     label: 'Notifications',     desc: 'Gérer les alertes' },
  { id: 'parental',      icon: Shield,   label: 'Contrôle Parental', desc: 'PIN & restrictions' },
  { id: 'settings',      icon: Settings, label: 'Paramètres',        desc: 'Langue, son, apparence' },
];

export default function ProfileScreen({ profile, parentAccount, familyProfiles = [], onSelectProfile, onLogout, onSwitchProfile }: ProfileScreenProps) {
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [showQR, setShowQR] = useState(false);
  // #15 — Liaison famille
  const [showFamilyLink, setShowFamilyLink] = useState(false);
  const [familySearch, setFamilySearch] = useState('');
  const [familyResults, setFamilyResults] = useState<any[]>([]);
  const [familySearching, setFamilySearching] = useState(false);
  const [familyRequestSent, setFamilyRequestSent] = useState<string | null>(null);
  const [pendingLinks, setPendingLinks] = useState<any[]>([]);
  const [linkLoading, setLinkLoading] = useState(false);

  const isIndividual = profile.accountType === 'individual';
  const isFamilyAdmin = profile.accountType === 'family' && parentAccount?.id === profile.parentId;

  // Charger demandes de rattachement si responsable famille
  useEffect(() => {
    if (isFamilyAdmin && parentAccount?.id) {
      getPendingFamilyRequests(parentAccount.id).then(({ data }) => setPendingLinks(data));
    }
  }, [isFamilyAdmin, parentAccount?.id]);

  // Recherche famille
  useEffect(() => {
    if (familySearch.length < 2) { setFamilyResults([]); return; }
    const t = setTimeout(async () => {
      setFamilySearching(true);
      const { data } = await searchFamilyAccounts(familySearch);
      setFamilyResults(data || []);
      setFamilySearching(false);
    }, 500);
    return () => clearTimeout(t);
  }, [familySearch]);

  const handleRequestLink = async (familyParentId: string) => {
    setLinkLoading(true);
    await requestFamilyLink(profile.id, familyParentId);
    setFamilyRequestSent(familyParentId);
    setLinkLoading(false);
  };

  const handleAcceptLink = async (req: any) => {
    if (!parentAccount?.id) return;
    setLinkLoading(true);
    await acceptFamilyLink(req.requestId, req.id, parentAccount.id);
    setPendingLinks(prev => prev.filter(r => r.requestId !== req.requestId));
    setLinkLoading(false);
  };

  const handleDeclineLink = async (requestId: string) => {
    await declineFamilyLink(requestId);
    setPendingLinks(prev => prev.filter(r => r.requestId !== requestId));
  };

  const tierCfg = getTierConfig(profile.rankTier);
  const rankName = getRankDisplayName(profile.rankTier, profile.rankStep);
  const progress = getRankProgress(profile.rankStep);
  const nextRank = getNextRankName(profile.rankStep);

  const qrProfilePayload = JSON.stringify({
    type: 'add-friend',
    profileId: profile.id,
    pseudo: profile.pseudo,
  });

  return (
    <div className="screen-wrapper">
      {/* Header Card */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-lumios p-5 mb-5 text-center relative overflow-hidden"
      >
        <div className="absolute inset-0 gradient-lumios opacity-5" />
        <div className="relative">
          <motion.div
            whileTap={{ scale: 0.95 }}
            className="w-20 h-20 gradient-lumios rounded-3xl flex items-center justify-center text-5xl mx-auto mb-4 shadow-glow-blue animate-pulse-glow"
          >
            {profile.avatarEmoji || <User className="w-10 h-10 text-white" />}
          </motion.div>
          <h1 className="font-nunito font-black text-2xl mb-1">{profile.pseudo}</h1>

          {/* Rank display */}
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-lg">{tierCfg.icon}</span>
            <span className="font-nunito font-bold text-sm" style={{ color: tierCfg.color }}>{rankName}</span>
          </div>

          {/* Mini step progress */}
          {profile.rankTier !== 'mythic' && (
            <div className="flex gap-1 justify-center mb-3">
              {Array.from({ length: progress.totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className="w-3 h-3 rounded-full transition-all"
                  style={{
                    background: i < progress.currentStep ? tierCfg.color : 'hsl(var(--muted))',
                    boxShadow: i < progress.currentStep ? `0 0 4px ${tierCfg.color}66` : 'none',
                  }}
                />
              ))}
            </div>
          )}

          <div className="flex items-center justify-center gap-2 flex-wrap mb-2">
            <span className="badge-lumios badge-blue">{profile.ageRange} ans</span>
            <span className="badge-lumios" style={{ background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }}>{profile.city}</span>
            {profile.hasLumios && <span className="badge-lumios badge-golden">⚡ Lumios</span>}
          </div>

          <p className="text-xs text-muted-foreground mt-2">
            Membre depuis {formatDate(profile.createdAt)}
          </p>
        </div>
      </motion.div>

      {/* Season XP + Streak quick stats */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 gap-3 mb-5"
      >
        <div className="card-lumios p-3 flex items-center gap-3">
          <Star className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div>
            <p className="font-nunito font-black text-lg" style={{ color: 'hsl(var(--golden))' }}>{profile.seasonXp}</p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase">XP Saison</p>
          </div>
        </div>
        <div className="card-lumios p-3 flex items-center gap-3">
          <Flame className={`w-5 h-5 flex-shrink-0 ${profile.winStreak >= 3 ? 'text-orange-500' : 'text-muted-foreground'}`} />
          <div>
            <p className={`font-nunito font-black text-lg ${profile.winStreak >= 3 ? 'text-orange-500' : ''}`}>
              {profile.winStreak} {profile.winStreak >= 3 ? '🔥' : ''}
            </p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase">Série</p>
          </div>
        </div>
      </motion.div>

      {/* QR Code for friends */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
      >
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowQR(true)}
          className="card-lumios p-4 mb-5 flex items-center gap-3 w-full text-left card-lumios-hover"
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center gradient-lumios">
            <QrCode className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-nunito font-black text-sm">Mon QR Code</p>
            <p className="text-xs text-muted-foreground">Scannez pour m'ajouter en ami</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </motion.button>
      </motion.div>

      {/* #15 — Rattachement famille (compte individuel) */}
      {isIndividual && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.10 }} className="mb-4">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowFamilyLink(true)}
            className="card-lumios p-4 flex items-center gap-3 w-full text-left card-lumios-hover"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'hsl(var(--lumios-green)/0.12)' }}>
              <Users className="w-5 h-5" style={{ color: 'hsl(var(--lumios-green))' }} />
            </div>
            <div className="flex-1">
              <p className="font-nunito font-black text-sm">Rejoindre une famille</p>
              <p className="text-xs text-muted-foreground">Rattacher ce profil à un compte famille</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </motion.button>
        </motion.div>
      )}

      {/* #15 — Demandes de rattachement reçues (responsable famille) */}
      {isFamilyAdmin && pendingLinks.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.10 }} className="mb-5">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 px-1">
            Demandes de rattachement ({pendingLinks.length})
          </p>
          <div className="flex flex-col gap-2">
            {pendingLinks.map(req => (
              <div key={req.requestId} className="flex items-center gap-3 p-3 card-lumios border-primary/20 bg-primary/3">
                <div className="w-10 h-10 gradient-lumios rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                  {req.avatarEmoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-nunito font-bold text-sm">{req.pseudo}</p>
                  <p className="text-xs text-muted-foreground">{req.ageRange} ans</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleDeclineLink(req.requestId)} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-red-500 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleAcceptLink(req)} className="w-8 h-8 rounded-lg gradient-lumios flex items-center justify-center text-white">
                    {linkLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Hub Famille ── */}
      {profile.accountType === 'family' && familyProfiles.length > 1 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.11 }} className="mb-5">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 px-1">
            Ma Famille
          </p>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none px-1">
            {familyProfiles.filter(p => p.id !== profile.id).map(fp => (
              <button
                key={fp.id}
                onClick={() => onSelectProfile && onSelectProfile(fp)}
                className="flex flex-col items-center gap-1.5 flex-shrink-0 w-16 group"
              >
                <div className="w-14 h-14 rounded-3xl bg-card border-2 border-transparent group-hover:border-primary flex items-center justify-center text-3xl shadow-sm transition-all">
                  {fp.avatarEmoji}
                </div>
                <span className="text-[10px] font-bold text-muted-foreground group-hover:text-foreground truncate w-full text-center transition-colors">
                  {fp.pseudo}
                </span>
                {fp.relation && (
                  <span className="text-[8px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground mt-[-2px]">
                    {fp.relation}
                  </span>
                )}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Menu Items */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="card-lumios mb-4 overflow-hidden"
      >
        {MENU_ITEMS.map((item, i) => (
          <motion.button
            key={item.id}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowComingSoon(true)}
            className={`w-full flex items-center gap-3 p-4 text-left transition-colors hover:bg-muted ${i < MENU_ITEMS.length - 1 ? 'border-b border-border' : ''}`}
          >
            <div className="w-9 h-9 bg-muted rounded-xl flex items-center justify-center">
              <item.icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-nunito font-bold text-sm">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </motion.button>
        ))}
      </motion.div>

      {/* Switch Profile */}
      {parentAccount?.accountType !== 'individual' && (
        <motion.button
          whileTap={{ scale: 0.97 }}
          className="btn-glass w-full py-3.5 mb-3"
          onClick={onSwitchProfile}
        >
          <RotateCcw className="w-4 h-4" />
          Changer de profil
        </motion.button>
      )}

      {/* Logout */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onLogout}
        className="w-full py-3.5 rounded-xl font-nunito font-bold text-sm border-2 transition-all flex items-center justify-center gap-2"
        style={{ borderColor: 'hsl(var(--accent)/0.4)', color: 'hsl(var(--accent))' }}
      >
        <LogOut className="w-4 h-4" />
        Déconnexion
      </motion.button>

      {/* QR Modal */}
      <AnimatePresence>
        {showQR && (
          <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowQR(false)}>
            <motion.div
              className="modal-sheet text-center"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-nunito font-black text-lg">Mon QR Code</h3>
                <button onClick={() => setShowQR(false)} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 bg-white rounded-3xl shadow-card border border-border inline-block mb-4">
                <QRCodeSVG value={qrProfilePayload} size={200} fgColor="hsl(217, 85%, 30%)" level="M" />
              </div>
              <p className="text-sm font-bold mb-1">{profile.pseudo}</p>
              <p className="text-xs text-muted-foreground mb-6">Scannez ce code pour m'ajouter en ami instantanément</p>
              <button className="btn-primary w-full py-4" onClick={() => setShowQR(false)}>Fermer</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Coming Soon Modal */}
      <AnimatePresence>
        {showComingSoon && (
          <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowComingSoon(false)}>
            <motion.div
              className="modal-sheet text-center"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                 <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-primary" />
                 </div>
                 <button onClick={() => setShowComingSoon(false)} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                    <X className="w-4 h-4" />
                 </button>
              </div>
              <h3 className="font-nunito font-black text-xl mb-2">Prochainement ! 🚀</h3>
              <p className="text-sm text-muted-foreground mb-8">
                Cette fonctionnalité est en cours de développement pour Lumios Play v2.1.
              </p>
              <button className="btn-primary w-full py-4" onClick={() => setShowComingSoon(false)}>Super !</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* #15 — Modal recherche famille */}
      <AnimatePresence>
        {showFamilyLink && (
          <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowFamilyLink(false)}>
            <motion.div
              className="modal-sheet"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-nunito font-black text-lg">Rejoindre une Famille</h3>
                <button onClick={() => setShowFamilyLink(false)} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Recherchez la famille par son nom. Le responsable devra accepter votre demande.
              </p>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  className="input-lumios pl-9"
                  placeholder="Nom de la famille…"
                  value={familySearch}
                  onChange={e => setFamilySearch(e.target.value)}
                />
              </div>
              {familySearching && <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>}
              <div className="flex flex-col gap-2">
                {familyResults.map(fam => (
                  <div key={fam.id} className="flex items-center gap-3 p-3 card-lumios">
                    <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center text-xl">🏡</div>
                    <div className="flex-1">
                      <p className="font-nunito font-bold text-sm">{fam.name}</p>
                      <p className="text-xs text-muted-foreground">{fam.email}</p>
                    </div>
                    <button
                      onClick={() => !familyRequestSent && handleRequestLink(fam.id)}
                      disabled={familyRequestSent === fam.id || linkLoading}
                      className={`py-1.5 px-3 text-xs rounded-xl font-bold flex items-center gap-1 transition-all ${
                        familyRequestSent === fam.id ? 'bg-muted text-muted-foreground' : 'btn-primary'
                      }`}
                    >
                      {familyRequestSent === fam.id
                        ? <><Check className="w-3.5 h-3.5" /> Envoyé</>
                        : <><Users className="w-3.5 h-3.5" /> Rejoindre</>
                      }
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-center text-xs text-muted-foreground mt-6">Lumios Play v2.1 · Avril 2026</p>
    </div>
  );
}
