import { useState, memo } from 'react';
import { ArrowLeft, HelpCircle, Grid3X3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import QuizGameView from './QuizGameView';
import SudokuGame from './sudoku/SudokuGame';
import { useQuizPresence } from '@/hooks/useFeaturePresence';

interface QuizHubProps {
  onBack: () => void;
}

type GameType = 'menu' | 'quiz' | 'sudoku';

const QuizHub = memo(function QuizHub({ onBack }: QuizHubProps) {
  const [selectedGame, setSelectedGame] = useState<GameType>('menu');
  
  useQuizPresence(true);

  if (selectedGame === 'quiz') {
    return <QuizGameView onBack={() => setSelectedGame('menu')} />;
  }

  if (selectedGame === 'sudoku') {
    return <SudokuGame onBack={() => setSelectedGame('menu')} />;
  }

  const games = [
    {
      id: 'quiz',
      name: 'ვიქტორინა',
      description: '10 კითხვა • 4 პასუხი • 12სთ კულდაუნი',
      icon: HelpCircle,
      gradient: 'from-purple-500 to-violet-600',
    },
    {
      id: 'sudoku',
      name: 'სუდოკუ',
      description: '9×9 ბადე • 3 სირთულე • ქულები',
      icon: Grid3X3,
      gradient: 'from-indigo-500 to-violet-600',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border/40">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
            <HelpCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg">ვიქტორინა</h1>
            <p className="text-xs text-muted-foreground">აირჩიე თამაშის ტიპი</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {games.map((game) => {
          const Icon = game.icon;
          return (
            <Card 
              key={game.id}
              className="transition-all duration-200 overflow-hidden cursor-pointer hover:scale-[1.01] hover:shadow-lg active:scale-[0.99]"
              onClick={() => setSelectedGame(game.id as GameType)}
            >
              <div className="flex items-center gap-4 p-4">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${game.gradient} flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base">{game.name}</h3>
                  <p className="text-sm text-muted-foreground">{game.description}</p>
                </div>
              </div>
            </Card>
          );
        })}

        <Card className="bg-primary/5 border-primary/20 mt-6">
          <CardContent className="p-4">
            <h3 className="font-semibold text-sm mb-2">🧠 თამაშების წესები</h3>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• <strong>ვიქტორინა:</strong> აირჩიე 4 პასუხიდან ერთი, ქულები სირთულის მიხედვით</li>
              <li>• <strong>სუდოკუ:</strong> შეავსე 9×9 ბადე რიცხვებით 1-9, ყოველ რიგში, სვეტსა და ბლოკში ერთხელ</li>
              <li>• ორივე თამაშში შედეგები ინახება</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

export default QuizHub;
