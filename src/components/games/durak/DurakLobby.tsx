import { memo, useEffect, useState } from 'react';
import { Users, Crown, Loader2, Play, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DurakTable } from './types';
import { cleanupGhostTables } from './useDurakGameCleanup';
import { cn } from '@/lib/utils';

interface DurakLobbyProps {
  onJoinTable: (tableId: string) => void;
  onJoinGame: (tableId: string, gameId: string) => void;
}

const DurakLobby = memo(function DurakLobby({ onJoinTable, onJoinGame }: DurakLobbyProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [tables, setTables] = useState<DurakTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningTable, setJoiningTable] = useState<string | null>(null);

  // Load tables and subscribe to changes
  useEffect(() => {
    const loadTables = async () => {
      // First, cleanup any ghost tables (stuck in 'playing' with no game_id)
      await cleanupGhostTables();
      
      const { data, error } = await supabase
        .from('durak_lobby_tables')
        .select('*')
        .order('table_number');

      if (error) {
        console.error('Error loading tables:', error);
        return;
      }

      setTables(data as DurakTable[]);
      setLoading(false);
    };

    loadTables();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('durak-lobby')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'durak_lobby_tables' },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setTables(prev => 
              prev.map(t => t.id === payload.new.id ? payload.new as DurakTable : t)
            );

            // Check if current user should join a game
            const updatedTable = payload.new as DurakTable;
            if (
              updatedTable.status === 'playing' && 
              updatedTable.game_id &&
              (updatedTable.player1_id === user?.id || updatedTable.player2_id === user?.id)
            ) {
              onJoinGame(updatedTable.id, updatedTable.game_id);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, onJoinGame]);

  const joinTable = async (table: DurakTable) => {
    if (!user || !profile) {
      toast({ title: 'გთხოვთ გაიაროთ ავტორიზაცია', variant: 'destructive' });
      return;
    }

    // Check if already at a table
    const currentTable = tables.find(t => 
      t.player1_id === user.id || t.player2_id === user.id
    );
    if (currentTable) {
      toast({ title: 'თქვენ უკვე ზიხართ მაგიდაზე', variant: 'destructive' });
      return;
    }

    setJoiningTable(table.id);

    try {
      if (table.status === 'free') {
        // First player joins - go to waiting room
        const { error } = await supabase
          .from('durak_lobby_tables')
          .update({
            player1_id: user.id,
            player1_username: profile.username,
            status: 'waiting'
          })
          .eq('id', table.id)
          .eq('status', 'free'); // Optimistic locking

        if (error) throw error;
        
        // Navigate to waiting room
        onJoinTable(table.id);
      } else if (table.status === 'waiting' && table.player1_id !== user.id) {
        // Second player joins - create and start the game
        const { data: gameData, error: gameError } = await supabase
          .from('durak_active_games')
          .insert({
            table_id: table.id,
            player1_id: table.player1_id,
            player2_id: user.id,
            deck: [],
            trump_card: null,
            trump_suit: null,
            discard_pile: [],
            player1_hand: [],
            player2_hand: [],
            table_cards: [],
            attacker_id: table.player1_id,
            defender_id: user.id,
            phase: 'attack',
            status: 'playing',
          })
          .select()
          .single();

        if (gameError) throw gameError;

        // Update table with game_id and player2
        const { error } = await supabase
          .from('durak_lobby_tables')
          .update({
            player2_id: user.id,
            player2_username: profile.username,
            status: 'playing',
            game_id: gameData.id
          })
          .eq('id', table.id)
          .eq('status', 'waiting');

        if (error) throw error;
        
        // Navigate to game
        onJoinGame(table.id, gameData.id);
      }
    } catch (error) {
      console.error('Error joining table:', error);
      toast({ title: 'შეცდომა მაგიდაზე შეერთებისას', variant: 'destructive' });
    } finally {
      setJoiningTable(null);
    }
  };

  const leaveTable = async () => {
    if (!user) return;

    const currentTable = tables.find(t => 
      (t.player1_id === user.id || t.player2_id === user.id) && t.status !== 'playing'
    );
    if (!currentTable) return;

    try {
      if (currentTable.player1_id === user.id) {
        // First player leaves - move player2 to player1 slot or free the table
        if (currentTable.player2_id) {
          await supabase
            .from('durak_lobby_tables')
            .update({
              player1_id: currentTable.player2_id,
              player1_username: currentTable.player2_username,
              player2_id: null,
              player2_username: null,
              status: 'waiting'
            })
            .eq('id', currentTable.id);
        } else {
          await supabase
            .from('durak_lobby_tables')
            .update({
              player1_id: null,
              player1_username: null,
              status: 'free'
            })
            .eq('id', currentTable.id);
        }
      } else {
        // Second player leaves
        await supabase
          .from('durak_lobby_tables')
          .update({
            player2_id: null,
            player2_username: null,
            status: 'waiting'
          })
          .eq('id', currentTable.id);
      }
    } catch (error) {
      console.error('Error leaving table:', error);
      toast({ title: 'შეცდომა მაგიდის დატოვებისას', variant: 'destructive' });
    }
  };

  const getTableStatus = (table: DurakTable) => {
    if (table.status === 'free') return { text: 'თავისუფალია', color: 'text-green-500', bg: 'bg-green-500/10' };
    if (table.status === 'waiting') return { text: 'დარჩა 1 ადგილი', color: 'text-yellow-500', bg: 'bg-yellow-500/10' };
    return { text: 'თამაში მიმდინარეობს', color: 'text-red-500', bg: 'bg-red-500/10' };
  };

  const isUserAtTable = (table: DurakTable) => 
    table.player1_id === user?.id || table.player2_id === user?.id;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const userCurrentTable = tables.find(t => isUserAtTable(t));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crown className="w-6 h-6 text-yellow-500" />
          <h2 className="text-xl font-bold">დურაკა - ლობი</h2>
        </div>
        {userCurrentTable && userCurrentTable.status !== 'playing' && (
          <Button variant="outline" size="sm" onClick={leaveTable}>
            <LogOut className="w-4 h-4 mr-2" />
            მაგიდის დატოვება
          </Button>
        )}
      </div>

      {/* Instructions */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            აირჩიეთ თავისუფალი ან ნახევრად სავსე მაგიდა თამაშის დასაწყებად. 
            როცა ორი მოთამაშე შეიკრიბება, თამაში ავტომატურად დაიწყება.
          </p>
        </CardContent>
      </Card>

      {/* Tables Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {tables.map((table) => {
          const status = getTableStatus(table);
          const isCurrentUserHere = isUserAtTable(table);
          const canJoin = table.status !== 'playing' && !isCurrentUserHere && !userCurrentTable;

          return (
            <Card 
              key={table.id}
              className={cn(
                'transition-all duration-200',
                isCurrentUserHere && 'ring-2 ring-primary',
                canJoin && 'hover:shadow-lg cursor-pointer hover:scale-[1.02]'
              )}
              onClick={() => canJoin && joinTable(table)}
            >
              <CardHeader className="p-3 pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>მაგიდა #{table.table_number}</span>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full', status.bg, status.color)}>
                    {table.status === 'free' ? '0/2' : table.status === 'waiting' ? '1/2' : '2/2'}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 space-y-2">
                {/* Status */}
                <div className={cn('text-xs font-medium', status.color)}>
                  {status.text}
                </div>

                {/* Players */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs">
                    <Users className="w-3 h-3" />
                    <span className={table.player1_username ? 'text-foreground' : 'text-muted-foreground'}>
                      {table.player1_username || 'ცარიელი'}
                    </span>
                    {table.player1_id === user?.id && (
                      <span className="text-primary text-[10px]">(თქვენ)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <Users className="w-3 h-3" />
                    <span className={table.player2_username ? 'text-foreground' : 'text-muted-foreground'}>
                      {table.player2_username || 'ცარიელი'}
                    </span>
                    {table.player2_id === user?.id && (
                      <span className="text-primary text-[10px]">(თქვენ)</span>
                    )}
                  </div>
                </div>

                {/* Join button */}
                {canJoin && (
                  <Button 
                    size="sm" 
                    className="w-full h-7 text-xs"
                    disabled={joiningTable === table.id}
                  >
                    {joiningTable === table.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <>
                        <Play className="w-3 h-3 mr-1" />
                        შეერთება
                      </>
                    )}
                  </Button>
                )}

                {isCurrentUserHere && table.status === 'waiting' && (
                  <div className="text-xs text-center text-muted-foreground animate-pulse">
                    მოთამაშის მოლოდინი...
                  </div>
                )}

                {table.status === 'playing' && !isCurrentUserHere && (
                  <div className="text-xs text-center text-muted-foreground">
                    თამაში მიმდინარეობს
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
});

export default DurakLobby;
