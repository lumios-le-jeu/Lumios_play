-- Ajout de la politique d'INSERT sur profiles
-- Nécessaire pour permettre la création de profils enfants à l'inscription

DROP POLICY IF EXISTS "Parents can insert profiles" ON profiles;

CREATE POLICY "Parents can insert profiles" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = (SELECT auth_id FROM parent_accounts WHERE id = parent_id));
