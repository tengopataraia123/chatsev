import { memo, useEffect, useState } from 'react';
import { ArrowLeft, Users, Loader2, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { BuraTable } from './types';

interface BuraWaitingRoomProps {
  tableId: string;
  onBack: () => void;
  onGameStart: () => void;
}

const BuraWaitingRoom = memo(function BuraWaitingRoom({
  tableId,
  onBack,
  onGameStart
}: BuraWaitingRoomProps) {
  const { user } = useAuth();
  const [table, setTable] = useState<BuraTable | null>(null);

  useEffect(() => {
    const loadTable = async () => {
      const { data } = await supabase
        .from('bura_lobby_tables')
        .select('*')
        .eq('id', tableId)
        .single();
      
      if (data) {
        const t = data as BuraTable;
        setTable(t);
        if (t.status === 'playing') {
          onGameStart();
        }
      }
    };

    loadTable();

    const channel = supabase
      .channel(`bura-table-${tableId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bura_lobby_tables', filter: `id=eq.${tableId}` },
        (payload) => {
          const newTable = payload.new as BuraTable;
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
            <div className="w-20 h-20 mx-auto rounded-full bg-red-500/20 flex items-center justify-center">
              <Flame className="w-10 h-10 text-red-500" />
            </div>
            
            <div>
              <h2 className="text-xl font-bold mb-2">მოთამაშეების მოლოდინი</h2>
              <p className="text-muted-foreground">
                {playerCount}/2 მოთამაშე
              </p>
            </div>

            <div className="space-y-2">
              {[1, 2].map((slot) => {
                const playerId = table?.[`player${slot}_id` as keyof BuraTable];
                const username = table?.[`player${slot}_username` as keyof BuraTable];
                return (
                  <div 
                    key={slot}
                    className={`p-3 rounded-lg border ${playerId ? 'border-red-500 bg-red-500/10' : 'border-dashed border-muted-foreground/30'}`}
                  >
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span className={username ? 'font-medium' : 'text-muted-foreground'}>
                        {username || 'ელოდება მოთამაშეს...'}
                      </span>
                      {playerId === user?.id && (
                        <span className="text-red-500 text-xs">(თქვენ)</span>
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

export default BuraWaitingRoom;
