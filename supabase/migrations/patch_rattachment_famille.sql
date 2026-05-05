-- Migration pour permettre le rattachement à une famille sans perdre l'autonomie du compte individuel
-- À exécuter dans Supabase SQL Editor

-- 1. Ajouter la colonne de rattachement
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS rattachment_parent_id UUID REFERENCES public.parent_accounts(id) ON DELETE SET NULL;

-- 2. Mettre à jour les politiques RLS pour permettre aux responsables de famille de voir les profils rattachés
DROP POLICY IF EXISTS "Family admins can view attached profiles" ON public.profiles;
CREATE POLICY "Family admins can view attached profiles" ON public.profiles
  FOR SELECT USING (
    auth.uid() = (SELECT auth_id FROM public.parent_accounts WHERE id = rattachment_parent_id)
  );

-- 3. Optionnel : Permettre aux responsables de famille de mettre à jour certaines infos (si besoin)
DROP POLICY IF EXISTS "Family admins can update attached profiles" ON public.profiles;
CREATE POLICY "Family admins can update attached profiles" ON public.profiles
  FOR UPDATE USING (
    auth.uid() = (SELECT auth_id FROM public.parent_accounts WHERE id = rattachment_parent_id)
  );
-- 4. Autoriser la lecture publique des noms de comptes familles (pour la recherche et l'affichage du rattachement)
DROP POLICY IF EXISTS "Public can view parent account names" ON public.parent_accounts;
CREATE POLICY "Public can view parent account names" ON public.parent_accounts
  FOR SELECT USING (true);
