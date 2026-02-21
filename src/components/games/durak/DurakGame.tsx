import { memo, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { ArrowLeft, RotateCcw, Flag, Loader2, Shield, Swords } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DurakGameState, Card, TableCard, Suit, SUIT_SYMBOLS, SUIT_COLORS } from './types';
import { 
  initializeGame, 
  canBeat, 
  canAddToAttack, 
  getValidDefenseCards, 
  refillHands, 
  checkWinCondition,
  sortHand 
} from './gameLogic';
import { resetTable, endGameAndCleanup } from './useDurakGameCleanup';
import PlayingCard from './PlayingCard';
import GameMiniChat from '../shared/GameMiniChat';
import { cn } from '@/lib/utils';

interface DurakGameProps {
  tableId: string;
  gameId: string | null;
  onLeave: () => void;
}

const DurakGame = memo(function DurakGame({ tableId, gameId, onLeave }: DurakGameProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [game, setGame] = useState<DurakGameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [actionInProgress, setActionInProgress] = useState(false);
  const lastActionRef = useRef<string | null>(null);
  const [opponentInfo, setOpponentInfo] = useState<{ username: string } | null>(null);

  // Determine player position
  const isPlayer1 = game?.player1_id === user?.id;
  const myHand = isPlayer1 ? game?.player1_hand : game?.player2_hand;
  const opponentHandCount = isPlayer1 ? game?.player2_hand?.length : game?.player1_hand?.length;
  const isMyTurn = game?.attacker_id === user?.id || 
    (game?.phase === 'defense' && game?.defender_id === user?.id);
  const isAttacker = game?.attacker_id === user?.id;
  const isDefender = game?.defender_id === user?.id;

  // Load game
  useEffect(() => {
    const loadGame = async () => {
      if (!gameId) {
        console.error('No game ID provided');
        setLoading(false);
        return;
      }

      // Load existing game
      const { data, error } = await supabase
        .from('durak_active_games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (error) {
        console.error('Error loading game:', error);
        setLoading(false);
        return;
      }

      const gameData = data as unknown as DurakGameState;

      // Check if game needs initialization (deck is empty)
      if (gameData.deck.length === 0 && gameData.player1_hand.length === 0) {
        // Initialize the game
        const gameInit = initializeGame(gameData.player1_id, gameData.player2_id);

        const { data: updatedData, error: updateError } = await supabase
          .from('durak_active_games')
          .update({
            deck: gameInit.deck as any,
            trump_card: gameInit.trumpCard as any,
            trump_suit: gameInit.trumpSuit,
            player1_hand: gameInit.player1Hand as any,
            player2_hand: gameInit.player2Hand as any,
            attacker_id: gameInit.attackerId,
            defender_id: gameInit.defenderId,
          })
          .eq('id', gameId)
          .select()
          .single();

        if (updateError) {
          console.error('Error initializing game:', updateError);
          setLoading(false);
          return;
        }

        setGame(updatedData as unknown as DurakGameState);
      } else {
        setGame(gameData);
      }

      setLoading(false);
    };

    loadGame();
  }, [tableId, gameId]);

  // Subscribe to game updates
  useEffect(() => {
    if (!game?.id) return;

    const channel = supabase
      .channel(`durak-game-${game.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'durak_active_games', filter: `id=eq.${game.id}` },
        (payload) => {
          setGame(payload.new as unknown as DurakGameState);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [game?.id]);

  // Load opponent info
  useEffect(() => {
    const loadOpponent = async () => {
      if (!game) return;
      const opponentId = isPlayer1 ? game.player2_id : game.player1_id;
      
      const { data } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', opponentId)
        .single();

      if (data) setOpponentInfo(data);
    };

    loadOpponent();
  }, [game, isPlayer1]);

  // Update game state with action locking to prevent duplicate moves
  const updateGame = useCallback(async (updates: Partial<DurakGameState>, actionId?: string) => {
    if (!game?.id) return false;
    
    // Prevent duplicate actions
    if (actionId && lastActionRef.current === actionId) {
      console.log('Duplicate action prevented:', actionId);
      return false;
    }
    
    if (actionInProgress) {
      console.log('Action already in progress');
      return false;
    }
    
    setActionInProgress(true);
    if (actionId) lastActionRef.current = actionId;

    try {
      const { error } = await supabase
        .from('durak_active_games')
        .update(updates as any)
        .eq('id', game.id);

      if (error) {
        console.error('Error updating game:', error);
        toast({ title: 'შეცდომა თამაშის განახლებისას', variant: 'destructive' });
        return false;
      }
      return true;
    } finally {
      // Small delay to prevent rapid successive clicks
      setTimeout(() => setActionInProgress(false), 300);
    }
  }, [game?.id, toast, actionInProgress]);

  // Play attack card
  const playAttackCard = useCallback(async (card: Card) => {
    if (!game || !isAttacker || game.phase !== 'attack') return;
    if (!myHand || actionInProgress) return;

    // Check if card can be added to attack
    if (game.table_cards.length > 0 && !canAddToAttack(card, game.table_cards)) {
      toast({ title: 'ეს კარტი არ შეიძლება დადება', variant: 'destructive' });
      return;
    }

    // Max 6 attack cards or defender's hand size
    const defenderHandSize = isPlayer1 ? game.player2_hand.length : game.player1_hand.length;
    if (game.table_cards.length >= 6 || game.table_cards.length >= defenderHandSize) {
      toast({ title: 'მაქსიმალური რაოდენობა მიღწეულია', variant: 'destructive' });
      return;
    }

    const newTableCards: TableCard[] = [...game.table_cards, { attack: card, defense: null }];
    const newHand = myHand.filter(c => c.id !== card.id);

    const updates: Partial<DurakGameState> = {
      table_cards: newTableCards,
      phase: 'defense',
      ...(isPlayer1 ? { player1_hand: newHand } : { player2_hand: newHand }),
    };

    const actionId = `attack-${card.id}-${Date.now()}`;
    await updateGame(updates, actionId);
    setSelectedCard(null);
  }, [game, isAttacker, isPlayer1, myHand, toast, updateGame, actionInProgress]);

  // Play defense card (BEAT)
  const playDefenseCard = useCallback(async (defenseCard: Card, attackIndex: number) => {
    if (!game || !isDefender || game.phase !== 'defense') return;
    if (!myHand || actionInProgress) return;

    const attackCard = game.table_cards[attackIndex]?.attack;
    if (!attackCard) return;

    // Detailed beat validation
    if (!canBeat(attackCard, defenseCard, game.trump_suit as Suit)) {
      // Provide more specific feedback
      const isSameSuit = attackCard.suit === defenseCard.suit;
      const isDefenseTrump = defenseCard.suit === game.trump_suit;
      
      if (isSameSuit) {
        toast({ title: 'საჭიროა მაღალი კარტი იმავე ფერის', variant: 'destructive' });
      } else if (!isDefenseTrump) {
        toast({ title: 'სხვა ფერით გაჭრა მხოლოდ კოზირით შეიძლება', variant: 'destructive' });
      } else {
        toast({ title: 'ეს კარტი ვერ გაჭრის შეტევას', variant: 'destructive' });
      }
      return;
    }

    const newTableCards = game.table_cards.map((tc, i) => 
      i === attackIndex ? { ...tc, defense: defenseCard } : tc
    );
    const newHand = myHand.filter(c => c.id !== defenseCard.id);

    // Check if all attacks defended
    const allDefended = newTableCards.every(tc => tc.defense !== null);

    const updates: Partial<DurakGameState> = {
      table_cards: newTableCards,
      phase: allDefended ? 'attack' : 'defense',
      ...(isPlayer1 ? { player1_hand: newHand } : { player2_hand: newHand }),
    };

    const actionId = `defense-${defenseCard.id}-${attackIndex}-${Date.now()}`;
    await updateGame(updates, actionId);
    setSelectedCard(null);
    
    if (allDefended) {
      toast({ title: '✅ ყველა კარტი გაჭრილია!', variant: 'default' });
    }
  }, [game, isDefender, isPlayer1, myHand, toast, updateGame, actionInProgress]);

  // Pass attack (bito)
  const passAttack = useCallback(async () => {
    if (!game || !isAttacker || game.phase !== 'attack' || actionInProgress) return;
    if (game.table_cards.length === 0) return;

    // Check if all cards are defended before allowing pass
    const allDefended = game.table_cards.every(tc => tc.defense !== null);
    if (!allDefended) {
      toast({ title: 'ჯერ ყველა კარტი უნდა იყოს დაცული', variant: 'destructive' });
      return;
    }

    // All cards defended - discard and swap roles
    const allCards = game.table_cards.flatMap(tc => [tc.attack, tc.defense].filter(Boolean) as Card[]);
    const newDiscardPile = [...game.discard_pile, ...allCards];

    // Refill hands
    const attackerHand = isPlayer1 ? game.player1_hand : game.player2_hand;
    const defenderHand = isPlayer1 ? game.player2_hand : game.player1_hand;
    const { attackerHand: newAttackerHand, defenderHand: newDefenderHand, deck: newDeck } = 
      refillHands(attackerHand, defenderHand, game.deck);

    // Swap roles - defender becomes attacker
    const newAttackerId = game.defender_id;
    const newDefenderId = game.attacker_id;

    // Check win condition
    const p1Hand = isPlayer1 ? newAttackerHand : newDefenderHand;
    const p2Hand = isPlayer1 ? newDefenderHand : newAttackerHand;
    const { winner, loser } = checkWinCondition(p1Hand, p2Hand, newDeck);

    const updates: Partial<DurakGameState> = {
      table_cards: [],
      discard_pile: newDiscardPile,
      deck: newDeck,
      player1_hand: isPlayer1 ? newAttackerHand : newDefenderHand,
      player2_hand: isPlayer1 ? newDefenderHand : newAttackerHand,
      attacker_id: newAttackerId,
      defender_id: newDefenderId,
      phase: winner ? 'finished' : 'attack',
      status: winner ? 'finished' : 'playing',
      winner_id: winner === 'player1' ? game.player1_id : winner === 'player2' ? game.player2_id : null,
      loser_id: loser === 'player1' ? game.player1_id : loser === 'player2' ? game.player2_id : null,
    };

    const actionId = `pass-${Date.now()}`;
    await updateGame(updates, actionId);
  }, [game, isAttacker, isPlayer1, updateGame, actionInProgress, toast]);

  // Take cards (defender gives up)
  const takeCards = useCallback(async () => {
    if (!game || !isDefender || actionInProgress) return;
    if (game.table_cards.length === 0) return;

    // Defender takes all table cards
    const allCards = game.table_cards.flatMap(tc => [tc.attack, tc.defense].filter(Boolean) as Card[]);
    const defenderHand = isPlayer1 ? game.player1_hand : game.player2_hand;
    const newDefenderHand = [...defenderHand, ...allCards];

    // Refill attacker's hand only
    const attackerHand = isPlayer1 ? game.player2_hand : game.player1_hand;
    const { attackerHand: newAttackerHand, deck: newDeck } = 
      refillHands(attackerHand, [], game.deck);

    // Attacker stays attacker (defender "lost" this round)
    const updates: Partial<DurakGameState> = {
      table_cards: [],
      deck: newDeck,
      player1_hand: isPlayer1 ? newDefenderHand : newAttackerHand,
      player2_hand: isPlayer1 ? newAttackerHand : newDefenderHand,
      phase: 'attack',
    };

    const actionId = `take-${Date.now()}`;
    await updateGame(updates, actionId);
  }, [game, isDefender, isPlayer1, updateGame, actionInProgress]);

  // Handle card click
  const handleCardClick = useCallback((card: Card) => {
    if (!isMyTurn) return;

    if (isAttacker && game?.phase === 'attack') {
      if (selectedCard?.id === card.id) {
        playAttackCard(card);
      } else {
        setSelectedCard(card);
      }
    } else if (isDefender && game?.phase === 'defense') {
      setSelectedCard(card);
    }
  }, [isMyTurn, isAttacker, isDefender, game?.phase, selectedCard, playAttackCard]);

  // Handle table card click (for defense)
  const handleTableCardClick = useCallback((index: number) => {
    if (!isDefender || game?.phase !== 'defense' || !selectedCard) return;
    if (game.table_cards[index]?.defense) return; // Already defended

    playDefenseCard(selectedCard, index);
  }, [isDefender, game?.phase, game?.table_cards, selectedCard, playDefenseCard]);

  // Leave game
  const handleLeave = useCallback(async () => {
    if (!game) {
      onLeave();
      return;
    }

    // Mark as loser if game in progress
    if (game.status === 'playing' && game.id) {
      await endGameAndCleanup(
        game.id,
        tableId,
        isPlayer1 ? game.player2_id : game.player1_id,
        user?.id || null
      );
    } else {
      // Just reset the table if game finished
      await resetTable(tableId);
    }

    onLeave();
  }, [game, isPlayer1, onLeave, tableId, user?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">თამაში ვერ მოიძებნა</p>
        <Button onClick={onLeave} className="mt-4">უკან დაბრუნება</Button>
      </div>
    );
  }

  const sortedHand = myHand ? sortHand(myHand, game.trump_suit as Suit) : [];

  return (
    <div className="flex flex-col h-full min-h-[600px] gap-2 p-2 relative">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={handleLeave} disabled={actionInProgress}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          გასვლა
        </Button>
        
        {/* Trump indicator - ALWAYS VISIBLE */}
        {game.trump_suit && (
          <div className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-sm border-2',
            game.trump_suit === 'hearts' || game.trump_suit === 'diamonds' 
              ? 'bg-red-500/20 border-red-500/50 text-red-500' 
              : 'bg-foreground/10 border-foreground/30 text-foreground'
          )}>
            <span>კოზირი:</span>
            <span className="text-lg">{SUIT_SYMBOLS[game.trump_suit]}</span>
          </div>
        )}
        
        <div className="flex items-center gap-2 text-sm">
          <span className={cn(
            'px-2 py-1 rounded',
            isMyTurn ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
          )}>
            {isMyTurn ? (isAttacker ? <><Swords className="w-3 h-3 inline mr-1" />შეტევა</> : <><Shield className="w-3 h-3 inline mr-1" />დაცვა</>) : 'მოთამაშის სვლა'}
          </span>
        </div>
      </div>

      {/* Game finished overlay */}
      {game.status === 'finished' && (
        <div className="absolute inset-0 bg-background/90 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-xl text-center border shadow-lg">
            <h2 className="text-2xl font-bold mb-2">
              {game.winner_id === user?.id ? '🎉 გაიმარჯვე!' : '😢 დამარცხდი'}
            </h2>
            <p className="text-muted-foreground mb-4">
              {game.winner_id === user?.id ? 'შენ გახდი გამარჯვებული!' : 'თქვენ ხართ დურაკი!'}
            </p>
            <Button onClick={handleLeave}>ლობიში დაბრუნება</Button>
          </div>
        </div>
      )}

      {/* Opponent area */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-xs text-muted-foreground">{opponentInfo?.username || 'მოწინააღმდეგე'}</span>
        <div className="flex gap-1 justify-center">
          {Array.from({ length: opponentHandCount || 0 }).map((_, i) => (
            <PlayingCard key={i} card={{ suit: 'hearts', rank: '6', id: `back-${i}` }} faceDown small />
          ))}
        </div>
        {!isMyTurn && <span className="text-xs text-yellow-500 animate-pulse">ფიქრობს...</span>}
      </div>

      {/* Game table */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-secondary/30 rounded-xl p-4 min-h-[200px] relative">
        {/* Trump card and deck - positioned in corner but always visible */}
        <div className="absolute top-3 left-3 flex items-center gap-2 bg-card/80 backdrop-blur-sm rounded-lg p-2 border">
          {/* Deck */}
          <div className="relative">
            {game.deck.length > 0 ? (
              <div className="relative">
                <PlayingCard 
                  card={{ suit: 'spades', rank: 'A', id: 'deck' }} 
                  faceDown 
                  small 
                />
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] bg-card px-1 rounded text-muted-foreground">
                  {game.deck.length}
                </span>
              </div>
            ) : (
              <div className="w-10 h-14 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                <span className="text-xs text-muted-foreground">0</span>
              </div>
            )}
          </div>
          
          {/* Trump card */}
          {game.trump_card && (
            <div className="rotate-90 origin-center ml-2">
              <PlayingCard card={game.trump_card} small disabled />
            </div>
          )}
        </div>

        {/* Table cards */}
        <div className="flex flex-wrap justify-center gap-2 max-w-lg mt-16">
          {game.table_cards.map((tc, index) => {
            const trumpSuit = game.trump_suit as Suit | null;
            const canDefendThis = selectedCard && !tc.defense && trumpSuit && canBeat(tc.attack, selectedCard, trumpSuit);
            return (
              <div 
                key={index} 
                className={cn(
                  'relative transition-all',
                  isDefender && game.phase === 'defense' && !tc.defense && selectedCard && 'cursor-pointer hover:scale-105',
                  canDefendThis && 'ring-2 ring-green-500 ring-offset-2 shadow-lg shadow-green-500/30'
                )}
                onClick={() => handleTableCardClick(index)}
              >
                <PlayingCard card={tc.attack} disabled />
                {tc.defense && (
                  <div className="absolute top-4 left-4">
                    <PlayingCard card={tc.defense} disabled />
                  </div>
                )}
                {isDefender && game.phase === 'defense' && !tc.defense && (
                  <div className={cn(
                    "absolute inset-0 border-2 border-dashed rounded-lg",
                    canDefendThis ? "border-green-500 bg-green-500/20 animate-pulse" : "border-yellow-400/50"
                  )} />
                )}
                {canDefendThis && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                    <Shield className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            );
          })}
          {game.table_cards.length === 0 && (
            <div className="text-muted-foreground text-sm py-8">
              {isAttacker ? 'დადეთ კარტი შესატევად' : 'დაელოდეთ შეტევას'}
            </div>
          )}
        </div>

        {/* Action buttons - improved visibility */}
        {(() => {
          // Calculate if defender can beat any undefended cards
          const undefendedCards = game.table_cards.filter(tc => !tc.defense);
          const hasUndefendedCards = undefendedCards.length > 0;
          const trumpSuit = game.trump_suit as Suit | null;
          
          // Calculate valid defense cards properly with null check
          let canDefendAnyCard = false;
          let validDefenseCount = 0;
          
          if (isDefender && game.phase === 'defense' && myHand && hasUndefendedCards && trumpSuit) {
            for (const tc of undefendedCards) {
              const validCards = getValidDefenseCards(myHand, tc.attack, trumpSuit);
              if (validCards.length > 0) {
                canDefendAnyCard = true;
                validDefenseCount = Math.max(validDefenseCount, validCards.length);
              }
            }
            
            // Debug log for troubleshooting
            console.log('[Durak Defense Check]', {
              isDefender,
              phase: game.phase,
              trumpSuit,
              undefendedCount: undefendedCards.length,
              handSize: myHand.length,
              canDefendAnyCard,
              validDefenseCount,
              undefendedCards: undefendedCards.map(tc => `${tc.attack.rank}${tc.attack.suit}`),
              myHandCards: myHand.map(c => `${c.rank}${c.suit}`)
            });
          }
          
          return (
            <div className="flex flex-col gap-2 items-center">
              <div className="flex gap-3 items-center">
                {/* Attacker: Bito button */}
                {isAttacker && game.phase === 'attack' && game.table_cards.length > 0 && game.table_cards.every(tc => tc.defense !== null) && (
                  <Button onClick={passAttack} variant="default" size="default" disabled={actionInProgress} className="gap-2">
                    <Flag className="w-4 h-4" />
                    ბიტო (დასრულება)
                  </Button>
                )}
                
                {/* Defender: Beat indicator - shown when can defend */}
                {isDefender && game.phase === 'defense' && hasUndefendedCards && canDefendAnyCard && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 rounded-lg border-2 border-green-500/50 animate-pulse">
                    <Shield className="w-5 h-5 text-green-500" />
                    <span className="text-sm font-bold text-green-500">
                      შეგიძლია გაჭრა! ({validDefenseCount} კარტი)
                    </span>
                  </div>
                )}
                
                {/* Defender: Cannot beat indicator */}
                {isDefender && game.phase === 'defense' && hasUndefendedCards && !canDefendAnyCard && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-red-500/20 rounded-lg border-2 border-red-500/50">
                    <RotateCcw className="w-5 h-5 text-red-500" />
                    <span className="text-sm font-bold text-red-500">
                      ვერ გაჭრი - აიღე კარტები
                    </span>
                  </div>
                )}
                
                {/* Defender: Take button - only shown in defense phase */}
                {isDefender && game.phase === 'defense' && game.table_cards.length > 0 && (
                  <Button 
                    onClick={takeCards} 
                    variant={canDefendAnyCard ? "outline" : "destructive"} 
                    size="default" 
                    disabled={actionInProgress} 
                    className={cn(
                      "gap-2",
                      canDefendAnyCard && "opacity-60 border-dashed"
                    )}
                  >
                    <RotateCcw className="w-4 h-4" />
                    აღება ({undefendedCards.length})
                  </Button>
                )}
              </div>
              
              {/* Defense hint - improved */}
              {isDefender && game.phase === 'defense' && hasUndefendedCards && (
                <div className={cn(
                  "text-xs text-center px-3 py-1.5 rounded-lg",
                  canDefendAnyCard ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-500"
                )}>
                  {canDefendAnyCard 
                    ? '🛡️ აირჩიეთ მწვანე კარტი ხელიდან, შემდეგ დააკლიკეთ შესატევ კარტზე'
                    : '❌ ხელში არ გაქვთ კარტი რომელიც გაჭრის - დააჭირეთ "აღება"'}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Discard pile indicator */}
      {game.discard_pile.length > 0 && (
        <div className="absolute bottom-24 right-4 text-xs text-muted-foreground">
          გადაყრილი: {game.discard_pile.length}
        </div>
      )}

      {/* My hand */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-xs text-muted-foreground">{profile?.username || 'თქვენ'}</span>
        <div className="flex gap-1 justify-center flex-wrap max-w-full overflow-x-auto pb-2">
          {sortedHand.map((card) => {
            const trumpSuit = game.trump_suit as Suit | null;
            const canDefendWithCard = trumpSuit && game.table_cards.some(tc => 
              !tc.defense && canBeat(tc.attack, card, trumpSuit)
            );
            
            const isValid = isMyTurn && (
              (isAttacker && game.phase === 'attack' && (game.table_cards.length === 0 || canAddToAttack(card, game.table_cards))) ||
              (isDefender && game.phase === 'defense' && canDefendWithCard)
            );
            
            // Highlight valid defense cards in green
            const isValidDefense = isDefender && game.phase === 'defense' && canDefendWithCard;
            
            return (
              <PlayingCard
                key={card.id}
                card={card}
                onClick={() => handleCardClick(card)}
                selected={selectedCard?.id === card.id}
                disabled={!isValid}
                className={isValidDefense ? 'ring-2 ring-green-500 ring-offset-1' : ''}
              />
            );
          })}
        </div>
        {selectedCard && isAttacker && (
          <span className="text-xs text-yellow-500">დააკლიკეთ კიდევ ერთხელ დასადებად</span>
        )}
        {selectedCard && isDefender && (
          <span className="text-xs text-yellow-500">აირჩიეთ შესატევი კარტი დასაცავად</span>
        )}
      </div>

      {/* Mini Chat */}
      {game?.id && (
        <GameMiniChat
          gameId={game.id}
          gameType="durak"
          playerNames={{
            [game.player1_id]: profile?.username || 'მოთამაშე 1',
            [game.player2_id]: opponentInfo?.username || 'მოთამაშე 2'
          }}
        />
      )}
    </div>
  );
});

export default DurakGame;
