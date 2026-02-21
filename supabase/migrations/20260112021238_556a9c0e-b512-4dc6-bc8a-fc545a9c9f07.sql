-- დავამატოთ მეტი ლიგა და ქვეყანა
INSERT INTO virtual_leagues (name, country, sport, icon, is_active) VALUES
('ლა ლიგა', 'ესპანეთი', 'soccer', '🇪🇸', true),
('სერია A', 'იტალია', 'soccer', '🇮🇹', true),
('პრემიერ ლიგა', 'ინგლისი', 'soccer', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', true),
('ბუნდესლიგა', 'გერმანია', 'soccer', '🇩🇪', true),
('ლიგა 1', 'საფრანგეთი', 'soccer', '🇫🇷', true),
('პრიმეირა ლიგა', 'პორტუგალია', 'soccer', '🇵🇹', true),
('ერედივიზიე', 'ჰოლანდია', 'soccer', '🇳🇱', true),
('სუპერ ლიგა', 'თურქეთი', 'soccer', '🇹🇷', true),
('ჟუპილერ ლიგა', 'ბელგია', 'soccer', '🇧🇪', true)
ON CONFLICT DO NOTHING;

-- ლა ლიგა გუნდები (ესპანეთი)
INSERT INTO virtual_teams (name, league_id, logo_url, strength) 
SELECT teams.team_name, l.id, '', teams.team_strength
FROM (
  SELECT 'რეალ მადრიდი' as team_name, 92 as team_strength UNION ALL
  SELECT 'ბარსელონა', 90 UNION ALL
  SELECT 'ატლეტიკო მადრიდი', 85 UNION ALL
  SELECT 'სევილია', 80 UNION ALL
  SELECT 'რეალ სოსიედადი', 78 UNION ALL
  SELECT 'რეალ ბეტისი', 77 UNION ALL
  SELECT 'ვალენსია', 75 UNION ALL
  SELECT 'ვილარეალი', 76 UNION ALL
  SELECT 'ათლეტიკ ბილბაო', 78 UNION ALL
  SELECT 'ოსასუნა', 70
) teams
CROSS JOIN virtual_leagues l WHERE l.name = 'ლა ლიგა';

-- სერია A გუნდები (იტალია)
INSERT INTO virtual_teams (name, league_id, logo_url, strength) 
SELECT teams.team_name, l.id, '', teams.team_strength
FROM (
  SELECT 'ინტერ მილანი' as team_name, 88 as team_strength UNION ALL
  SELECT 'იუვენტუსი', 86 UNION ALL
  SELECT 'მილანი', 84 UNION ALL
  SELECT 'ნაპოლი', 85 UNION ALL
  SELECT 'რომა', 80 UNION ALL
  SELECT 'ლაციო', 78 UNION ALL
  SELECT 'ატალანტა', 82 UNION ALL
  SELECT 'ფიორენტინა', 76 UNION ALL
  SELECT 'ტორინო', 72 UNION ALL
  SELECT 'ბოლონია', 74
) teams
CROSS JOIN virtual_leagues l WHERE l.name = 'სერია A';

-- პრემიერ ლიგა გუნდები (ინგლისი)
INSERT INTO virtual_teams (name, league_id, logo_url, strength) 
SELECT teams.team_name, l.id, '', teams.team_strength
FROM (
  SELECT 'მანჩესტერ სიტი' as team_name, 93 as team_strength UNION ALL
  SELECT 'ლივერპული', 90 UNION ALL
  SELECT 'არსენალი', 88 UNION ALL
  SELECT 'მანჩესტერ იუნაიტედი', 82 UNION ALL
  SELECT 'ტოტენჰემი', 80 UNION ALL
  SELECT 'ჩელსი', 83 UNION ALL
  SELECT 'ნიუკასლი', 79 UNION ALL
  SELECT 'ბრაიტონი', 76 UNION ALL
  SELECT 'ასტონ ვილა', 78 UNION ALL
  SELECT 'ვესტ ჰემი', 74
) teams
CROSS JOIN virtual_leagues l WHERE l.name = 'პრემიერ ლიგა';

-- ბუნდესლიგა გუნდები (გერმანია)
INSERT INTO virtual_teams (name, league_id, logo_url, strength) 
SELECT teams.team_name, l.id, '', teams.team_strength
FROM (
  SELECT 'ბაიერნ მიუნხენი' as team_name, 92 as team_strength UNION ALL
  SELECT 'ბორუსია დორტმუნდი', 86 UNION ALL
  SELECT 'ბაიერ ლევერკუზენი', 85 UNION ALL
  SELECT 'რბ ლაიპციგი', 84 UNION ALL
  SELECT 'აინტრახტ ფრანკფურტი', 78 UNION ALL
  SELECT 'ვოლფსბურგი', 75 UNION ALL
  SELECT 'ბორუსია მენხენგლადბახი', 74 UNION ALL
  SELECT 'შტუტგარტი', 76 UNION ALL
  SELECT 'უნიონ ბერლინი', 73 UNION ALL
  SELECT 'ფრაიბურგი', 74
) teams
CROSS JOIN virtual_leagues l WHERE l.name = 'ბუნდესლიგა';

-- ლიგა 1 გუნდები (საფრანგეთი)
INSERT INTO virtual_teams (name, league_id, logo_url, strength) 
SELECT teams.team_name, l.id, '', teams.team_strength
FROM (
  SELECT 'პარიზ სენ-ჟერმენი' as team_name, 91 as team_strength UNION ALL
  SELECT 'მარსელი', 82 UNION ALL
  SELECT 'ლიონი', 80 UNION ALL
  SELECT 'მონაკო', 79 UNION ALL
  SELECT 'ლილი', 78 UNION ALL
  SELECT 'ნიცა', 76 UNION ALL
  SELECT 'რენი', 77 UNION ALL
  SELECT 'ლანსი', 75 UNION ALL
  SELECT 'მონპელიე', 72 UNION ALL
  SELECT 'სტრასბურგი', 70
) teams
CROSS JOIN virtual_leagues l WHERE l.name = 'ლიგა 1';

-- პრიმეირა ლიგა გუნდები (პორტუგალია)
INSERT INTO virtual_teams (name, league_id, logo_url, strength) 
SELECT teams.team_name, l.id, '', teams.team_strength
FROM (
  SELECT 'პორტუ' as team_name, 85 as team_strength UNION ALL
  SELECT 'ბენფიკა', 86 UNION ALL
  SELECT 'სპორტინგი', 84 UNION ALL
  SELECT 'ბრაგა', 78 UNION ALL
  SELECT 'ვიტორია', 72
) teams
CROSS JOIN virtual_leagues l WHERE l.name = 'პრიმეირა ლიგა';

-- ერედივიზიე გუნდები (ჰოლანდია)
INSERT INTO virtual_teams (name, league_id, logo_url, strength) 
SELECT teams.team_name, l.id, '', teams.team_strength
FROM (
  SELECT 'აიაქსი' as team_name, 84 as team_strength UNION ALL
  SELECT 'პსვ აინდჰოვენი', 83 UNION ALL
  SELECT 'ფეიენორდი', 82 UNION ALL
  SELECT 'აზ ალკმაარი', 76 UNION ALL
  SELECT 'ტვენტე', 74
) teams
CROSS JOIN virtual_leagues l WHERE l.name = 'ერედივიზიე';

-- სუპერ ლიგა გუნდები (თურქეთი)
INSERT INTO virtual_teams (name, league_id, logo_url, strength) 
SELECT teams.team_name, l.id, '', teams.team_strength
FROM (
  SELECT 'გალატასარაი' as team_name, 82 as team_strength UNION ALL
  SELECT 'ფენერბაჰჩე', 81 UNION ALL
  SELECT 'ბეშიქთაში', 79 UNION ALL
  SELECT 'ტრაბზონსპორი', 77 UNION ALL
  SELECT 'ისტანბულ ბაშაკშეჰირი', 74
) teams
CROSS JOIN virtual_leagues l WHERE l.name = 'სუპერ ლიგა';

-- ჟუპილერ ლიგა გუნდები (ბელგია)
INSERT INTO virtual_teams (name, league_id, logo_url, strength) 
SELECT teams.team_name, l.id, '', teams.team_strength
FROM (
  SELECT 'კლუბ ბრიუგე' as team_name, 80 as team_strength UNION ALL
  SELECT 'გენკი', 78 UNION ALL
  SELECT 'ანდერლეხტი', 76 UNION ALL
  SELECT 'სტანდარდი', 74 UNION ALL
  SELECT 'ანტვერპენი', 75
) teams
CROSS JOIN virtual_leagues l WHERE l.name = 'ჟუპილერ ლიგა';