import { memo, useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import JokerLobby from './JokerLobby';
import JokerGame from './JokerGame';
import JokerWaitingRoom from './JokerWaitingRoom';
import JokerBotGame from './JokerBotGame';
import JokerDifficultyDialog from './JokerDifficultyDialog';
import { BotDifficulty } from './JokerBotAI';

interface JokerMainProps {
  onBack: () => void;
}

type GameView = 'lobby' | 'waiting' | 'game' | 'bot';

const JokerMain = memo(function JokerMain({ onBack }: JokerMainProps) {
  const { user } = useAuth();
  const [view, setView] = useState<GameView>('lobby');
  const [currentTableId, setCurrentTableId] = useState<string | null>(null);
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty | null>(null);
  const [showDifficultyDialog, setShowDifficultyDialog] = useState(false);

  const handleJoinTable = useCallback((tableId: string) => {
    setCurrentTableId(tableId);
    setView('waiting');
  }, []);

  const handleGameStart = useCallback((gameId: string) => {
    setCurrentGameId(gameId);
    setView('game');
  }, []);

  const handleBackToLobby = useCallback(async () => {
    // Clean up table if in waiting room
    if (currentTableId && user && view === 'waiting') {
      const { data: table } = await supabase
        .from('joker_lobby_tables')
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
        } else if (table.player3_id === user.id) {
          updateData.player3_id = null;
          updateData.player3_username = null;
        } else if (table.player4_id === user.id) {
          updateData.player4_id = null;
          updateData.player4_username = null;
        }

        const playerCount = [table.player1_id, table.player2_id, table.player3_id, table.player4_id]
          .filter(Boolean).length - 1;
        updateData.status = playerCount === 0 ? 'free' : 'waiting';

        await supabase
          .from('joker_lobby_tables')
          .update(updateData)
          .eq('id', currentTableId);
      }
    }

    setView('lobby');
    setCurrentTableId(null);
    setCurrentGameId(null);
    setBotDifficulty(null);
  }, [currentTableId, user, view]);

  const handlePlayWithBot = useCallback(() => {
    setShowDifficultyDialog(true);
  }, []);

  const handleDifficultySelect = useCallback((difficulty: BotDifficulty) => {
    setBotDifficulty(difficulty);
    setShowDifficultyDialog(false);
    setView('bot');
  }, []);

  // Check if user is already in a game
  useEffect(() => {
    const checkExistingGame = async () => {
      if (!user) return;

      const { data: tables } = await supabase
        .from('joker_lobby_tables')
        .select('*')
        .or(`player1_id.eq.${user.id},player2_id.eq.${user.id},player3_id.eq.${user.id},player4_id.eq.${user.id}`)
        .single();

      if (tables) {
        if (tables.status === 'playing' && tables.game_id) {
          setCurrentTableId(tables.id);
          setCurrentGameId(tables.game_id);
          setView('game');
        } else if (tables.status === 'waiting') {
          setCurrentTableId(tables.id);
          setView('waiting');
        }
      }
    };

    checkExistingGame();
  }, [user]);

  // Bot game view
  if (view === 'bot' && botDifficulty) {
    return <JokerBotGame difficulty={botDifficulty} onBack={handleBackToLobby} />;
  }

  // Waiting room view
  if (view === 'waiting' && currentTableId) {
    return (
      <JokerWaitingRoom
        tableId={currentTableId}
        onBack={handleBackToLobby}
        onGameStart={handleGameStart}
      />
    );
  }

  // Active game view
  if (view === 'game' && currentTableId && currentGameId) {
    return (
      <JokerGame
        tableId={currentTableId}
        gameId={currentGameId}
        onBack={handleBackToLobby}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border/40">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-bold text-lg">ჯოკერი</h1>
              <p className="text-xs text-muted-foreground">4 მოთამაშიანი კარტის თამაში</p>
            </div>
          </div>
          <Button onClick={handlePlayWithBot} className="bg-purple-600 hover:bg-purple-700">
            <Bot className="w-4 h-4 mr-2" />
            ბოტთან თამაში
          </Button>
        </div>
      </div>

      <div className="p-4">
        <JokerLobby onJoinTable={handleJoinTable} />
      </div>

      {/* Difficulty Dialog */}
      <JokerDifficultyDialog
        open={showDifficultyDialog}
        onClose={() => setShowDifficultyDialog(false)}
        onSelect={handleDifficultySelect}
      />
    </div>
  );
});

export default JokerMain;
