import { memo } from 'react';
import { Bot, Zap, Brain, Flame } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BotDifficulty } from './JokerBotAI';
import { cn } from '@/lib/utils';

interface JokerDifficultyDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (difficulty: BotDifficulty) => void;
}

const difficulties: { 
  value: BotDifficulty; 
  label: string; 
  description: string;
  icon: typeof Bot;
  color: string;
}[] = [
  { 
    value: 'easy', 
    label: 'მარტივი', 
    description: 'ბოტი თამაშობს შემთხვევითად',
    icon: Zap,
    color: 'bg-green-500 hover:bg-green-600'
  },
  { 
    value: 'medium', 
    label: 'საშუალო', 
    description: 'ბოტს აქვს ძირითადი სტრატეგია',
    icon: Brain,
    color: 'bg-yellow-500 hover:bg-yellow-600'
  },
  { 
    value: 'hard', 
    label: 'რთული', 
    description: 'ბოტი თამაშობს სტრატეგიულად',
    icon: Flame,
    color: 'bg-red-500 hover:bg-red-600'
  },
];

const JokerDifficultyDialog = memo(function JokerDifficultyDialog({
  open,
  onClose,
  onSelect
}: JokerDifficultyDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-purple-500" />
            აირჩიეთ სირთულე
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-3 py-4">
          {difficulties.map((diff) => {
            const Icon = diff.icon;
            return (
              <Button
                key={diff.value}
                onClick={() => onSelect(diff.value)}
                className={cn(
                  'h-auto py-4 flex flex-col items-center gap-2 text-white',
                  diff.color
                )}
              >
                <Icon className="w-8 h-8" />
                <div className="font-bold text-lg">{diff.label}</div>
                <div className="text-xs opacity-90">{diff.description}</div>
              </Button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
});

export default JokerDifficultyDialog;
