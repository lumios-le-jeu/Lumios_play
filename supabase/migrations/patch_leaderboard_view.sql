-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │  Lumios Play — Patch leaderboard_view                                       │
-- │  Corrige le match_count et le classement par tier+XP                        │
-- │  ► À exécuter dans Supabase Studio > SQL Editor                             │
-- └─────────────────────────────────────────────────────────────────────────────┘

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. Supprimer l'ancienne vue si elle existe
-- ═══════════════════════════════════════════════════════════════════════════════
DROP VIEW IF EXISTS public.leaderboard_view;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. Recréer la vue avec match_count calculé directement depuis matches
--    + tier_weight correct pour le tri
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE VIEW public.leaderboard_view AS
SELECT
  p.id            AS profile_id,
  p.pseudo,
  p.avatar_emoji,
  p.has_lumios,
  p.elo,
  p.city,
  COALESCE(p.rank_tier, 'bronze')   AS rank_tier,
  COALESCE(p.rank_step, 0)          AS rank_step,
  COALESCE(p.season_xp, 0)         AS season_xp,

  -- tier_weight : plus élevé = meilleur tier
  CASE COALESCE(p.rank_tier, 'bronze')
    WHEN 'mythic'   THEN 6
    WHEN 'diamond'  THEN 5
    WHEN 'platinum' THEN 4
    WHEN 'gold'     THEN 3
    WHEN 'silver'   THEN 2
    WHEN 'bronze'   THEN 1
    ELSE 0
  END AS tier_weight,

  -- match_count : nombre réel de matchs joués (depuis la table matches)
  COALESCE((
    SELECT COUNT(*)
    FROM public.matches m
    WHERE m.player1_id = p.id
       OR m.player2_id = p.id
  ), 0)::INTEGER AS match_count,

  -- win_count : victoires réelles
  COALESCE((
    SELECT COUNT(*)
    FROM public.matches m
    WHERE m.winner_id = p.id
  ), 0)::INTEGER AS win_count

FROM public.profiles p;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. Politique RLS pour que la vue soit lisible publiquement
-- ═══════════════════════════════════════════════════════════════════════════════
-- (les vues héritent des RLS des tables sous-jacentes,
--  rien à faire si profiles est déjà en SELECT USING(true))

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. Vérification (décommenter pour tester)
-- ═══════════════════════════════════════════════════════════════════════════════
-- SELECT profile_id, pseudo, tier_weight, rank_step, season_xp, match_count
-- FROM public.leaderboard_view
-- ORDER BY tier_weight DESC, rank_step DESC, season_xp DESC
-- LIMIT 20;
