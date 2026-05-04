-- Migration: Add XP tracking to matches table
ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS xp_change_p1 INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS xp_change_p2 INTEGER DEFAULT 0;

-- Update existing matches with an estimate (optional, but good for consistency)
-- This is a simple heuristic: 100 XP for winner, 10 XP for loser
UPDATE public.matches
SET 
  xp_change_p1 = CASE WHEN winner_id = player1_id THEN 100 ELSE 10 END,
  xp_change_p2 = CASE WHEN winner_id = player2_id THEN 100 ELSE 10 END
WHERE xp_change_p1 = 0 AND xp_change_p2 = 0 AND match_mode = 'competitive';
