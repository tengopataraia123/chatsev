-- Create stadiums table
CREATE TABLE public.fm_stadiums (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  capacity INTEGER NOT NULL,
  image_url TEXT,
  price INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add stadium_id to clubs
ALTER TABLE public.fm_clubs ADD COLUMN stadium_id UUID REFERENCES public.fm_stadiums(id);

-- Enable RLS
ALTER TABLE public.fm_stadiums ENABLE ROW LEVEL SECURITY;

-- Everyone can view stadiums
CREATE POLICY "Anyone can view stadiums" ON public.fm_stadiums
  FOR SELECT USING (true);

-- Insert top 20 luxury stadiums
INSERT INTO public.fm_stadiums (name, city, country, capacity, price, description, image_url) VALUES
('Santiago Bernabéu', 'Madrid', 'Spain', 81044, 150000, 'რეალ მადრიდის ლეგენდარული სახლი, სრულად განახლებული', 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Estadio_Santiago_Bernab%C3%A9u_2022.jpg/1200px-Estadio_Santiago_Bernab%C3%A9u_2022.jpg'),
('Camp Nou', 'Barcelona', 'Spain', 99354, 180000, 'ევროპის უდიდესი სტადიონი, ბარსელონას სახლი', 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/2014._Camp_Nou._M%C3%A9s_que_un_club._Barcelona_B40.jpg/1200px-2014._Camp_Nou._M%C3%A9s_que_un_club._Barcelona_B40.jpg'),
('San Siro', 'Milan', 'Italy', 75923, 120000, 'მილანისა და ინტერის საერთო სახლი', 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/San_Siro_Stadium_%28AC_Milan_v_Udinese%29_%28cropped%29.jpg/1200px-San_Siro_Stadium_%28AC_Milan_v_Udinese%29_%28cropped%29.jpg'),
('Allianz Arena', 'Munich', 'Germany', 75024, 140000, 'ბაიერნ მიუნხენის ულტრათანამედროვე არენა', 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Allianz_Arena_2017.jpg/1200px-Allianz_Arena_2017.jpg'),
('Old Trafford', 'Manchester', 'England', 74310, 130000, 'სიზმრების თეატრი - მანჩესტერ იუნაიტედი', 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Old_Trafford_inside_20060726_1.jpg/1200px-Old_Trafford_inside_20060726_1.jpg'),
('Anfield', 'Liverpool', 'England', 61276, 110000, 'ლივერპულის ლეგენდარული სახლი', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Anfield_stadium_%28Aerial_View%29.jpg/1200px-Anfield_stadium_%28Aerial_View%29.jpg'),
('Wembley Stadium', 'London', 'England', 90000, 200000, 'ფეხბურთის სახლი - ინგლისის ნაკრები', 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Wembley_Stadium_from_the_air%2C_2023.jpg/1200px-Wembley_Stadium_from_the_air%2C_2023.jpg'),
('Signal Iduna Park', 'Dortmund', 'Germany', 81365, 100000, 'ყვითელი კედელი - ბორუსია დორტმუნდი', 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Westfalenstadion_2021_%282%29.jpg/1200px-Westfalenstadion_2021_%282%29.jpg'),
('Parc des Princes', 'Paris', 'France', 47929, 90000, 'პარიზ სენ-ჟერმენის ელეგანტური არენა', 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Parc_des_Princes_2018.jpg/1200px-Parc_des_Princes_2018.jpg'),
('Emirates Stadium', 'London', 'England', 60704, 120000, 'არსენალის თანამედროვე სახლი', 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Emirates_Stadium_Arsenal.jpg/1200px-Emirates_Stadium_Arsenal.jpg'),
('Tottenham Hotspur Stadium', 'London', 'England', 62850, 160000, 'მსოფლიოში ყველაზე თანამედროვე სტადიონი', 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/Tottenham_Hotspur_Stadium_-_April_2019.jpg/1200px-Tottenham_Hotspur_Stadium_-_April_2019.jpg'),
('Juventus Stadium', 'Turin', 'Italy', 41507, 85000, 'იუვენტუსის ექსკლუზიური არენა', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Juventus_v_Olympiacos%2C_Champions_League%2C_Stadium%2C_Turin%2C_2017.jpg/1200px-Juventus_v_Olympiacos%2C_Champions_League%2C_Stadium%2C_Turin%2C_2017.jpg'),
('Stamford Bridge', 'London', 'England', 40834, 95000, 'ჩელსის ისტორიული სახლი', 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Chelsea_vs_Stoke_stadium.jpg/1200px-Chelsea_vs_Stoke_stadium.jpg'),
('Etihad Stadium', 'Manchester', 'England', 53400, 100000, 'მანჩესტერ სიტის თანამედროვე არენა', 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Eithad_Stadium_in_Manchester.jpg/1200px-Eithad_Stadium_in_Manchester.jpg'),
('Estadio Metropolitano', 'Madrid', 'Spain', 68456, 110000, 'ატლეტიკო მადრიდის ახალი სახლი', 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Estadio_Wanda_Metropolitano%2C_Madrid%2C_2023.jpg/1200px-Estadio_Wanda_Metropolitano%2C_Madrid%2C_2023.jpg'),
('Stade de France', 'Paris', 'France', 81338, 170000, 'საფრანგეთის ნაკრების გრანდიოზული არენა', 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Stade_de_France_2000.jpg/1200px-Stade_de_France_2000.jpg'),
('Estadio da Luz', 'Lisbon', 'Portugal', 64642, 80000, 'ბენფიკას შთამბეჭდავი სტადიონი', 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Estadio_da_Luz%2C_Lisboa%2C_Portugal%2C_2012-05-12%2C_DD_01.JPG/1200px-Estadio_da_Luz%2C_Lisboa%2C_Portugal%2C_2012-05-12%2C_DD_01.JPG'),
('Johan Cruyff Arena', 'Amsterdam', 'Netherlands', 55865, 90000, 'აიაქსის ინოვაციური არენა', 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Amsterdam_ArenA_%282017%29.jpg/1200px-Amsterdam_ArenA_%282017%29.jpg'),
('Veltins-Arena', 'Gelsenkirchen', 'Germany', 62271, 95000, 'შალკეს ტექნოლოგიური სტადიონი დახურული სახურავით', 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Arena_Auf_Schalke_2005.jpg/1200px-Arena_Auf_Schalke_2005.jpg'),
('Lusail Stadium', 'Lusail', 'Qatar', 88966, 250000, '2022 მუნდიალის ფინალის არენა - უახლესი', 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/Lusail_Iconic_Stadium.jpg/1200px-Lusail_Iconic_Stadium.jpg');