-- Ajout de la colonne 'relation' et 'account_type' manquantes sur la table profiles

ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS relation TEXT,
  ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'family';
