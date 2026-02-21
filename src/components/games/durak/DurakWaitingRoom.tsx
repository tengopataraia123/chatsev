// Game waiting room - shows game table while waiting for opponents

import { memo, useEffect, useState } from 'react';
import { Users, Loader2, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DurakTable } from './types';
import PlayingCard from './PlayingCard';

interface DurakWaitingRoomProps {
  tableId: string;
  onGameStart: (gameId: string) => void;
  onLeave: () => void;
}

const DurakWaitingRoom = memo(function DurakWaitingRoom({
  tableId,
  onGameStart,
  onLeave,
}: DurakWaitingRoomProps) {
  const { user } = useAuth();
  const [table, setTable] = useState<DurakTable | null>(null);
  const [loading, setLoading] = useState(true);

  // Load and subscribe to table
  useEffect(() => {
    const loadTable = async () => {
      const { data, error } = await supabase
        .from('durak_lobby_tables')
        .select('*')
        .eq('id', tableId)
        .single();

      if (error) {
        console.error('Error loading table:', error);
        return;
      }

      setTable(data as DurakTable);
      setLoading(false);

      // Check if game started
      if (data.game_id && data.status === 'playing') {
        onGameStart(data.game_id);
      }
    };

    loadTable();

    // Subscribe to table changes
    const channel = supabase
      .channel(`durak-table-${tableId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'durak_lobby_tables', filter: `id=eq.${tableId}` },
        (payload) => {
          const updated = payload.new as DurakTable;
          setTable(updated);
          
          // Check if game started
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

  // Handle leave
  const handleLeave = async () => {
    if (!user || !table) {
      onLeave();
      return;
    }

    try {
      if (table.player1_id === user.id) {
        // First player leaving
        if (table.player2_id) {
          // Move player2 to player1
          await supabase
            .from('durak_lobby_tables')
            .update({
              player1_id: table.player2_id,
              player1_username: table.player2_username,
              player2_id: null,
              player2_username: null,
              status: 'waiting'
            })
            .eq('id', tableId);
        } else {
          // Free the table
          await supabase
            .from('durak_lobby_tables')
            .update({
              player1_id: null,
              player1_username: null,
              status: 'free'
            })
            .eq('id', tableId);
        }
      } else if (table.player2_id === user.id) {
        // Second player leaving
        await supabase
          .from('durak_lobby_tables')
          .update({
            player2_id: null,
            player2_username: null,
            status: 'waiting'
          })
          .eq('id', tableId);
      }
    } catch (error) {
      console.error('Error leaving table:', error);
    }

    onLeave();
  };

  if (loading || !table) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const playerCount = (table.player1_id ? 1 : 0) + (table.player2_id ? 1 : 0);
  const isPlayer1 = table.player1_id === user?.id;
  const isPlayer2 = table.player2_id === user?.id;

  return (
    <div className="flex flex-col h-full min-h-[500px] gap-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={handleLeave}>
          გასვლა
        </Button>
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-yellow-500" />
          <span className="font-medium">მაგიდა #{table.table_number}</span>
        </div>
        <div className="w-16" />
      </div>

      {/* Waiting message */}
      <div className="text-center py-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/10 text-yellow-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>მოთამაშის მოლოდინი... ({playerCount}/2)</span>
        </div>
      </div>

      {/* Game table preview */}
      <div className="flex-1 flex flex-col items-center justify-center bg-green-900/20 rounded-xl p-6 relative">
        {/* Opponent position (top) */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2">
          <div className={cn(
            "flex flex-col items-center gap-2 p-3 rounded-lg transition-all",
            !isPlayer1 && table.player1_id ? "bg-card border" : 
            !isPlayer2 && table.player2_id ? "bg-card border" : 
            "border-2 border-dashed border-muted-foreground/30"
          )}>
            <Users className={cn(
              "w-8 h-8",
              (!isPlayer1 && table.player1_id) || (!isPlayer2 && table.player2_id) 
                ? "text-primary" 
                : "text-muted-foreground/50"
            )} />
            <span className="text-sm">
              {!isPlayer1 && table.player1_username ? table.player1_username :
               !isPlayer2 && table.player2_username ? table.player2_username :
               'მოწინააღმდეგე'}
            </span>
            {((!isPlayer1 && !table.player1_id) || (!isPlayer2 && !table.player2_id && table.player1_id)) && (
              <span className="text-xs text-muted-foreground animate-pulse">ველოდებით...</span>
            )}
          </div>
        </div>

        {/* Center - deck preview */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <PlayingCard 
                key={i} 
                card={{ suit: 'hearts', rank: '6', id: `preview-${i}` }} 
                faceDown 
                small 
              />
            ))}
          </div>
          <span className="text-xs text-muted-foreground">36 კარტი</span>
        </div>

        {/* Player position (bottom) */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <div className={cn(
            "flex flex-col items-center gap-2 p-3 rounded-lg",
            "bg-primary/10 border-2 border-primary"
          )}>
            <Users className="w-8 h-8 text-primary" />
            <span className="text-sm font-medium">
              {isPlayer1 ? table.player1_username : table.player2_username} (შენ)
            </span>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="text-center text-sm text-muted-foreground">
        როცა მეორე მოთამაშე შემოვა, თამაში ავტომატურად დაიწყება
      </div>
    </div>
  );
});

export default DurakWaitingRoom;
