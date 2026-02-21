-- Add current_club field to players table
ALTER TABLE public.fm_players 
ADD COLUMN IF NOT EXISTS current_club TEXT;

-- Update existing players with their real 2026 clubs
UPDATE public.fm_players SET current_club = 'Valencia CF' WHERE name LIKE '%Mamardashvili%';
UPDATE public.fm_players SET current_club = 'Liverpool FC' WHERE name LIKE '%Becker%' OR name LIKE '%Alexander-Arnold%';
UPDATE public.fm_players SET current_club = 'Real Madrid' WHERE name LIKE '%Mbappé%' OR name LIKE '%Mbappe%' OR name LIKE '%Bellingham%' OR name LIKE '%Militão%' OR name LIKE '%van Dijk%';
UPDATE public.fm_players SET current_club = 'Real Madrid' WHERE name LIKE '%Júnior%' AND name LIKE '%V.%';
UPDATE public.fm_players SET current_club = 'Manchester City' WHERE name LIKE '%Haaland%' OR name LIKE '%Rodri%' OR name LIKE '%De Bruyne%';
UPDATE public.fm_players SET current_club = 'Bayern Munich' WHERE name LIKE '%Kane%' OR name LIKE '%Musiala%';
UPDATE public.fm_players SET current_club = 'Lyon FC' WHERE name LIKE '%Mikautadze%';