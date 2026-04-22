-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │  Lumios Play — Patch v3 · Profils                                          │
-- │  Ajoute first_name / last_name sur la table profiles                        │
-- │  + contrainte age_range sur les nouvelles tranches                           │
-- │                                                                             │
-- │  ⚠  À exécuter APRÈS avoir nettoyé la base (clean database)                │
-- │     dans Supabase Studio > SQL Editor                                        │
-- └─────────────────────────────────────────────────────────────────────────────┘

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. Ajouter les colonnes first_name et last_name sur profiles
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name  TEXT;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. Mettre à jour la contrainte age_range (nouvelles tranches)
--    Anciennes : 6-8 | 9-11 | 12-14 | 15-17 | 18+
--    Nouvelles  : 4-6 | 7-9 | 10-13 | 14-18 | 18+
-- ═══════════════════════════════════════════════════════════════════════════════

-- Supprimer l'ancienne contrainte si elle existe
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_age_range_check;

-- Ajouter la nouvelle contrainte
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_age_range_check
  CHECK (age_range IN ('4-6', '7-9', '10-13', '14-18', '18+'));

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. S'assurer que la contrainte account_type est en place
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_account_type_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_account_type_check
  CHECK (account_type IN ('family', 'individual'));

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. RLS - Autoriser UPDATE complet sur profiles (nécessaire côté frontend)
-- ═══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Public profiles update" ON public.profiles;
CREATE POLICY "Public profiles update" ON public.profiles
  FOR UPDATE USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. Vérification finale (à décommenter pour tester)
-- ═══════════════════════════════════════════════════════════════════════════════
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'profiles'
-- ORDER BY ordinal_position;
