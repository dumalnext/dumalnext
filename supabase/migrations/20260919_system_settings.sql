-- Migration: Create system_settings table for dynamic configurations (such as enrollment controls)
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access to system_settings
CREATE POLICY "Allow public read on system_settings" 
ON public.system_settings 
FOR SELECT 
USING (true);

-- Allow all/write on system_settings
CREATE POLICY "Allow all on system_settings" 
ON public.system_settings 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Seed initial enrollment control settings
INSERT INTO public.system_settings (key, value, updated_at)
VALUES (
    'enrollment_controls',
    '{"isEnrollmentOpen": false, "schoolYear": "2026–2027", "semester": "1st Semester", "closedMessage": "Online enrollment for S.Y. 2026–2027 is currently closed by the School Administrator. Please await official school announcements regarding the opening of admission schedules.", "updatedAt": "2026-09-19T06:00:00.000Z"}'::jsonb,
    now()
)
ON CONFLICT (key) DO NOTHING;
