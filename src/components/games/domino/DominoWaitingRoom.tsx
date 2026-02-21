import { memo, useEffect, useState } from 'react';
import { ArrowLeft, Users, Loader2, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { DominoTable } from './types';

interface DominoWaitingRoomProps {
  tableId: string;
  onBack: () => void;
  onGameStart: () => void;
}

const DominoWaitingRoom = memo(function DominoWaitingRoom({
  tableId,
  onBack,
  onGameStart
}: DominoWaitingRoomProps) {
  const { user } = useAuth();
  const [table, setTable] = useState<DominoTable | null>(null);

  useEffect(() => {
    const loadTable = async () => {
      const { data } = await supabase
        .from('domino_lobby_tables')
        .select('*')
        .eq('id', tableId)
        .single();
      
      if (data) setTable(data as DominoTable);
    };

    loadTable();

    const channel = supabase
      .channel(`domino-table-${tableId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'domino_lobby_tables', filter: `id=eq.${tableId}` },
        (payload) => {
          const newTable = payload.new as DominoTable;
          setTable(newTable);
          if (newTable.status === 'playing') {
            onGameStart();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tableId, onGameStart]);

  const playerCount = table ? [table.player1_id, table.player2_id].filter(Boolean).length : 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border/40">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-bold text-lg">მაგიდა #{table?.table_number}</h1>
        </div>
      </div>

      <div className="p-4 flex flex-col items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-blue-500/20 flex items-center justify-center">
              <Square className="w-10 h-10 text-blue-500" />
            </div>
            
            <div>
              <h2 className="text-xl font-bold mb-2">მოთამაშეების მოლოდინი</h2>
              <p className="text-muted-foreground">
                {playerCount}/2 მოთამაშე
              </p>
            </div>

            <div className="space-y-2">
              {[1, 2].map((slot) => {
                const playerId = table?.[`player${slot}_id` as keyof DominoTable];
                const username = table?.[`player${slot}_username` as keyof DominoTable];
                return (
                  <div 
                    key={slot}
                    className={`p-3 rounded-lg border ${playerId ? 'border-blue-500 bg-blue-500/10' : 'border-dashed border-muted-foreground/30'}`}
                  >
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span className={username ? 'font-medium' : 'text-muted-foreground'}>
                        {username || 'ელოდება მოთამაშეს...'}
                      </span>
                      {playerId === user?.id && (
                        <span className="text-blue-500 text-xs">(თქვენ)</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">მოთამაშეების მოლოდინი...</span>
            </div>

            <Button variant="outline" onClick={onBack} className="w-full">
              მაგიდის დატოვება
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

export default DominoWaitingRoom;
