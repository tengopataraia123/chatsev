import { memo, useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Flame, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import BuraLobby from './BuraLobby';
import BuraWaitingRoom from './BuraWaitingRoom';
import BuraBotGame from './BuraBotGame';
import BuraMultiplayerGame from './BuraMultiplayerGame';
import { BuraTable } from './types';
import { BotDifficulty } from '../shared/types';

interface BuraMainProps {
  onBack: () => void;
}

type GameView = 'lobby' | 'waiting' | 'game' | 'bot';

const BuraMain = memo(function BuraMain({ onBack }: BuraMainProps) {
  const { user } = useAuth();
  const [view, setView] = useState<GameView>('lobby');
  const [currentTableId, setCurrentTableId] = useState<string | null>(null);
  const [currentTable, setCurrentTable] = useState<BuraTable | null>(null);
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty | null>(null);
  const [showBotSetup, setShowBotSetup] = useState(false);

  const handleJoinTable = useCallback((tableId: string) => {
    setCurrentTableId(tableId);
    setView('waiting');
  }, []);

  const cleanupTable = useCallback(async (tableId: string) => {
    if (!user) return;
    const { data: table } = await supabase
      .from('bura_lobby_tables')
      .select('*')
      .eq('id', tableId)
      .single();

    if (!table) return;
    if (table.player1_id !== user.id && table.player2_id !== user.id) return;

    const updateData: Record<string, unknown> = {};
    if (table.player1_id === user.id) {
      updateData.player1_id = null;
      updateData.player1_username = null;
    } else {
      updateData.player2_id = null;
      updateData.player2_username = null;
    }

    const otherPlayer = table.player1_id === user.id ? table.player2_id : table.player1_id;
    if (!otherPlayer) {
      updateData.status = 'free';
      updateData.game_id = null;
    } else {
      updateData.status = 'waiting';
    }

    await supabase
      .from('bura_lobby_tables')
      .update(updateData)
      .eq('id', tableId);
  }, [user]);

  const handleBackToLobby = useCallback(async () => {
    if (currentTableId && user) {
      await cleanupTable(currentTableId);
    }

    setView('lobby');
    setCurrentTableId(null);
    setBotDifficulty(null);
    setShowBotSetup(false);
  }, [currentTableId, user, cleanupTable]);

  const handleBotStart = useCallback((diff: BotDifficulty) => {
    setBotDifficulty(diff);
    setView('bot');
    setShowBotSetup(false);
  }, []);

  useEffect(() => {
    const checkExistingGame = async () => {
      if (!user) return;
      const { data: tables } = await supabase
        .from('bura_lobby_tables')
        .select('*')
        .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
        .single();

      if (tables) {
        const t = tables as unknown as BuraTable;
        
        if (t.status === 'playing') {
          // Check if the game actually exists and has both players
          if (t.player1_id && t.player2_id && t.game_id) {
            const { data: game } = await supabase
              .from('bura_games')
              .select('id, status')
              .eq('id', t.game_id)
              .single();
            
            if (game && game.status === 'playing') {
              setCurrentTable(t);
              setCurrentTableId(t.id);
              setView('game');
            } else {
              // Game is finished/missing, clean up stale table
              await cleanupTable(t.id);
            }
          } else {
            // Table marked as playing but missing players/game - clean up
            await cleanupTable(t.id);
          }
        } else if (t.status === 'waiting') {
          setCurrentTable(t);
          setCurrentTableId(t.id);
          setView('waiting');
        }
      }
    };
    checkExistingGame();
  }, [user, cleanupTable]);

  if (view === 'bot' && botDifficulty) {
    return (
      <BuraBotGame
        difficulty={botDifficulty}
        onBack={handleBackToLobby}
      />
    );
  }

  if (view === 'waiting' && currentTableId) {
    return (
      <BuraWaitingRoom
        tableId={currentTableId}
        onBack={handleBackToLobby}
        onGameStart={async () => {
          // Fetch table data for multiplayer
          const { data } = await supabase
            .from('bura_lobby_tables')
            .select('*')
            .eq('id', currentTableId)
            .single();
          if (data) setCurrentTable(data as unknown as BuraTable);
          setView('game');
        }}
      />
    );
  }

  if (view === 'game' && currentTableId && currentTable?.player1_id && currentTable?.player2_id) {
    return (
      <BuraMultiplayerGame
        tableId={currentTableId}
        player1Id={currentTable.player1_id}
        player2Id={currentTable.player2_id}
        player1Username={currentTable.player1_username || 'მოთამაშე 1'}
        player2Username={currentTable.player2_username || 'მოთამაშე 2'}
        onBack={handleBackToLobby}
      />
    );
  }

  if (view === 'game') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center p-8">
          <Flame className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-bold mb-2">იტვირთება...</h2>
          <Button onClick={handleBackToLobby}>ლობიში დაბრუნება</Button>
        </div>
      </div>
    );
  }

  if (showBotSetup) {
    return <BotSetupScreen onBack={() => setShowBotSetup(false)} onStart={handleBotStart} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border/40">
        <div className="flex items-center gap-2 px-3 py-2.5">
          <Button variant="ghost" size="icon" onClick={onBack} className="flex-shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center flex-shrink-0">
            <Flame className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-base truncate">ბურა (31)</h1>
            <p className="text-[10px] text-muted-foreground">კარტის თამაში • 36 კარტი</p>
          </div>
          <Button
            onClick={() => setShowBotSetup(true)}
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs h-8 flex-shrink-0"
          >
            <Bot className="w-3.5 h-3.5" />
            ბოტთან
          </Button>
        </div>
      </div>

      <div className="p-4">
        <BuraLobby onJoinTable={handleJoinTable} />
      </div>
    </div>
  );
});

function BotSetupScreen({ onBack, onStart }: { 
  onBack: () => void; 
  onStart: (diff: BotDifficulty) => void;
}) {
  const [selectedDiff, setSelectedDiff] = useState<BotDifficulty>('medium');

  const difficulties: { value: BotDifficulty; label: string; emoji: string; desc: string }[] = [
    { value: 'easy', label: 'მარტივი', emoji: '😊', desc: 'შემთხვევითი სვლები' },
    { value: 'medium', label: 'საშუალო', emoji: '🤔', desc: 'სტრატეგიული სვლები' },
    { value: 'hard', label: 'რთული', emoji: '🧠', desc: 'კარტების დათვლა' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border/40">
        <div className="flex items-center gap-2 px-3 py-2.5">
          <Button variant="ghost" size="icon" onClick={onBack} className="flex-shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-bold text-base">ბოტთან თამაში</h1>
        </div>
      </div>

      <div className="p-4 space-y-6 max-w-md mx-auto">
        <div className="bg-muted/50 rounded-xl p-3">
          <h3 className="text-sm font-semibold mb-1">ბურა (31)</h3>
          <p className="text-[11px] text-muted-foreground">36 კარტი • 3 კარტი ხელში • მიზანი: 31 ქულა • მატჩი 11-მდე</p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground mb-2">სირთულე</h3>
          <div className="space-y-2">
            {difficulties.map(d => (
              <button
                key={d.value}
                onClick={() => setSelectedDiff(d.value)}
                className={`w-full p-3 rounded-xl border-2 flex items-center gap-3 text-left transition-all ${
                  selectedDiff === d.value
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:bg-secondary'
                }`}
              >
                <span className="text-2xl">{d.emoji}</span>
                <div>
                  <p className="font-medium text-foreground text-sm">{d.label}</p>
                  <p className="text-xs text-muted-foreground">{d.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={() => onStart(selectedDiff)}
          className="w-full h-12 text-base font-bold gap-2"
        >
          <Flame className="w-5 h-5" />
          თამაშის დაწყება
        </Button>
      </div>
    </div>
  );
}

export default BuraMain;
