-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │  Lumios Play — Migration v2.0                                              │
-- │  Système de rangs par paliers, modes de jeu, validation des scores         │
-- │  À exécuter dans l'éditeur SQL Supabase (Studio > SQL Editor)              │
-- └─────────────────────────────────────────────────────────────────────────────┘

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. TABLE PROFILES — Ajouter les champs de rang et gamification
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'family',
  ADD COLUMN IF NOT EXISTS rank_tier TEXT DEFAULT 'bronze',
  ADD COLUMN IF NOT EXISTS rank_step INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS season_xp INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS win_streak INTEGER DEFAULT 0;

-- Mettre à jour les profils existants qui n'ont pas de rank_tier
UPDATE profiles SET rank_tier = 'bronze', rank_step = 0 WHERE rank_tier IS NULL;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. TABLE PARENT_ACCOUNTS — Ajouter le type de compte
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE parent_accounts
  ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'family';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. TABLE MATCHES — Ajouter mode, score détaillé, validation, commentaires
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS match_mode TEXT DEFAULT 'competitive',
  ADD COLUMN IF NOT EXISTS score_detail TEXT,
  ADD COLUMN IF NOT EXISTS comment_winner TEXT,
  ADD COLUMN IF NOT EXISTS comment_loser TEXT,
  ADD COLUMN IF NOT EXISTS media_url TEXT,
  ADD COLUMN IF NOT EXISTS validated_by_loser BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS contested BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS step_change_p1 INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS step_change_p2 INTEGER DEFAULT 0;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. STORAGE BUCKET — Pour les photos/vidéos souvenir de match
-- ═══════════════════════════════════════════════════════════════════════════════

-- Ce INSERT est idempotent grâce à ON CONFLICT
INSERT INTO storage.buckets (id, name, public)
VALUES ('match-media', 'match-media', true)
ON CONFLICT (id) DO NOTHING;

-- Politique d'accès public en lecture
DROP POLICY IF EXISTS "Match media is publicly accessible" ON storage.objects;
CREATE POLICY "Match media is publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'match-media');

-- Politique d'upload pour utilisateurs authentifiés
DROP POLICY IF EXISTS "Users can upload match media" ON storage.objects;
CREATE POLICY "Users can upload match media"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'match-media');

-- ═══════════════════════════════════════════════════════════════════════════════
-- FIN DE LA MIGRATION
-- ═══════════════════════════════════════════════════════════════════════════════
-- Vérification : SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles';
