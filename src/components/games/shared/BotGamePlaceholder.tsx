import { memo } from 'react';
import { ArrowLeft, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BotDifficulty } from './types';

interface BotGamePlaceholderProps {
  gameName: string;
  difficulty: BotDifficulty;
  icon: React.ReactNode;
  onBack: () => void;
}

const difficultyLabels: Record<BotDifficulty, string> = {
  easy: 'მარტივი',
  medium: 'საშუალო',
  hard: 'რთული',
};

const BotGamePlaceholder = memo(function BotGamePlaceholder({
  gameName,
  difficulty,
  icon,
  onBack,
}: BotGamePlaceholderProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border/40">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-bold text-lg">{gameName} - ბოტთან</h1>
            <p className="text-xs text-muted-foreground">სირთულე: {difficultyLabels[difficulty]}</p>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center p-8 mt-20">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
          {icon}
        </div>
        <div className="flex items-center gap-2 mb-2">
          <Bot className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-xl font-bold">{gameName} vs ბოტი</h2>
        </div>
        <p className="text-muted-foreground text-center mb-6">
          ბოტთან თამაშის ლოგიკა მალე დაემატება
        </p>
        <Button onClick={onBack} variant="outline">
          ლობიში დაბრუნება
        </Button>
      </div>
    </div>
  );
});

export default BotGamePlaceholder;
