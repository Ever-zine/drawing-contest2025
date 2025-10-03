-- Migration: create comment_likes table + indexes + RLS + trigger
-- Execute in Supabase SQL editor

BEGIN;

-- Ensure extensions (pgcrypto for gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create table
CREATE TABLE IF NOT EXISTS public.comment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL,
  drawing_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Foreign key to comments
ALTER TABLE public.comment_likes
  ADD CONSTRAINT comment_likes_fk_comment
  FOREIGN KEY (comment_id)
  REFERENCES public.comments (id)
  ON DELETE CASCADE;

-- Foreign key to drawings
ALTER TABLE public.comment_likes
  ADD CONSTRAINT comment_likes_fk_drawing
  FOREIGN KEY (drawing_id)
  REFERENCES public.drawings (id)
  ON DELETE CASCADE;

-- Optional FK to public.users if present
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='users') THEN
    ALTER TABLE public.comment_likes
      ADD CONSTRAINT comment_likes_fk_user
      FOREIGN KEY (user_id)
      REFERENCES public.users (id)
      ON DELETE CASCADE;
  END IF;
END$$;

-- Unique constraint: one like per user per comment
ALTER TABLE public.comment_likes
  ADD CONSTRAINT comment_likes_unique_user_comment UNIQUE (comment_id, user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON public.comment_likes (comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_drawing_id ON public.comment_likes (drawing_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON public.comment_likes (user_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_created_at ON public.comment_likes (created_at DESC);

COMMIT;

-- =========================
-- RLS and trigger (separate transaction recommended)
-- =========================

BEGIN;

-- 1) Optional trigger to ensure user_id default to auth.uid() and set created_at
CREATE OR REPLACE FUNCTION public.comment_likes_set_user_and_timestamp()
RETURNS trigger AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    IF NEW.user_id IS NULL THEN
      NEW.user_id := auth.uid()::uuid;
    END IF;
    NEW.created_at := COALESCE(NEW.created_at, now());
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS comment_likes_set_user_and_timestamp ON public.comment_likes;
CREATE TRIGGER comment_likes_set_user_and_timestamp
BEFORE INSERT ON public.comment_likes
FOR EACH ROW EXECUTE FUNCTION public.comment_likes_set_user_and_timestamp();

-- 2) Enable RLS
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

-- 3) Policies
-- SELECT: allow public read (change to authenticated-only if desired)
CREATE POLICY IF NOT EXISTS "comment_likes_select_public" ON public.comment_likes
FOR SELECT USING (true);

-- INSERT: only authenticated users and enforce user_id == auth.uid()
CREATE POLICY IF NOT EXISTS "comment_likes_insert_authenticated" ON public.comment_likes
FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated' AND COALESCE(user_id::text, auth.uid()) = auth.uid()
);

-- UPDATE: only the owner or admin (JWT claim is_admin = true)
CREATE POLICY IF NOT EXISTS "comment_likes_update_owner_or_admin" ON public.comment_likes
FOR UPDATE
USING (
  (user_id::text = auth.uid()) OR ((auth.jwt() ->> 'is_admin')::boolean = true)
)
WITH CHECK (
  (user_id::text = auth.uid()) OR ((auth.jwt() ->> 'is_admin')::boolean = true)
);

-- DELETE: only the owner or admin
CREATE POLICY IF NOT EXISTS "comment_likes_delete_owner_or_admin" ON public.comment_likes
FOR DELETE
USING (
  (user_id::text = auth.uid()) OR ((auth.jwt() ->> 'is_admin')::boolean = true)
);

COMMIT;

-- Notes:
-- - If you prefer only authenticated users to read comment_likes, replace the SELECT policy with one checking auth.role() = 'authenticated'.
-- - The admin check uses a JWT claim 'is_admin'. Adjust according to your auth setup (or use a check against public.users.is_admin).
-- - Run this migration once. If you re-run, drop triggers/policies as needed or use IF NOT EXISTS clauses.
