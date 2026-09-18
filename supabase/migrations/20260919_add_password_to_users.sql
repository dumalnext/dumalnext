-- ==============================================================================
-- DUMAL-NEXT: ADD PASSWORD COLUMN TO USERS TABLE
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard/project/fvybtqghtuarjzlpbwnr/sql)
-- ==============================================================================

ALTER TABLE public.users 
    ADD COLUMN IF NOT EXISTS password VARCHAR(255);

-- Enable RLS and permissive policy for development
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Allow all on users'
    ) THEN
        CREATE POLICY "Allow all on users" ON public.users FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
