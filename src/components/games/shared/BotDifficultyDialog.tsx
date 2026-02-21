import { memo } from 'react';
import { Bot, Zap, Brain, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BotDifficulty } from './types';

interface BotDifficultyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (difficulty: BotDifficulty) => void;
  gameName?: string;
}

const difficulties: {
  id: BotDifficulty;
  name: string;
  description: string;
  icon: typeof Bot;
  color: string;
}[] = [
  {
    id: 'easy',
    name: 'მარტივი',
    description: 'დამწყებთათვის - ბოტი თამაშობს შემთხვევით',
    icon: Bot,
    color: 'from-green-500 to-emerald-600',
  },
  {
    id: 'medium',
    name: 'საშუალო',
    description: 'ძირითადი სტრატეგია - ბოტი ფიქრობს სვლებზე',
    icon: Zap,
    color: 'from-yellow-500 to-orange-600',
  },
  {
    id: 'hard',
    name: 'რთული',
    description: 'გამოცდილი მოთამაშეებისთვის - ჭკვიანი სტრატეგია',
    icon: Brain,
    color: 'from-red-500 to-rose-600',
  },
];

const BotDifficultyDialog = memo(function BotDifficultyDialog({
  open,
  onOpenChange,
  onSelect,
  gameName = 'თამაში',
}: BotDifficultyDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            ბოტთან თამაში
          </DialogTitle>
          <DialogDescription>
            აირჩიე სირთულის დონე {gameName}-სთვის
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-3 py-4">
          {difficulties.map((diff) => {
            const Icon = diff.icon;
            return (
              <Button
                key={diff.id}
                variant="outline"
                className={cn(
                  'h-auto p-4 flex items-start gap-3 text-left justify-start',
                  'hover:border-primary/50 transition-all'
                )}
                onClick={() => {
                  onSelect(diff.id);
                  onOpenChange(false);
                }}
              >
                <div className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                  `bg-gradient-to-br ${diff.color}`
                )}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{diff.name}</div>
                  <div className="text-xs text-muted-foreground">{diff.description}</div>
                </div>
              </Button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
});

export default BotDifficultyDialog;
