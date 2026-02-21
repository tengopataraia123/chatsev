import { memo, useEffect, useState } from 'react';
import { Users, Loader2, Play, LogOut, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BuraTable } from './types';
import { cn } from '@/lib/utils';

interface BuraLobbyProps {
  onJoinTable: (tableId: string) => void;
}

const BuraLobby = memo(function BuraLobby({ onJoinTable }: BuraLobbyProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [tables, setTables] = useState<BuraTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningTable, setJoiningTable] = useState<string | null>(null);

  useEffect(() => {
    const loadTables = async () => {
      const { data, error } = await supabase
        .from('bura_lobby_tables')
        .select('*')
        .order('table_number');

      if (error) {
        console.error('Error loading bura tables:', error);
        return;
      }

      setTables(data as BuraTable[]);
      setLoading(false);
    };

    loadTables();

    const channel = supabase
      .channel('bura-lobby')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bura_lobby_tables' },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setTables(prev => 
              prev.map(t => t.id === payload.new.id ? payload.new as BuraTable : t)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const getPlayerCount = (table: BuraTable): number => {
    let count = 0;
    if (table.player1_id) count++;
    if (table.player2_id) count++;
    return count;
  };

  const getEmptySlot = (table: BuraTable): number | null => {
    if (!table.player1_id) return 1;
    if (!table.player2_id) return 2;
    return null;
  };

  const joinTable = async (table: BuraTable) => {
    if (!user || !profile) {
      toast({ title: 'გთხოვთ გაიაროთ ავტორიზაცია', variant: 'destructive' });
      return;
    }

    const currentTable = tables.find(t => 
      t.player1_id === user.id || t.player2_id === user.id
    );
    if (currentTable) {
      toast({ title: 'თქვენ უკვე ზიხართ მაგიდაზე', variant: 'destructive' });
      return;
    }

    const slot = getEmptySlot(table);
    if (!slot) {
      toast({ title: 'მაგიდა სავსეა', variant: 'destructive' });
      return;
    }

    setJoiningTable(table.id);

    try {
      const playerCount = getPlayerCount(table);
      const updateData: Record<string, unknown> = {};
      updateData[`player${slot}_id`] = user.id;
      updateData[`player${slot}_username`] = profile.username;
      
      if (playerCount === 0) {
        updateData.status = 'waiting';
      }

      if (playerCount === 1) {
        updateData.status = 'playing';
      }

      const { error } = await supabase
        .from('bura_lobby_tables')
        .update(updateData)
        .eq('id', table.id);

      if (error) throw error;

      onJoinTable(table.id);
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
      (t.player1_id === user.id || t.player2_id === user.id) && 
      t.status !== 'playing'
    );
    if (!currentTable) return;

    try {
      const updateData: Record<string, unknown> = {};
      
      if (currentTable.player1_id === user.id) {
        updateData.player1_id = null;
        updateData.player1_username = null;
      } else if (currentTable.player2_id === user.id) {
        updateData.player2_id = null;
        updateData.player2_username = null;
      }

      const remainingPlayers = getPlayerCount(currentTable) - 1;
      updateData.status = remainingPlayers === 0 ? 'free' : 'waiting';

      await supabase
        .from('bura_lobby_tables')
        .update(updateData)
        .eq('id', currentTable.id);
    } catch (error) {
      console.error('Error leaving table:', error);
      toast({ title: 'შეცდომა მაგიდის დატოვებისას', variant: 'destructive' });
    }
  };

  const getTableStatus = (table: BuraTable) => {
    const count = getPlayerCount(table);
    if (count === 0) return { text: 'თავისუფალია', color: 'text-green-500', bg: 'bg-green-500/10' };
    if (count < 2 && table.status !== 'playing') return { 
      text: `დარჩა ${2 - count} ადგილი`, 
      color: 'text-yellow-500', 
      bg: 'bg-yellow-500/10' 
    };
    return { text: 'თამაში მიმდინარეობს', color: 'text-red-500', bg: 'bg-red-500/10' };
  };

  const isUserAtTable = (table: BuraTable) => 
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className="w-6 h-6 text-red-500" />
          <h2 className="text-xl font-bold">ბურა - ლობი</h2>
        </div>
        {userCurrentTable && userCurrentTable.status !== 'playing' && (
          <Button variant="outline" size="sm" onClick={leaveTable}>
            <LogOut className="w-4 h-4 mr-2" />
            მაგიდის დატოვება
          </Button>
        )}
      </div>

      <Card className="bg-red-500/5 border-red-500/20">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            აირჩიეთ მაგიდა და დაელოდეთ 2 მოთამაშის შეკრებას. 
            თამაში ავტომატურად დაიწყება როცა მაგიდა სავსე გახდება.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {tables.map((table) => {
          const status = getTableStatus(table);
          const isCurrentUserHere = isUserAtTable(table);
          const playerCount = getPlayerCount(table);
          const canJoin = table.status !== 'playing' && !isCurrentUserHere && !userCurrentTable;

          return (
            <Card 
              key={table.id}
              className={cn(
                'transition-all duration-200',
                isCurrentUserHere && 'ring-2 ring-red-500',
                canJoin && 'hover:shadow-lg cursor-pointer hover:scale-[1.02]'
              )}
              onClick={() => canJoin && joinTable(table)}
            >
              <CardHeader className="p-3 pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>მაგიდა #{table.table_number}</span>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full', status.bg, status.color)}>
                    {playerCount}/2
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 space-y-2">
                <div className={cn('text-xs font-medium', status.color)}>
                  {status.text}
                </div>

                <div className="space-y-1">
                  {[1, 2].map((slot) => {
                    const playerId = table[`player${slot}_id` as keyof BuraTable];
                    const username = table[`player${slot}_username` as keyof BuraTable];
                    return (
                      <div key={slot} className="flex items-center gap-1.5 text-xs">
                        <Users className="w-3 h-3" />
                        <span className={username ? 'text-foreground' : 'text-muted-foreground'}>
                          {username || 'ცარიელი'}
                        </span>
                        {playerId === user?.id && (
                          <span className="text-red-500 text-[10px]">(თქვენ)</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {canJoin && (
                  <Button 
                    size="sm" 
                    className="w-full h-7 text-xs bg-red-600 hover:bg-red-700"
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
                    მოთამაშის მოლოდინი ({playerCount}/2)...
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

export default BuraLobby;
