import { memo, useState, useCallback, useEffect } from 'react';
import { ArrowLeft, Crown, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DurakLobby from './DurakLobby';
import DurakGame from './DurakGame';
import DurakBotGame from './DurakBotGame';
import DurakWaitingRoom from './DurakWaitingRoom';
import DifficultySelectDialog from './DifficultySelectDialog';
import { BotDifficulty } from './DurakBotAI';

interface DurakMainProps {
  onBack?: () => void;
}

type GameMode = 'lobby' | 'waiting' | 'game' | 'bot';

const DurakMain = memo(function DurakMain({ onBack }: DurakMainProps) {
  const { user } = useAuth();
  const [mode, setMode] = useState<GameMode>('lobby');
  const [tableId, setTableId] = useState<string | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty | null>(null);
  const [showDifficultyDialog, setShowDifficultyDialog] = useState(false);

  // Handle joining a table (go to waiting room)
  const handleJoinTable = useCallback((tableId: string) => {
    setTableId(tableId);
    setMode('waiting');
  }, []);

  // Handle game start from waiting room
  const handleGameStart = useCallback((gameId: string) => {
    setGameId(gameId);
    setMode('game');
  }, []);

  // Handle direct join to game (when both players ready)
  const handleJoinGame = useCallback((tableId: string, gameId: string) => {
    setTableId(tableId);
    setGameId(gameId);
    setMode('game');
  }, []);

  // Handle bot game start
  const handleBotGameStart = useCallback((difficulty: BotDifficulty) => {
    setBotDifficulty(difficulty);
    setMode('bot');
  }, []);

  // Handle leave
  const handleLeave = useCallback(() => {
    setMode('lobby');
    setTableId(null);
    setGameId(null);
    setBotDifficulty(null);
  }, []);

  // Check if user is already at a table
  useEffect(() => {
    const checkExistingGame = async () => {
      if (!user) return;

      const { data: tables } = await supabase
        .from('durak_lobby_tables')
        .select('*')
        .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`);

      if (tables && tables.length > 0) {
        const table = tables[0];
        setTableId(table.id);
        
        if (table.status === 'playing' && table.game_id) {
          setGameId(table.game_id);
          setMode('game');
        } else if (table.status === 'waiting') {
          setMode('waiting');
        }
      }
    };

    checkExistingGame();
  }, [user]);

  // Render based on mode
  if (mode === 'bot' && botDifficulty) {
    return (
      <div className="min-h-screen bg-background">
        <DurakBotGame difficulty={botDifficulty} onBack={handleLeave} />
      </div>
    );
  }

  if (mode === 'game' && tableId && gameId) {
    return (
      <div className="min-h-screen bg-background">
        <DurakGame tableId={tableId} gameId={gameId} onLeave={handleLeave} />
      </div>
    );
  }

  if (mode === 'waiting' && tableId) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border/40">
          <div className="flex items-center gap-3 p-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">დურაკა</h1>
              <p className="text-xs text-muted-foreground">მოწინააღმდეგის მოლოდინი</p>
            </div>
          </div>
        </div>
        <DurakWaitingRoom 
          tableId={tableId} 
          onGameStart={handleGameStart}
          onLeave={handleLeave}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border/40">
        <div className="flex items-center gap-3 p-4">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center">
            <Crown className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="font-bold text-lg">დურაკა</h1>
            <p className="text-xs text-muted-foreground">კლასიკური კარტის თამაში</p>
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

      {/* Content */}
      <div className="p-4">
        <DurakLobby 
          onJoinTable={handleJoinTable}
          onJoinGame={handleJoinGame}
        />
      </div>

      {/* Difficulty dialog */}
      <DifficultySelectDialog
        open={showDifficultyDialog}
        onOpenChange={setShowDifficultyDialog}
        onSelect={handleBotGameStart}
        gameName="დურაკა"
      />
    </div>
  );
});

export default DurakMain;
