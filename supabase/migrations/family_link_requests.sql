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

CREATE POLICY "Requests visible to requester and family admin"
  ON public.family_link_requests
  FOR SELECT
  USING (
    requester_profile_id = auth.uid()::uuid
    OR family_parent_id IN (
      SELECT id FROM public.parent_accounts WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Requester can insert"
  ON public.family_link_requests
  FOR INSERT
  WITH CHECK (requester_profile_id IN (
    SELECT id FROM public.profiles WHERE parent_id IN (
      SELECT id FROM public.parent_accounts WHERE auth_id = auth.uid()
    )
  ));

CREATE POLICY "Family admin can update status"
  ON public.family_link_requests
  FOR UPDATE
  USING (
    family_parent_id IN (
      SELECT id FROM public.parent_accounts WHERE auth_id = auth.uid()
    )
  );
