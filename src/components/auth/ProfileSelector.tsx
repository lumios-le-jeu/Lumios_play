import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, Sparkles, X, Check, QrCode, Users } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { ChildProfile, ParentAccount, AgeRange } from '../../lib/types';
import { getTierConfig } from '../../lib/types';
import { validatePseudo, getRankDisplayName } from '../../lib/utils';
import { createChildProfile, updateChildProfile } from '../../lib/api';
import { Loader2 } from 'lucide-react';

const AVATARS = ['🦁', '🐯', '🦊', '🐺', '🦅', '🦈', '🐉', '🦋', '🐼', '🦄', '🐸', '🦖'];
const AGE_RANGES: { value: AgeRange; label: string }[] = [
  { value: '4-6',   label: '4 – 6 ans' },
  { value: '7-9',   label: '7 – 9 ans' },
  { value: '10-13', label: '10 – 13 ans' },
  { value: '14-18', label: '14 – 18 ans' },
  { value: '18+',   label: '18 ans +' },
];

const FAMILY_RELATIONS = ['Fils', 'Fille', 'Père', 'Mère', 'Frère', 'Sœur', 'Autre'];
const ADULT_RELATIONS  = ['Père', 'Mère'];

interface ProfileSelectorProps {
  parent: ParentAccount;
  profiles: ChildProfile[];
  onSelectProfile: (profile: ChildProfile) => void;
  onAddProfile: (profile: ChildProfile) => void;
}

export default function ProfileSelector({ parent, profiles, onSelectProfile, onAddProfile }: ProfileSelectorProps) {
  // ── Add member state ──────────────────────────────────────────────────────
  const [showAdd, setShowAdd]       = useState(false);
  const [firstName, setFirstName]   = useState('');
  const [lastName, setLastName]     = useState('');
  const [pseudo, setPseudo]         = useState('');
  const [avatar, setAvatar]         = useState(AVATARS[0]);
  const [ageRange, setAgeRange]     = useState<AgeRange>('7-9');
  const [hasLumios, setHasLumios]   = useState(false);
  const [relation, setRelation]     = useState(FAMILY_RELATIONS[0]);
  const [error, setError]           = useState('');
  const [isLoading, setIsLoading]   = useState(false);

  // ── QR state ──────────────────────────────────────────────────────────────
  const [showQR, setShowQR] = useState(false);

  // ── Edit member state ─────────────────────────────────────────────────────
  const [editingProfile, setEditingProfile]       = useState<ChildProfile | null>(null);
  const [editFirstName, setEditFirstName]         = useState('');
  const [editLastName, setEditLastName]           = useState('');
  const [editPseudo, setEditPseudo]               = useState('');
  const [editAvatar, setEditAvatar]               = useState(AVATARS[0]);
  const [editAgeRange, setEditAgeRange]           = useState<AgeRange>('7-9');
  const [editHasLumios, setEditHasLumios]         = useState(false);
  const [editRelation, setEditRelation]           = useState(FAMILY_RELATIONS[0]);
  const [editError, setEditError]                 = useState('');
  const [editLoading, setEditLoading]             = useState(false);

  const qrAddMemberPayload = JSON.stringify({
    type: 'add-family-member',
    parentId: parent.id,
    parentName: parent.name,
  });

  // ── Open edit modal ───────────────────────────────────────────────────────
  const openEdit = (profile: ChildProfile, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProfile(profile);
    setEditFirstName(profile.firstName ?? '');
    setEditLastName(profile.lastName ?? '');
    setEditPseudo(profile.pseudo);
    setEditAvatar(profile.avatarEmoji);
    setEditAgeRange(profile.ageRange);
    setEditHasLumios(profile.hasLumios);
    setEditRelation(profile.relation ?? FAMILY_RELATIONS[0]);
    setEditError('');
  };

  // ── Save edit ─────────────────────────────────────────────────────────────
  const handleSaveEdit = async () => {
    if (!editingProfile) return;
    const err = validatePseudo(editPseudo);
    if (err) { setEditError(err); return; }

    setEditLoading(true);
    const { data: updated, error: apiErr } = await updateChildProfile(editingProfile.id, {
      pseudo:      editPseudo,
      firstName:   editFirstName,
      lastName:    editLastName,
      avatarEmoji: editAvatar,
      ageRange:    editAgeRange,
      hasLumios:   editHasLumios,
      relation:    editRelation,
    });
    setEditLoading(false);

    if (apiErr || !updated) {
      setEditError('Erreur lors de la mise à jour du profil.');
      return;
    }

    // Mettre à jour la liste localement via onAddProfile (réutilisé comme "refresh")
    onAddProfile(updated);
    setEditingProfile(null);
  };

  // ── Add member ────────────────────────────────────────────────────────────
  const handleAdd = async () => {
    const err = validatePseudo(pseudo);
    if (err) { setError(err); return; }
    if (!firstName.trim()) { setError('Le prénom est requis'); return; }

    setIsLoading(true);
    const finalAge = ADULT_RELATIONS.includes(relation) ? '18+' : ageRange;
    const { data: newProfile, error: apiErr } = await createChildProfile({
      parentId: parent.id,
      pseudo,
      firstName: firstName.trim(),
      lastName: lastName.trim() || undefined,
      avatarEmoji: avatar,
      ageRange: finalAge,
      hasLumios,
      elo: 800,
      city: 'France',
      rankTier: 'bronze',
      rankStep: 0,
      seasonXp: 0,
      winStreak: 0,
      accountType: 'family',
      relation: relation,
    });
    setIsLoading(false);

    if (apiErr || !newProfile) {
      setError('Erreur lors de la création du profil');
      return;
    }

    onAddProfile(newProfile);
    setShowAdd(false);
    setFirstName('');
    setLastName('');
    setPseudo('');
    setAvatar(AVATARS[0]);
    setAgeRange('7-9');
    setHasLumios(false);
    setRelation(FAMILY_RELATIONS[0]);
    setError('');
  };

  return (
    <div className="min-h-dvh gradient-background flex flex-col p-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 mt-8"
      >
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5" style={{ color: 'hsl(var(--primary))' }} />
          <span className="text-sm font-semibold text-muted-foreground">
            {parent.accountType === 'family' ? `Famille de ${parent.name}` : `Compte de ${parent.name}`}
          </span>
        </div>
        <h1 className="text-2xl font-nunito font-black">Qui joue aujourd'hui ?</h1>
      </motion.div>

      {/* Profile Grid */}
      <div className="flex flex-col gap-3 flex-1">
        <AnimatePresence>
          {profiles.map((profile, i) => {
            const tierCfg = getTierConfig(profile.rankTier || 'bronze');
            const rankName = getRankDisplayName(profile.rankTier || 'bronze', profile.rankStep ?? 0);

            return (
              <motion.button
                key={profile.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelectProfile(profile)}
                className="w-full flex items-center gap-4 p-4 card-lumios card-lumios-hover text-left"
              >
                {/* Avatar */}
                <div className="w-14 h-14 gradient-lumios rounded-2xl flex items-center justify-center text-3xl shadow-sm flex-shrink-0">
                  {profile.avatarEmoji}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-nunito font-black text-lg">{profile.pseudo}</span>
                    {profile.hasLumios && (
                      <span className="badge-lumios badge-golden">⚡ Lumios</span>
                    )}
                  </div>
                  {(profile.firstName || profile.lastName) && (
                    <p className="text-xs text-muted-foreground truncate">
                      {[profile.firstName, profile.lastName].filter(Boolean).join(' ')}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs">{tierCfg.icon}</span>
                    <span className="text-xs font-bold" style={{ color: tierCfg.color }}>{rankName}</span>
                    <span className="text-xs text-muted-foreground">· {profile.ageRange} ans</span>
                  </div>
                </div>

                {/* Edit action */}
                {parent.accountType === 'family' && (
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={(e) => openEdit(profile, e)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                      title="Modifier le profil"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </motion.button>
            );
          })}
        </AnimatePresence>

        {/* Add Profile Button */}
        {parent.accountType === 'family' && (
          <>
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: profiles.length * 0.06 + 0.1 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowAdd(true)}
              className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-all"
            >
              <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center">
                <Plus className="w-6 h-6" />
              </div>
              <span className="font-nunito font-bold">Ajouter un membre</span>
            </motion.button>

            {/* QR Add Member Button */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: profiles.length * 0.06 + 0.2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowQR(true)}
              className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-border text-muted-foreground hover:border-primary hover:text-primary transition-all"
            >
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
                <QrCode className="w-6 h-6 text-primary" />
              </div>
              <div className="text-left">
                <span className="font-nunito font-bold block">Lier via QR Code</span>
                <span className="text-xs text-muted-foreground">Un membre scanne pour rejoindre</span>
              </div>
            </motion.button>
          </>
        )}
      </div>

      {/* ── Add Profile Modal ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAdd(false)}
          >
            <motion.div
              className="modal-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-nunito font-black text-lg">Nouveau membre</h3>
                <button onClick={() => setShowAdd(false)} className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Relation */}
              <div className="mb-4">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">Rôle dans la famille</label>
                <div className="flex flex-wrap gap-2">
                  {FAMILY_RELATIONS.map(rel => (
                    <button
                      key={rel}
                      onClick={() => {
                        setRelation(rel);
                        if (ADULT_RELATIONS.includes(rel)) setAgeRange('18+');
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-all ${
                        relation === rel ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground'
                      }`}
                    >
                      {rel}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prénom + Nom */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1 block">Prénom *</label>
                  <input
                    className="input-lumios"
                    placeholder="Léo"
                    maxLength={20}
                    value={firstName}
                    onChange={e => { setFirstName(e.target.value); setError(''); }}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1 block">Nom</label>
                  <input
                    className="input-lumios"
                    placeholder="Dupont"
                    maxLength={30}
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                  />
                </div>
              </div>

              {/* Pseudo */}
              <div className="mb-4">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1 block">Pseudo de jeu</label>
                <input className="input-lumios" placeholder="LeoFire" maxLength={20} value={pseudo} onChange={e => { setPseudo(e.target.value); setError(''); }} />
                {error && <p className="text-accent text-xs mt-1">{error}</p>}
              </div>

              {/* Avatar */}
              <div className="mb-4">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">Avatar</label>
                <div className="grid grid-cols-6 gap-2">
                  {AVATARS.slice(0, 6).map(a => (
                    <button key={a} onClick={() => setAvatar(a)} className={`aspect-square rounded-xl text-2xl flex items-center justify-center transition-all ${avatar === a ? 'gradient-lumios scale-105' : 'bg-muted'}`}>
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              {/* Age Range — masqué si adulte */}
              {!ADULT_RELATIONS.includes(relation) && (
                <div className="mb-4">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">Tranche d'âge</label>
                  <div className="grid grid-cols-2 gap-2">
                    {AGE_RANGES.map(ar => (
                      <button key={ar.value} onClick={() => setAgeRange(ar.value)} className={`p-2 rounded-xl text-sm font-bold border-2 transition-all ${ageRange === ar.value ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}>
                        {ar.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {ADULT_RELATIONS.includes(relation) && (
                <p className="text-xs text-muted-foreground italic mb-4">🔒 Adulte +18 ans (automatique pour Père / Mère)</p>
              )}

              {/* Has Lumios */}
              <div className="mb-6 flex items-center justify-between p-3 bg-muted rounded-xl">
                <span className="font-semibold text-sm">Possède un Lumios ⚡</span>
                <motion.button
                  onClick={() => setHasLumios(p => !p)}
                  className={`w-12 h-6 rounded-full flex items-center transition-all ${hasLumios ? 'gradient-golden justify-end' : 'bg-border justify-start'}`}
                  style={{ padding: '2px' }}
                >
                  <motion.div layout className="w-5 h-5 bg-white rounded-full shadow-sm" />
                </motion.button>
              </div>

              <button className="btn-primary w-full py-3 mt-1" onClick={handleAdd} disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (
                  <><Check className="w-4 h-4" /> Créer le profil</>
                )}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Edit Profile Modal ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {editingProfile && (
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setEditingProfile(null)}
          >
            <motion.div
              className="modal-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-primary" />
                  <h3 className="font-nunito font-black text-lg">Modifier le profil</h3>
                </div>
                <button onClick={() => setEditingProfile(null)} className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Relation */}
              <div className="mb-4">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">Rôle dans la famille</label>
                <div className="flex flex-wrap gap-2">
                  {FAMILY_RELATIONS.map(rel => (
                    <button
                      key={rel}
                      onClick={() => {
                        setEditRelation(rel);
                        if (ADULT_RELATIONS.includes(rel)) setEditAgeRange('18+');
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-all ${
                        editRelation === rel ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground'
                      }`}
                    >
                      {rel}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prénom + Nom */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1 block">Prénom</label>
                  <input
                    className="input-lumios"
                    placeholder="Léo"
                    maxLength={20}
                    value={editFirstName}
                    onChange={e => setEditFirstName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1 block">Nom</label>
                  <input
                    className="input-lumios"
                    placeholder="Dupont"
                    maxLength={30}
                    value={editLastName}
                    onChange={e => setEditLastName(e.target.value)}
                  />
                </div>
              </div>

              {/* Pseudo */}
              <div className="mb-4">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1 block">Pseudo de jeu</label>
                <input className="input-lumios" placeholder="LeoFire" maxLength={20} value={editPseudo} onChange={e => { setEditPseudo(e.target.value); setEditError(''); }} />
                {editError && <p className="text-accent text-xs mt-1">{editError}</p>}
              </div>

              {/* Avatar */}
              <div className="mb-4">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">Avatar</label>
                <div className="grid grid-cols-6 gap-2">
                  {AVATARS.map(a => (
                    <button key={a} onClick={() => setEditAvatar(a)} className={`aspect-square rounded-xl text-2xl flex items-center justify-center transition-all ${editAvatar === a ? 'gradient-lumios scale-105' : 'bg-muted'}`}>
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              {/* Age Range */}
              {!ADULT_RELATIONS.includes(editRelation) && (
                <div className="mb-4">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">Tranche d'âge</label>
                  <div className="grid grid-cols-2 gap-2">
                    {AGE_RANGES.map(ar => (
                      <button key={ar.value} onClick={() => setEditAgeRange(ar.value)} className={`p-2 rounded-xl text-sm font-bold border-2 transition-all ${editAgeRange === ar.value ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}>
                        {ar.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {ADULT_RELATIONS.includes(editRelation) && (
                <p className="text-xs text-muted-foreground italic mb-4">🔒 Adulte +18 ans (automatique pour Père / Mère)</p>
              )}

              {/* Has Lumios */}
              <div className="mb-6 flex items-center justify-between p-3 bg-muted rounded-xl">
                <span className="font-semibold text-sm">Possède un Lumios ⚡</span>
                <motion.button
                  onClick={() => setEditHasLumios(p => !p)}
                  className={`w-12 h-6 rounded-full flex items-center transition-all ${editHasLumios ? 'gradient-golden justify-end' : 'bg-border justify-start'}`}
                  style={{ padding: '2px' }}
                >
                  <motion.div layout className="w-5 h-5 bg-white rounded-full shadow-sm" />
                </motion.button>
              </div>

              <div className="flex gap-3">
                <button className="btn-glass flex-1 py-3" onClick={() => setEditingProfile(null)}>Annuler</button>
                <button className="btn-primary flex-1 py-3" onClick={handleSaveEdit} disabled={editLoading}>
                  {editLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : <><Check className="w-4 h-4" /> Enregistrer</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── QR Code Modal for family linking ──────────────────────────────────── */}
      <AnimatePresence>
        {showQR && (
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowQR(false)}
          >
            <motion.div
              className="modal-sheet text-center"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  <h3 className="font-nunito font-black text-lg">Ajouter un membre</h3>
                </div>
                <button onClick={() => setShowQR(false)} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 bg-white rounded-3xl shadow-card border border-border inline-block mb-4">
                <QRCodeSVG value={qrAddMemberPayload} size={200} fgColor="hsl(217, 85%, 30%)" level="M" />
              </div>

              <p className="text-sm font-bold mb-1">Famille {parent.name}</p>
              <p className="text-xs text-muted-foreground mb-6 px-4">
                L'enfant scanne ce QR Code avec son téléphone pour lier son compte à votre famille instantanément.
              </p>

              <button className="btn-primary w-full py-4" onClick={() => setShowQR(false)}>Fermer</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
