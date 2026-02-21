import { memo, useEffect, useState } from 'react';
import { ArrowLeft, Users, Loader2, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { JokerTable } from './types';
import { cn } from '@/lib/utils';

interface JokerWaitingRoomProps {
  tableId: string;
  onBack: () => void;
  onGameStart: (gameId: string) => void;
}

const JokerWaitingRoom = memo(function JokerWaitingRoom({ 
  tableId, 
  onBack,
  onGameStart 
}: JokerWaitingRoomProps) {
  const { user } = useAuth();
  const [table, setTable] = useState<JokerTable | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTable = async () => {
      const { data } = await supabase
        .from('joker_lobby_tables')
        .select('*')
        .eq('id', tableId)
        .single();
      
      if (data) {
        setTable(data as JokerTable);
        // Check if game already started
        if (data.game_id && data.status === 'playing') {
          onGameStart(data.game_id);
        }
      }
      setLoading(false);
    };

    loadTable();

    // Subscribe to table changes
    const channel = supabase
      .channel(`joker-waiting-${tableId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'joker_lobby_tables', filter: `id=eq.${tableId}` },
        (payload) => {
          const updated = payload.new as JokerTable;
          setTable(updated);
          
          // Game started!
          if (updated.game_id && updated.status === 'playing') {
            onGameStart(updated.game_id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tableId, onGameStart]);

  const handleLeave = async () => {
    if (!user || !table) return;

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
      .eq('id', tableId);

    onBack();
  };

  const getPlayerCount = () => {
    if (!table) return 0;
    return [table.player1_id, table.player2_id, table.player3_id, table.player4_id]
      .filter(Boolean).length;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  const playerCount = getPlayerCount();
  const players = [
    { id: table?.player1_id, name: table?.player1_username, position: 'bottom' },
    { id: table?.player2_id, name: table?.player2_username, position: 'left' },
    { id: table?.player3_id, name: table?.player3_username, position: 'top' },
    { id: table?.player4_id, name: table?.player4_username, position: 'right' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/30 backdrop-blur-lg border-b border-white/10">
        <div className="flex items-center justify-between p-3">
          <Button variant="ghost" size="icon" onClick={handleLeave} className="text-white">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="text-white text-center">
            <div className="font-bold">ჯოკერი - მაგიდა #{table?.table_number}</div>
            <div className="text-xs opacity-70">მოთამაშეების მოლოდინი</div>
          </div>
          <div className="w-10" />
        </div>
      </div>

      {/* Table visualization */}
      <div className="flex items-center justify-center p-4" style={{ minHeight: 'calc(100vh - 120px)' }}>
        <div className="relative w-full max-w-md aspect-square">
          {/* Table background */}
          <div className="absolute inset-8 bg-green-800 rounded-full shadow-2xl border-8 border-amber-900" />
          
          {/* Center info */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white">
              <div className="text-4xl font-bold mb-2">{playerCount}/4</div>
              <div className="text-sm opacity-70 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                მოლოდინი...
              </div>
            </div>
          </div>

          {/* Player positions */}
          {players.map((player, index) => {
            const positions = [
              'bottom-0 left-1/2 -translate-x-1/2 translate-y-2',
              'left-0 top-1/2 -translate-y-1/2 -translate-x-2',
              'top-0 left-1/2 -translate-x-1/2 -translate-y-2',
              'right-0 top-1/2 -translate-y-1/2 translate-x-2',
            ];

            return (
              <div
                key={index}
                className={cn('absolute', positions[index])}
              >
                <Card className={cn(
                  'w-24 transition-all',
                  player.id ? 'bg-purple-600/80 border-purple-400' : 'bg-gray-800/50 border-gray-600/50'
                )}>
                  <CardContent className="p-2 text-center">
                    <div className={cn(
                      'w-10 h-10 mx-auto rounded-full flex items-center justify-center mb-1',
                      player.id ? 'bg-purple-500' : 'bg-gray-700'
                    )}>
                      {player.id ? (
                        <Users className="w-5 h-5 text-white" />
                      ) : (
                        <span className="text-gray-500 text-xl">?</span>
                      )}
                    </div>
                    <div className={cn(
                      'text-xs truncate',
                      player.id ? 'text-white' : 'text-gray-500'
                    )}>
                      {player.name || 'ცარიელი'}
                    </div>
                    {player.id === user?.id && (
                      <div className="text-[10px] text-purple-300">(თქვენ)</div>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom info */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-black/30 backdrop-blur-lg">
        <div className="text-center text-white text-sm">
          <p className="opacity-70">
            თამაში ავტომატურად დაიწყება როცა 4 მოთამაშე შეიკრიბება
          </p>
        </div>
      </div>
    </div>
  );
});

export default JokerWaitingRoom;
