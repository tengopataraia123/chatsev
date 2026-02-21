import { memo, useState } from 'react';
import { ArrowLeft, Gamepad2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DurakMain } from '@/components/games/durak';
import { JokerMain } from '@/components/games/joker';
import { DominoMain } from '@/components/games/domino';
import { BuraMain } from '@/components/games/bura';
import { useGamesPresence } from '@/hooks/useFeaturePresence';

// Game banner images
import durakaBanner from '@/assets/games/duraka-banner.jpg';
import jokerBanner from '@/assets/games/joker-banner.jpg';
import dominoBanner from '@/assets/games/domino-banner.jpg';
import buraBanner from '@/assets/games/bura-banner.jpg';

interface GamesViewProps {
  onBack?: () => void;
}

type GameType = 'menu' | 'durak' | 'joker' | 'domino' | 'bura';

const GamesView = memo(function GamesView({ onBack }: GamesViewProps) {
  const [currentGame, setCurrentGame] = useState<GameType>('menu');
  
  useGamesPresence(true);

  if (currentGame === 'durak') {
    return <DurakMain onBack={() => setCurrentGame('menu')} />;
  }
  if (currentGame === 'joker') {
    return <JokerMain onBack={() => setCurrentGame('menu')} />;
  }
  if (currentGame === 'domino') {
    return <DominoMain onBack={() => setCurrentGame('menu')} />;
  }
  if (currentGame === 'bura') {
    return <BuraMain onBack={() => setCurrentGame('menu')} />;
  }

  const games = [
    {
      id: 'durak',
      name: 'დურაკა',
      description: '2 მოთამაშე • კარტის თამაში',
      banner: durakaBanner,
    },
    {
      id: 'joker',
      name: 'ჯოკერი',
      description: '4 მოთამაშე • კარტის თამაში',
      banner: jokerBanner,
    },
    {
      id: 'domino',
      name: 'დომინო',
      description: '2 მოთამაშე • კლასიკური',
      banner: dominoBanner,
    },
    {
      id: 'bura',
      name: 'ბურა',
      description: '2 მოთამაშე • კარტის თამაში',
      banner: buraBanner,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border/40">
        <div className="flex items-center gap-3 p-4">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <Gamepad2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg">თამაშები</h1>
            <p className="text-xs text-muted-foreground">ითამაშე მეგობრებთან ერთად</p>
          </div>
        </div>
      </div>

      <div className="p-4 grid grid-cols-2 gap-3">
        {games.map((game) => (
          <Card 
            key={game.id}
            className="transition-all duration-200 overflow-hidden cursor-pointer hover:scale-[1.02] hover:shadow-lg relative"
            onClick={() => setCurrentGame(game.id as GameType)}
          >
            <div className="h-28 relative overflow-hidden">
              <img 
                src={game.banner} 
                alt={game.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>
            <CardHeader className="p-3 pb-1">
              <CardTitle className="text-sm">{game.name}</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <p className="text-xs text-muted-foreground">{game.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="p-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <h3 className="font-semibold text-sm mb-2">🎮 როგორ ვითამაშოთ?</h3>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• აირჩიეთ თამაში და შეუერთდით მაგიდას</li>
              <li>• დაელოდეთ მოწინააღმდეგეს</li>
              <li>• თამაში ავტომატურად დაიწყება მაგიდის შევსებისას</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

export default GamesView;
