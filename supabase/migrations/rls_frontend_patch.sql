-- Patch de sécurité global Supabase (Permissif pour le frontend)
-- Comme l'application Lumios Play fonctionne sans serveur dédié (Serverless via le frontend), 
-- les téléphones des joueurs envoient directement les instructions à Supabase.
-- Par exemple : lors d'une fin de match, le Gagnant met à jour son Elo, mais aussi celui du Perdant !
-- Si on bloque l'UPDATE strict sur soi-même, la mise à jour de l'adversaire plantera.

-- Profiles : Ajout de l'UPDATE pour que les stats puissent changer après un match
DROP POLICY IF EXISTS "Public profiles update" ON profiles;
CREATE POLICY "Public profiles update" ON profiles FOR UPDATE USING (true);

-- Matches : Ajout SELECT, INSERT, UPDATE
DROP POLICY IF EXISTS "Matches select" ON matches;
DROP POLICY IF EXISTS "Matches insert" ON matches;
DROP POLICY IF EXISTS "Matches update" ON matches;
CREATE POLICY "Matches select" ON matches FOR SELECT USING (true);
CREATE POLICY "Matches insert" ON matches FOR INSERT WITH CHECK (true);
CREATE POLICY "Matches update" ON matches FOR UPDATE USING (true);

-- Friends : Ajout SELECT, INSERT, UPDATE
DROP POLICY IF EXISTS "Friends select" ON friends;
DROP POLICY IF EXISTS "Friends insert" ON friends;
DROP POLICY IF EXISTS "Friends update" ON friends;
CREATE POLICY "Friends select" ON friends FOR SELECT USING (true);
CREATE POLICY "Friends insert" ON friends FOR INSERT WITH CHECK (true);
CREATE POLICY "Friends update" ON friends FOR UPDATE USING (true);

-- Arenas & Competitions (prévision si tu les sauvegardes en DB plus tard)
DROP POLICY IF EXISTS "Arenas select" ON arenas;
DROP POLICY IF EXISTS "Arenas insert" ON arenas;
DROP POLICY IF EXISTS "Arenas update" ON arenas;
CREATE POLICY "Arenas select" ON arenas FOR SELECT USING (true);
CREATE POLICY "Arenas insert" ON arenas FOR INSERT WITH CHECK (true);
CREATE POLICY "Arenas update" ON arenas FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Competitions select" ON competitions;
DROP POLICY IF EXISTS "Competitions insert" ON competitions;
DROP POLICY IF EXISTS "Competitions update" ON competitions;
CREATE POLICY "Competitions select" ON competitions FOR SELECT USING (true);
CREATE POLICY "Competitions insert" ON competitions FOR INSERT WITH CHECK (true);
CREATE POLICY "Competitions update" ON competitions FOR UPDATE USING (true);
