import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Eye, EyeOff, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import type { ParentAccount, ChildProfile, AgeRange } from '../../lib/types';
import { validatePseudo } from '../../lib/utils';
import { createParentAccount, loginParent, createChildProfile } from '../../lib/api';
import { Loader2 } from 'lucide-react';

const AVATARS = ['🦁', '🐯', '🦊', '🐺', '🦅', '🦈', '🐉', '🦋'];
const AGE_RANGES: { value: AgeRange; label: string; sub: string }[] = [
  { value: '6-8',   label: '6 – 8 ans',   sub: 'Compte parent requis' },
  { value: '9-11',  label: '9 – 11 ans',  sub: 'Compte parent requis' },
  { value: '12-14', label: '12 – 14 ans', sub: '' },
  { value: '15-17', label: '15 – 17 ans', sub: '' },
];

interface AuthScreenProps {
  onAuthComplete: (parent: ParentAccount) => void;
}

type AuthView = 'welcome' | 'login' | 'signup';

export default function AuthScreen({ onAuthComplete }: AuthScreenProps) {
  const [view, setView] = useState<AuthView>('welcome');
  const [signupStep, setSignupStep] = useState(1);
  const TOTAL_STEPS = 5;

  // Form state
  const [parentName, setParentName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [pseudo, setPseudo] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [ageRange, setAgeRange] = useState<AgeRange>('12-14');
  const [hasLumios, setHasLumios] = useState<boolean | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateStep = (): boolean => {
    const e: Record<string, string> = {};
    if (signupStep === 1) {
      if (!parentName.trim()) e.parentName = 'Prénom requis';
      if (!email.includes('@')) e.email = 'Email invalide';
      if (password.length < 6) e.password = 'Minimum 6 caractères';
    }
    if (signupStep === 2) {
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
    if (signupStep < TOTAL_STEPS) {
      setSignupStep(s => s + 1);
    } else {
      setIsLoading(true);
      const { data: parentData, error: parentErr } = await createParentAccount(email, parentName);
      if (parentErr || !parentData) {
        setErrors({ hasLumios: 'Erreur création parent: ' + (parentErr?.message || 'Erreur inconnue') });
        setIsLoading(false);
        return;
      }
      
      const { error: profileErr } = await createChildProfile({
        parentId: parentData.id,
        pseudo,
        avatarEmoji: avatar,
        ageRange,
        hasLumios: !!hasLumios,
        elo: 800,
        city: 'Inconnue'
      });
      
      setIsLoading(false);
      onAuthComplete(parentData);
    }
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
            className="w-full max-w-sm flex flex-col items-center gap-8"
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
            <div className="flex items-center gap-3 my-2">
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
              <motion.button
                className="btn-primary w-full text-base py-4"
                whileTap={{ scale: 0.97 }}
                onClick={() => setView('signup')}
              >
                <Sparkles className="w-5 h-5" />
                Créer un compte parent
              </motion.button>
              <motion.button
                className="btn-glass w-full text-base py-4"
                whileTap={{ scale: 0.97 }}
                onClick={() => setView('login')}
              >
                J'ai déjà un compte
              </motion.button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Application réservée aux familles avec enfants.<br/>
              Les —12 ans nécessitent un compte parent.
            </p>
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
            <p className="text-muted-foreground text-sm mb-6">Bienvenue ! Connectez votre compte parent.</p>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1 block">Email</label>
                <input className="input-lumios" type="email" placeholder="parent@email.fr" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1 block">Mot de passe</label>
                <div className="relative">
                  <input className="input-lumios pr-12" type={showPwd ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
                  <button type="button" onClick={() => setShowPwd(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
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
                  <div className="progress-bar-fill" style={{ width: `${(signupStep / TOTAL_STEPS) * 100}%` }} />
                </div>
              </div>
              <span className="text-xs font-bold text-muted-foreground">{signupStep}/{TOTAL_STEPS}</span>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={signupStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {/* Step 1 — Parent */}
                {signupStep === 1 && (
                  <div className="flex flex-col gap-4">
                    <div>
                      <h2 className="text-xl font-nunito font-black mb-0.5">Compte parent</h2>
                      <p className="text-muted-foreground text-sm">Vos informations restent privées.</p>
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

                {/* Step 2 — Pseudo */}
                {signupStep === 2 && (
                  <div className="flex flex-col gap-4">
                    <div>
                      <h2 className="text-xl font-nunito font-black mb-0.5">Pseudo de votre enfant</h2>
                      <p className="text-muted-foreground text-sm">Visible dans l'application. Max 20 caractères.</p>
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
                  </div>
                )}

                {/* Step 3 — Avatar */}
                {signupStep === 3 && (
                  <div className="flex flex-col gap-5">
                    <div>
                      <h2 className="text-xl font-nunito font-black mb-0.5">Choisissez un avatar</h2>
                      <p className="text-muted-foreground text-sm">L'emoji qui vous représente.</p>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      {AVATARS.map(a => (
                        <motion.button
                          key={a}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setAvatar(a)}
                          className={`aspect-square rounded-2xl text-4xl flex items-center justify-center transition-all ${
                            avatar === a
                              ? 'gradient-lumios glow-ring scale-105'
                              : 'bg-muted hover:bg-muted/80'
                          }`}
                        >
                          {a}
                        </motion.button>
                      ))}
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Avatar sélectionné :</p>
                      <span className="text-5xl">{avatar}</span>
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
                      <h2 className="text-xl font-nunito font-black mb-0.5">Possède un Lumios ?</h2>
                      <p className="text-muted-foreground text-sm">Débloque un badge 🌟 spécial et des fonctionnalités.</p>
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
              </motion.div>
            </AnimatePresence>

            {/* Next button */}
            <motion.button
              className="btn-primary w-full py-4 mt-8"
              whileTap={{ scale: 0.97 }}
              onClick={handleNext}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : signupStep === TOTAL_STEPS ? 'Créer mon compte 🎉' : (
                <>Suivant <ChevronRight className="w-5 h-5" /></>
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
