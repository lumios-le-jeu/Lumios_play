-- Migration SQL pour la fonctionnalité de liaison famille (#15)
-- À exécuter dans Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.family_link_requests (
  id            uuid         DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_profile_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  family_parent_id      uuid NOT NULL REFERENCES public.parent_accounts(id) ON DELETE CASCADE,
  status        text         NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at    timestamptz  DEFAULT now(),
  UNIQUE (requester_profile_id, family_parent_id)
);

-- RLS
ALTER TABLE public.family_link_requests ENABLE ROW LEVEL SECURITY;

-- 1. Visibilité : le demandeur et l'administrateur de la famille cible peuvent voir la demande
DROP POLICY IF EXISTS "Requests visible to requester and family admin" ON public.family_link_requests;
CREATE POLICY "Requests visible to requester and family admin"
  ON public.family_link_requests
  FOR SELECT
  USING (
    requester_profile_id IN (
      SELECT p.id FROM public.profiles p
      JOIN public.parent_accounts pa ON p.parent_id = pa.id
      WHERE pa.auth_id = auth.uid()
    )
    OR family_parent_id IN (
      SELECT id FROM public.parent_accounts WHERE auth_id = auth.uid()
    )
  );

-- 2. Création : un joueur peut créer une demande pour son propre profil
DROP POLICY IF EXISTS "Requester can insert" ON public.family_link_requests;
CREATE POLICY "Requester can insert"
  ON public.family_link_requests
  FOR INSERT
  WITH CHECK (
    requester_profile_id IN (
      SELECT p.id FROM public.profiles p
      JOIN public.parent_accounts pa ON p.parent_id = pa.id
      WHERE pa.auth_id = auth.uid()
    )
  );

-- 3. Mise à jour : l'administrateur de la famille peut accepter ou refuser
DROP POLICY IF EXISTS "Family admin can update status" ON public.family_link_requests;
CREATE POLICY "Family admin can update status"
  ON public.family_link_requests
  FOR UPDATE
  USING (
    family_parent_id IN (
      SELECT id FROM public.parent_accounts WHERE auth_id = auth.uid()
    )
  );
