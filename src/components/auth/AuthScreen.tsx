import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Eye, EyeOff, ChevronRight, ChevronLeft, Check, Gamepad2, QrCode, Users, User } from 'lucide-react';
import type { ParentAccount, AccountType, AgeRange, GuestProfile } from '../../lib/types';
import { validatePseudo } from '../../lib/utils';
import { createParentAccount, loginParent, createChildProfile, isEmailRegistered, isPseudoTaken } from '../../lib/api';
import { Loader2 } from 'lucide-react';

const AVATARS = ['🦁', '🐯', '🦊', '🐺', '🦅', '🦈', '🐉', '🦋', '🐼', '🦄', '🐸', '🦖'];
const AGE_RANGES: { value: AgeRange; label: string; sub: string }[] = [
  { value: '6-8',   label: '6 – 8 ans',   sub: 'Compte famille requis' },
  { value: '9-11',  label: '9 – 11 ans',  sub: 'Compte famille requis' },
  { value: '12-14', label: '12 – 14 ans', sub: '' },
  { value: '15-17', label: '15 – 17 ans', sub: '' },
  { value: '18+',    label: '18 ans +',    sub: 'Adulte' },
];

const FAMILY_RELATIONS = ['Fils', 'Fille', 'Neveu', 'Nièce', 'Cousin', 'Cousine', 'Autre'];

interface AuthScreenProps {
  onAuthComplete: (parent: ParentAccount) => void;
  onGuestStart: (guest: GuestProfile) => void;
}

type AuthView = 'welcome' | 'login' | 'signup' | 'guest';

export default function AuthScreen({ onAuthComplete, onGuestStart }: AuthScreenProps) {
  const [view, setView] = useState<AuthView>('welcome');
  const [signupStep, setSignupStep] = useState(1);
  const TOTAL_STEPS = 6;

  // Form state
  const [accountType, setAccountType] = useState<AccountType>('family');
  const [parentName, setParentName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [pseudo, setPseudo] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [ageRange, setAgeRange] = useState<AgeRange>('18+');
  const [hasLumios, setHasLumios] = useState<boolean | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Family member (step 6)
  const [addingMember, setAddingMember] = useState(false);
  const [memberPseudo, setMemberPseudo] = useState('');
  const [memberAvatar, setMemberAvatar] = useState(AVATARS[2]);
  const [memberAge, setMemberAge] = useState<AgeRange>('9-11');
  const [memberRelation, setMemberRelation] = useState(FAMILY_RELATIONS[0]);
  const [pendingMembers, setPendingMembers] = useState<{pseudo: string, avatar: string, ageRange: AgeRange}[]>([]);

  // Guest state
  const [guestPseudo, setGuestPseudo] = useState('');
  const [guestAvatar, setGuestAvatar] = useState(AVATARS[0]);

  const validateStep = (): boolean => {
    const e: Record<string, string> = {};
    if (signupStep === 2) {
      if (!parentName.trim()) e.parentName = 'Prénom requis';
      if (!email.includes('@')) e.email = 'Email invalide';
      if (password.length < 6) e.password = 'Minimum 6 caractères';
    }
    if (signupStep === 3) {
      const err = validatePseudo(pseudo);
      if (err) e.pseudo = err;
    }
    if (signupStep === 5 && hasLumios === null) {
      e.hasLumios = 'Veuillez choisir une option';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = async () => {
    if (!validateStep()) return;

    // DB checks
    if (signupStep === 2) {
      setIsLoading(true);
      const exists = await isEmailRegistered(email);
      setIsLoading(false);
      if (exists) {
        setErrors({ email: 'Cet email est déjà utilisé' });
        return;
      }
    }

    if (signupStep === 3) {
      setIsLoading(true);
      const taken = await isPseudoTaken(pseudo);
      setIsLoading(false);
      if (taken) {
        setErrors({ pseudo: 'Ce pseudo est déjà pris' });
        return;
      }
    }

    // Skip step 6 for individual accounts
    if (signupStep === 5 && accountType === 'individual') {
      await finalizeSignup();
      return;
    }

    if (signupStep < TOTAL_STEPS) {
      setSignupStep(s => s + 1);
    } else {
      await finalizeSignup();
    }
  };

  const finalizeSignup = async () => {
    setIsLoading(true);
    const { data: parentData, error: parentErr } = await createParentAccount(email, parentName, accountType);
    if (parentErr || !parentData) {
      setErrors({ hasLumios: 'Erreur création : ' + (parentErr?.message || 'L\'email est peut-être déjà utilisé.') });
      setIsLoading(false);
      return;
    }

    // Créer le profil principal (le parent/joueur lui-même)
    await createChildProfile({
      parentId: parentData.id,
      pseudo,
      avatarEmoji: avatar,
      ageRange,
      hasLumios: !!hasLumios,
      elo: 800,
      city: 'France',
      rankTier: 'bronze',
      rankStep: 0,
      seasonXp: 0,
      winStreak: 0,
      accountType,
    });

    // Créer les filiations ajoutées
    for (const member of pendingMembers) {
      await createChildProfile({
        parentId: parentData.id,
        pseudo: member.pseudo,
        avatarEmoji: member.avatar,
        ageRange: member.ageRange,
        hasLumios: false,
        elo: 800,
        city: 'France',
        rankTier: 'bronze',
        rankStep: 0,
        seasonXp: 0,
        winStreak: 0,
        accountType: 'family',
      });
    }

    setIsLoading(false);
    onAuthComplete(parentData);
  };

  const handleAddPendingMember = async () => {
    const err = validatePseudo(memberPseudo);
    if (err) { setErrors({ memberPseudo: err }); return; }

    setIsLoading(true);
    const taken = await isPseudoTaken(memberPseudo);
    if (taken) {
      setErrors({ memberPseudo: 'Ce pseudo est déjà pris' });
      setIsLoading(false);
      return;
    }

    setPendingMembers(prev => [...prev, {
      pseudo: memberPseudo,
      avatar: memberAvatar,
      ageRange: memberAge
    }]);

    setIsLoading(false);
    setAddingMember(false);
    setMemberPseudo('');
    setErrors({});
  };

  const handleLogin = async () => {
    setIsLoading(true);
    const { data: parentData, error } = await loginParent(email);
    setIsLoading(false);

    if (error || !parentData) {
      alert('Erreur: Vérifiez vos identifiants.');
      return;
    }
    onAuthComplete(parentData);
  };

  const handleGuestJoin = () => {
    const err = validatePseudo(guestPseudo);
    if (err) {
      setErrors({ guestPseudo: err });
      return;
    }
    const guest: GuestProfile = {
      tempId: `guest-${Date.now()}`,
      pseudo: guestPseudo,
      avatarEmoji: guestAvatar,
      isGuest: true,
    };
    sessionStorage.setItem('lumios_guest', JSON.stringify(guest));
    onGuestStart(guest);
  };

  return (
    <div className="min-h-dvh gradient-background flex flex-col items-center justify-center p-4">
      <AnimatePresence mode="wait">

        {/* ── WELCOME ──────────────────────────────────────────────────────── */}
        {view === 'welcome' && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-sm flex flex-col items-center gap-6"
          >
            {/* Logo */}
            <div className="flex flex-col items-center gap-4">
              <motion.div
                className="w-24 h-24 gradient-lumios rounded-3xl flex items-center justify-center shadow-card animate-pulse-glow"
                animate={{ rotate: [0, 2, -2, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
              >
                <Sparkles className="w-12 h-12 text-white animate-float" />
              </motion.div>
              <div className="text-center">
                <h1 className="text-4xl font-nunito font-black text-glow-blue" style={{ color: 'hsl(var(--primary))' }}>
                  Lumios Play
                </h1>
                <p className="text-muted-foreground font-quicksand mt-1 text-sm">
                  Le sport social des boules lumineuses
                </p>
              </div>
            </div>

            {/* Balls visual */}
            <div className="flex items-center gap-3 my-1">
              {(['lumios-blue', 'lumios-red', 'lumios-green'] as const).map((c, i) => (
                <motion.div
                  key={c}
                  className="w-10 h-10 rounded-full shadow-md"
                  style={{ background: `hsl(var(--${c}))` }}
                  animate={{ y: [0, -8, 0] }}
                  transition={{ repeat: Infinity, duration: 1.8, delay: i * 0.3, ease: 'easeInOut' }}
                />
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="w-full flex flex-col gap-3">
              {/* ✨ Bouton Magique — Rejoindre une partie (Invité) */}
              <motion.button
                className="w-full text-base py-5 rounded-2xl font-nunito font-black text-white shadow-lg flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, hsl(var(--lumios-green)), hsl(var(--lumios-blue)))' }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setView('guest')}
              >
                <Gamepad2 className="w-6 h-6" />
                Rejoindre une partie
              </motion.button>

              <motion.button
                className="btn-primary w-full text-base py-4"
                whileTap={{ scale: 0.97 }}
                onClick={() => setView('signup')}
              >
                <Sparkles className="w-5 h-5" />
                Créer un compte
              </motion.button>
              <motion.button
                className="btn-glass w-full text-base py-4"
                whileTap={{ scale: 0.97 }}
                onClick={() => setView('login')}
              >
                J'ai déjà un compte
              </motion.button>
            </div>

            <p className="text-xs text-muted-foreground text-center px-4">
              Rejoingnez sans compte ou créez un profil pour sauvegarder votre progression.
            </p>
          </motion.div>
        )}

        {/* ── GUEST (Invité) ────────────────────────────────────────────────── */}
        {view === 'guest' && (
          <motion.div
            key="guest"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="w-full max-w-sm"
          >
            <button onClick={() => setView('welcome')} className="flex items-center gap-1 text-muted-foreground mb-6 text-sm font-semibold">
              <ChevronLeft className="w-4 h-4" /> Retour
            </button>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'hsl(var(--lumios-green)/0.12)' }}>
                <Gamepad2 className="w-5 h-5" style={{ color: 'hsl(var(--lumios-green))' }} />
              </div>
              <div>
                <h2 className="text-2xl font-nunito font-black">Mode Invité</h2>
                <p className="text-muted-foreground text-xs">Jouez sans créer de compte !</p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <Field label="Votre Pseudo" error={errors.guestPseudo}>
                <input
                  className="input-lumios text-lg font-bold"
                  placeholder="StarWarrior"
                  maxLength={20}
                  value={guestPseudo}
                  onChange={e => setGuestPseudo(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1 text-right">{guestPseudo.length}/20</p>
              </Field>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">Avatar rapide</label>
                <div className="grid grid-cols-6 gap-2">
                  {AVATARS.map(a => (
                    <motion.button
                      key={a}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setGuestAvatar(a)}
                      className={`aspect-square rounded-xl text-2xl flex items-center justify-center transition-all ${
                        guestAvatar === a
                          ? 'gradient-lumios glow-ring scale-105'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      {a}
                    </motion.button>
                  ))}
                </div>
              </div>

              <motion.button
                className="w-full text-base py-4 rounded-2xl font-nunito font-black text-white shadow-lg flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, hsl(var(--lumios-green)), hsl(var(--lumios-blue)))' }}
                whileTap={{ scale: 0.97 }}
                onClick={handleGuestJoin}
              >
                <QrCode className="w-5 h-5" />
                Scanner & Jouer !
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* ── LOGIN ────────────────────────────────────────────────────────── */}
        {view === 'login' && (
          <motion.div
            key="login"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="w-full max-w-sm"
          >
            <button onClick={() => setView('welcome')} className="flex items-center gap-1 text-muted-foreground mb-6 text-sm font-semibold">
              <ChevronLeft className="w-4 h-4" /> Retour
            </button>
            <h2 className="text-2xl font-nunito font-black mb-1" style={{ color: 'hsl(var(--foreground))' }}>Connexion</h2>
            <p className="text-muted-foreground text-sm mb-6">Bienvenue ! Connectez votre compte.</p>

            <div className="flex flex-col gap-4">
              <Field label="Email" error={errors.email}>
                <input className="input-lumios" type="email" placeholder="email@example.fr" value={email} onChange={e => setEmail(e.target.value)} />
              </Field>
              <Field label="Mot de passe" error={errors.password}>
                <div className="relative">
                  <input className="input-lumios pr-12" type={showPwd ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
                  <button type="button" onClick={() => setShowPwd(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </Field>
              <motion.button className="btn-primary w-full py-4 mt-2" whileTap={{ scale: 0.97 }} onClick={handleLogin} disabled={isLoading}>
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Se connecter'}
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* ── SIGNUP (multi-step) ───────────────────────────────────────────── */}
        {view === 'signup' && (
          <motion.div
            key="signup"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="w-full max-w-sm"
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <button onClick={() => signupStep > 1 ? setSignupStep(s => s - 1) : setView('welcome')} className="text-muted-foreground">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex-1">
                <div className="progress-bar">
                  <div className="progress-bar-fill" style={{ width: `${(signupStep / (accountType === 'individual' ? 5 : TOTAL_STEPS)) * 100}%` }} />
                </div>
              </div>
              <span className="text-xs font-bold text-muted-foreground">{signupStep}/{accountType === 'individual' ? 5 : TOTAL_STEPS}</span>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={signupStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {/* Step 1 — Type de compte */}
                {signupStep === 1 && (
                  <div className="flex flex-col gap-4">
                    <div>
                      <h2 className="text-xl font-nunito font-black mb-0.5">Type de compte</h2>
                      <p className="text-muted-foreground text-sm">Choisissez votre mode d'utilisation.</p>
                    </div>
                    <div className="flex flex-col gap-3">
                      {[
                        { val: 'family' as AccountType, icon: <Users className="w-6 h-6" />, label: 'Compte Famille', desc: 'Gérez plusieurs profils (enfants, membres). Actions protégées par PIN.', badge: 'Recommandé' },
                        { val: 'individual' as AccountType, icon: <User className="w-6 h-6" />, label: 'Compte Individuel', desc: 'Autonome, pour les +12 ans. Un seul profil joueur.', badge: '+12 ans' },
                      ].map(opt => (
                        <motion.button
                          key={opt.val}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => setAccountType(opt.val)}
                          className={`flex items-start gap-4 p-5 rounded-2xl border-2 text-left transition-all ${
                            accountType === opt.val
                              ? 'border-primary bg-primary/5 glow-ring'
                              : 'border-border bg-card'
                          }`}
                        >
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            accountType === opt.val ? 'gradient-lumios text-white' : 'bg-muted text-muted-foreground'
                          }`}>
                            {opt.icon}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="font-nunito font-black text-sm">{opt.label}</span>
                              <span className="badge-lumios badge-blue text-[10px]">{opt.badge}</span>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">{opt.desc}</p>
                          </div>
                          {accountType === opt.val && (
                            <div className="w-6 h-6 gradient-lumios rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                              <Check className="w-3.5 h-3.5 text-white" />
                            </div>
                          )}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 2 — Infos personnelles */}
                {signupStep === 2 && (
                  <div className="flex flex-col gap-4">
                    <div>
                      <h2 className="text-xl font-nunito font-black mb-0.5">
                        {accountType === 'family' ? 'Compte du parent' : 'Vos informations'}
                      </h2>
                      <p className="text-muted-foreground text-sm">Vos données restent privées.</p>
                    </div>
                    <Field label="Prénom" error={errors.parentName}>
                      <input className="input-lumios" placeholder="Marie" value={parentName} onChange={e => setParentName(e.target.value)} />
                    </Field>
                    <Field label="Email" error={errors.email}>
                      <input className="input-lumios" type="email" placeholder="marie@email.fr" value={email} onChange={e => setEmail(e.target.value)} />
                    </Field>
                    <Field label="Mot de passe" error={errors.password}>
                      <div className="relative">
                        <input className="input-lumios pr-12" type={showPwd ? 'text' : 'password'} placeholder="Minimum 6 caractères" value={password} onChange={e => setPassword(e.target.value)} />
                        <button type="button" onClick={() => setShowPwd(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </Field>
                  </div>
                )}

                {/* Step 3 — Pseudo + Avatar */}
                {signupStep === 3 && (
                  <div className="flex flex-col gap-4">
                    <div>
                      <h2 className="text-xl font-nunito font-black mb-0.5">Votre profil joueur</h2>
                      <p className="text-muted-foreground text-sm">
                        {accountType === 'family' ? 'C\'est votre profil de jeu en tant que parent.' : 'Visible par les autres joueurs.'}
                      </p>
                    </div>
                    <Field label="Pseudo" error={errors.pseudo}>
                      <input
                        className="input-lumios text-lg font-bold"
                        placeholder="StarWarrior"
                        maxLength={20}
                        value={pseudo}
                        onChange={e => setPseudo(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground mt-1 text-right">{pseudo.length}/20</p>
                    </Field>
                    <div>
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">Avatar</label>
                      <div className="grid grid-cols-6 gap-2">
                        {AVATARS.map(a => (
                          <motion.button
                            key={a}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setAvatar(a)}
                            className={`aspect-square rounded-xl text-2xl flex items-center justify-center transition-all ${
                              avatar === a ? 'gradient-lumios glow-ring scale-105' : 'bg-muted hover:bg-muted/80'
                            }`}
                          >
                            {a}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 4 — Age range */}
                {signupStep === 4 && (
                  <div className="flex flex-col gap-4">
                    <div>
                      <h2 className="text-xl font-nunito font-black mb-0.5">Tranche d'âge</h2>
                      <p className="text-muted-foreground text-sm">Pour personnaliser l'expérience.</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      {AGE_RANGES.map(ar => (
                        <motion.button
                          key={ar.value}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setAgeRange(ar.value)}
                          className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                            ageRange === ar.value
                              ? 'border-primary bg-primary/5'
                              : 'border-border bg-card hover:border-border/80'
                          }`}
                        >
                          <div className="text-left">
                            <p className="font-nunito font-bold">{ar.label}</p>
                            {ar.sub && <p className="text-xs text-muted-foreground">{ar.sub}</p>}
                          </div>
                          {ageRange === ar.value && (
                            <div className="w-6 h-6 gradient-lumios rounded-full flex items-center justify-center">
                              <Check className="w-3.5 h-3.5 text-white" />
                            </div>
                          )}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 5 — Has Lumios? */}
                {signupStep === 5 && (
                  <div className="flex flex-col gap-5">
                    <div>
                      <h2 className="text-xl font-nunito font-black mb-0.5">Possédez-vous un Lumios ?</h2>
                      <p className="text-muted-foreground text-sm">Débloque un badge 🌟 spécial.</p>
                    </div>
                    {errors.hasLumios && <p className="text-accent text-sm">{errors.hasLumios}</p>}
                    <div className="flex gap-4">
                      {[
                        { val: true, emoji: '⚡', label: 'Oui !', desc: 'J\'ai un set Lumios' },
                        { val: false, emoji: '👀', label: 'Pas encore', desc: 'Je découvre' },
                      ].map(opt => (
                        <motion.button
                          key={String(opt.val)}
                          whileTap={{ scale: 0.96 }}
                          onClick={() => setHasLumios(opt.val)}
                          className={`flex-1 flex flex-col items-center gap-2 p-5 rounded-3xl border-2 transition-all ${
                            hasLumios === opt.val
                              ? 'border-primary bg-primary/5 glow-ring'
                              : 'border-border bg-card'
                          }`}
                        >
                          <span className="text-4xl">{opt.emoji}</span>
                          <span className="font-nunito font-bold text-sm">{opt.label}</span>
                          <span className="text-xs text-muted-foreground">{opt.desc}</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 6 — Ajouter des membres (Famille only) */}
                {signupStep === 6 && accountType === 'family' && (
                  <div className="flex flex-col gap-4">
                    <div>
                      <h2 className="text-xl font-nunito font-black mb-0.5">Votre famille</h2>
                      <p className="text-muted-foreground text-sm">Ajoutez des membres qui joueront avec Lumios.</p>
                    </div>

                    {!addingMember ? (
                      <div className="flex flex-col gap-3">
                        {pendingMembers.map((pm, i) => (
                          <div key={i} className="flex items-center gap-3 p-3 bg-muted rounded-xl">
                            <div className="w-10 h-10 gradient-lumios rounded-xl flex items-center justify-center text-lg">{pm.avatar}</div>
                            <div className="flex-1">
                              <p className="font-nunito font-bold text-sm">{pm.pseudo}</p>
                              <p className="text-xs text-muted-foreground">{pm.ageRange} ans</p>
                            </div>
                            <button onClick={() => setPendingMembers(prev => prev.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-accent p-2">
                              Sup.
                            </button>
                          </div>
                        ))}

                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          onClick={() => setAddingMember(true)}
                          className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-dashed border-primary/40 text-primary hover:bg-primary/5 transition-all"
                        >
                          <div className="w-12 h-12 gradient-lumios rounded-xl flex items-center justify-center text-white">
                            <Users className="w-6 h-6" />
                          </div>
                          <div className="text-left">
                            <p className="font-nunito font-bold text-sm">Ajouter un membre</p>
                            <p className="text-xs text-muted-foreground">Enfant, frère, sœur…</p>
                          </div>
                        </motion.button>

                        <p className="text-xs text-muted-foreground text-center">
                          Vous pourrez aussi ajouter des membres plus tard via QR Code.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 p-4 bg-muted/30 rounded-2xl border border-border">
                        <Field label="Pseudo du membre" error={errors.memberPseudo}>
                          <input className="input-lumios" placeholder="Pseudo de l'enfant" maxLength={20} value={memberPseudo} onChange={e => { setMemberPseudo(e.target.value); setErrors({}); }} />
                        </Field>
                        <div>
                          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">Avatar</label>
                          <div className="grid grid-cols-6 gap-2">
                            {AVATARS.slice(0, 6).map(a => (
                              <button key={a} onClick={() => setMemberAvatar(a)} className={`aspect-square rounded-xl text-xl flex items-center justify-center transition-all ${memberAvatar === a ? 'gradient-lumios scale-105' : 'bg-muted'}`}>
                                {a}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">Âge</label>
                          <div className="grid grid-cols-2 gap-2">
                            {AGE_RANGES.slice(0, 4).map(ar => (
                              <button key={ar.value} onClick={() => setMemberAge(ar.value)} className={`p-2 rounded-xl text-xs font-bold border-2 transition-all ${memberAge === ar.value ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}>
                                {ar.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">Lien de parenté</label>
                          <div className="flex flex-wrap gap-2">
                            {FAMILY_RELATIONS.map(r => (
                              <button key={r} onClick={() => setMemberRelation(r)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${memberRelation === r ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground'}`}>
                                {r}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2 mt-1">
                          <button className="btn-glass flex-1 py-2.5 text-sm" onClick={() => setAddingMember(false)}>Annuler</button>
                          <button className="btn-primary flex-1 py-2.5 text-sm" onClick={handleAddPendingMember} disabled={isLoading}>
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : <><Check className="w-4 h-4" /> Ajouter</>}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Next button */}
            <motion.button
              className="btn-primary w-full py-4 mt-8"
              whileTap={{ scale: 0.97 }}
              onClick={handleNext}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (
                signupStep === TOTAL_STEPS || (signupStep === 5 && accountType === 'individual')
                  ? 'Créer mon compte 🎉'
                  : <><span>Suivant</span> <ChevronRight className="w-5 h-5" /></>
              )}
            </motion.button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1 block">{label}</label>
      {children}
      {error && <p className="text-accent text-xs mt-1">{error}</p>}
    </div>
  );
}
