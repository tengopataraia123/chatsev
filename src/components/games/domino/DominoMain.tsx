import { memo, useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Square, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DominoLobby from './DominoLobby';
import DominoWaitingRoom from './DominoWaitingRoom';
import BotDifficultyDialog from '../shared/BotDifficultyDialog';
import DominoBotGame from './DominoBotGame';
import { BotDifficulty } from '../shared/types';

interface DominoMainProps {
  onBack: () => void;
}

type GameView = 'lobby' | 'waiting' | 'game' | 'bot';

const DominoMain = memo(function DominoMain({ onBack }: DominoMainProps) {
  const { user } = useAuth();
  const [view, setView] = useState<GameView>('lobby');
  const [currentTableId, setCurrentTableId] = useState<string | null>(null);
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty | null>(null);
  const [showDifficultyDialog, setShowDifficultyDialog] = useState(false);

  const handleJoinTable = useCallback((tableId: string) => {
    setCurrentTableId(tableId);
    setView('waiting');
  }, []);

  const handleBackToLobby = useCallback(async () => {
    if (currentTableId && user && view === 'waiting') {
      const { data: table } = await supabase
        .from('domino_lobby_tables')
        .select('*')
        .eq('id', currentTableId)
        .single();

      if (table && table.status !== 'playing') {
        const updateData: Record<string, unknown> = {};
        if (table.player1_id === user.id) {
          updateData.player1_id = null;
          updateData.player1_username = null;
        } else if (table.player2_id === user.id) {
          updateData.player2_id = null;
          updateData.player2_username = null;
        }

        const playerCount = [table.player1_id, table.player2_id].filter(Boolean).length - 1;
        updateData.status = playerCount === 0 ? 'free' : 'waiting';

        await supabase
          .from('domino_lobby_tables')
          .update(updateData)
          .eq('id', currentTableId);
      }
    }

    setView('lobby');
    setCurrentTableId(null);
    setBotDifficulty(null);
  }, [currentTableId, user, view]);

  const handleBotSelect = useCallback((difficulty: BotDifficulty) => {
    setBotDifficulty(difficulty);
    setView('bot');
  }, []);

  useEffect(() => {
    const checkExistingGame = async () => {
      if (!user) return;

      const { data: tables } = await supabase
        .from('domino_lobby_tables')
        .select('*')
        .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
        .single();

      if (tables) {
        if (tables.status === 'playing') {
          setCurrentTableId(tables.id);
          setView('game');
        } else if (tables.status === 'waiting') {
          setCurrentTableId(tables.id);
          setView('waiting');
        }
      }
    };

    checkExistingGame();
  }, [user]);

  if (view === 'bot' && botDifficulty) {
    return (
      <DominoBotGame
        difficulty={botDifficulty}
        onBack={handleBackToLobby}
      />
    );
  }

  if (view === 'waiting' && currentTableId) {
    return (
      <DominoWaitingRoom
        tableId={currentTableId}
        onBack={handleBackToLobby}
        onGameStart={() => setView('game')}
      />
    );
  }

  if (view === 'game') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center p-8">
          <Square className="w-16 h-16 mx-auto mb-4 text-blue-500" />
          <h2 className="text-xl font-bold mb-2">დომინო - თამაში</h2>
          <p className="text-muted-foreground mb-4">თამაშის ლოგიკა მალე დაემატება</p>
          <Button onClick={handleBackToLobby}>ლობიში დაბრუნება</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border/40">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <Square className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="font-bold text-lg">დომინო</h1>
            <p className="text-xs text-muted-foreground">2 მოთამაშიანი თამაში</p>
          </div>
          <Button
            onClick={() => setShowDifficultyDialog(true)}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Bot className="w-4 h-4" />
            ბოტთან
          </Button>
        </div>
      </div>

      <div className="p-4">
        <DominoLobby onJoinTable={handleJoinTable} />
      </div>

      <BotDifficultyDialog
        open={showDifficultyDialog}
        onOpenChange={setShowDifficultyDialog}
        onSelect={handleBotSelect}
        gameName="დომინო"
      />
    </div>
  );
});

export default DominoMain;
