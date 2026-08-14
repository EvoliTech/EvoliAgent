-- Add cro column to especialistas table
ALTER TABLE public.especialistas ADD COLUMN IF NOT EXISTS cro text;
