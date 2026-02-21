import { memo } from 'react';
import { ScoreboardEntry } from './types';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface JokerScoreboardProps {
  scoreboard: ScoreboardEntry[];
  playerScores: Record<string, number>;
  playerNames: Record<string, string>;
  currentUserId: string;
  currentSet: number;
  currentRound: number;
}

const JokerScoreboard = memo(function JokerScoreboard({
  scoreboard,
  playerScores,
  playerNames,
  currentUserId,
  currentSet,
  currentRound
}: JokerScoreboardProps) {
  const playerIds = Object.keys(playerNames);

  return (
    <div className="bg-card rounded-lg border shadow-sm">
      <div className="p-3 border-b">
        <h3 className="font-semibold text-sm">📊 ქულების ცხრილი</h3>
        <p className="text-xs text-muted-foreground">
          სეტი {currentSet} | რაუნდი {currentRound}
        </p>
      </div>
      
      <ScrollArea className="h-[300px]">
        <div className="p-2">
          {/* Header row */}
          <div className="grid grid-cols-5 gap-1 text-xs font-medium mb-2 sticky top-0 bg-card pb-1 border-b">
            <div className="text-muted-foreground">რაუნდი</div>
            {playerIds.map(playerId => (
              <div 
                key={playerId}
                className={cn(
                  "text-center truncate",
                  playerId === currentUserId && "text-primary font-bold"
                )}
              >
                {playerNames[playerId]?.slice(0, 8)}
              </div>
            ))}
          </div>

          {/* Score rows */}
          {scoreboard.length > 0 ? (
            scoreboard.map((entry, idx) => (
              <div 
                key={idx}
                className={cn(
                  "grid grid-cols-5 gap-1 text-xs py-1 border-b border-border/50",
                  entry.set !== currentSet && "opacity-60"
                )}
              >
                <div className="text-muted-foreground">
                  S{entry.set}R{entry.round}
                  <span className="text-[10px] ml-1">({entry.cardsPerRound})</span>
                </div>
                {playerIds.map(playerId => {
                  const score = entry.scores.find(s => s.playerId === playerId);
                  if (!score) return <div key={playerId} className="text-center">-</div>;
                  
                  const bidMet = score.bid === score.tricksWon;
                  return (
                    <div 
                      key={playerId}
                      className={cn(
                        "text-center",
                        bidMet ? "text-green-600" : "text-red-500"
                      )}
                    >
                      <div className="font-medium">{score.points}</div>
                      <div className="text-[9px] text-muted-foreground">
                        {score.bid}/{score.tricksWon}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          ) : (
            <div className="text-center text-muted-foreground text-xs py-4">
              თამაში ახლახან დაიწყო
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Total scores */}
      <div className="p-3 border-t bg-muted/30">
        <div className="grid grid-cols-5 gap-1 text-xs">
          <div className="font-semibold">ჯამი</div>
          {playerIds.map(playerId => (
            <div 
              key={playerId}
              className={cn(
                "text-center font-bold",
                playerId === currentUserId && "text-primary"
              )}
            >
              {playerScores[playerId] || 0}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

export default JokerScoreboard;
