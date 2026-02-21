import { memo, useEffect, useState, useCallback, useRef } from 'react';
import { ArrowLeft, RefreshCw, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card as UICard, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';
import { 
  JokerGameState, Card, Suit, PlayedCard, ScoreboardEntry,
  SUIT_SYMBOLS, getCardsForRound, getRoundsInSet
} from './types';
import { 
  initializeGame, shuffleDeck, createDeck, dealCards, getTrumpSuit,
  sortHand, canPlayCard, determineTrickWinner, calculateRoundScore,
  getNextPlayer, getNextDealer, isGameFinished, determineWinner, checkSetBonus
} from './gameLogic';
import JokerCard from './JokerCard';
import JokerScoreboard from './JokerScoreboard';
import JokerBiddingPanel from './JokerBiddingPanel';
import JokerModeDialog from './JokerModeDialog';
import GameMiniChat from '../shared/GameMiniChat';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

interface JokerGameProps {
  tableId: string;
  gameId: string;
  onBack: () => void;
}

const JokerGame = memo(function JokerGame({ tableId, gameId, onBack }: JokerGameProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [gameState, setGameState] = useState<JokerGameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [showJokerModeDialog, setShowJokerModeDialog] = useState(false);
  const [playerNames, setPlayerNames] = useState<Record<string, string>>({});
  const [cardsRevealed, setCardsRevealed] = useState(false);
  const [biddingReady, setBiddingReady] = useState(false);
  const prevRoundRef = useRef<string | null>(null);

  // Load game state
  const loadGame = useCallback(async () => {
    const { data, error } = await supabase
      .from('joker_active_games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (error) {
      console.error('Error loading joker game:', error);
      return;
    }

    setGameState(data as unknown as JokerGameState);
    setLoading(false);

    const { data: tableData } = await supabase
      .from('joker_lobby_tables')
      .select('*')
      .eq('id', tableId)
      .single();

    if (tableData) {
      const names: Record<string, string> = {};
      if (tableData.player1_id) names[tableData.player1_id] = tableData.player1_username || 'Player 1';
      if (tableData.player2_id) names[tableData.player2_id] = tableData.player2_username || 'Player 2';
      if (tableData.player3_id) names[tableData.player3_id] = tableData.player3_username || 'Player 3';
      if (tableData.player4_id) names[tableData.player4_id] = tableData.player4_username || 'Player 4';
      setPlayerNames(names);
    }
  }, [gameId, tableId]);

  // Initialize game if needed
  const initializeNewGame = useCallback(async () => {
    if (!gameState || gameState.deck.length > 0) return;

    const { data: tableData } = await supabase
      .from('joker_lobby_tables')
      .select('*')
      .eq('id', tableId)
      .single();

    if (!tableData || !tableData.player1_id || !tableData.player2_id || 
        !tableData.player3_id || !tableData.player4_id) return;

    const gameInit = initializeGame(
      tableData.player1_id,
      tableData.player2_id,
      tableData.player3_id,
      tableData.player4_id
    );

    const initialScores: Record<string, number> = {
      [tableData.player1_id]: 0,
      [tableData.player2_id]: 0,
      [tableData.player3_id]: 0,
      [tableData.player4_id]: 0,
    };

    const initialTricksWon: Record<string, number> = {
      [tableData.player1_id]: 0,
      [tableData.player2_id]: 0,
      [tableData.player3_id]: 0,
      [tableData.player4_id]: 0,
    };

    await supabase
      .from('joker_active_games')
      .update({
        deck: JSON.parse(JSON.stringify(gameInit.deck)) as Json,
        trump_card: JSON.parse(JSON.stringify(gameInit.trumpCard)) as Json,
        trump_suit: gameInit.trumpSuit,
        player1_hand: JSON.parse(JSON.stringify(gameInit.player1Hand)) as Json,
        player2_hand: JSON.parse(JSON.stringify(gameInit.player2Hand)) as Json,
        player3_hand: JSON.parse(JSON.stringify(gameInit.player3Hand)) as Json,
        player4_hand: JSON.parse(JSON.stringify(gameInit.player4Hand)) as Json,
        dealer_id: gameInit.dealerId,
        current_player_id: gameInit.firstPlayerId,
        trick_leader_id: gameInit.firstPlayerId,
        player_scores: initialScores,
        tricks_won: initialTricksWon,
        phase: 'bidding',
        updated_at: new Date().toISOString()
      })
      .eq('id', gameId);
  }, [gameState, gameId, tableId]);

  useEffect(() => {
    loadGame();

    const channel = supabase
      .channel(`joker-game-${gameId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'joker_active_games', filter: `id=eq.${gameId}` },
        (payload) => {
          setGameState(payload.new as unknown as JokerGameState);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, loadGame]);

  useEffect(() => {
    if (gameState && gameState.deck.length === 0 && gameState.phase === 'bidding') {
      initializeNewGame();
    }
  }, [gameState, initializeNewGame]);

  // Track round changes to trigger card reveal delay
  useEffect(() => {
    if (!gameState) return;
    const roundKey = `${gameState.current_set}-${gameState.current_round}`;
    if (prevRoundRef.current !== roundKey) {
      prevRoundRef.current = roundKey;
      // New round: show cards first, delay bidding
      setCardsRevealed(false);
      setBiddingReady(false);

      // Step 1: reveal cards with animation
      requestAnimationFrame(() => setCardsRevealed(true));

      // Step 2: enable bidding after 1.5s delay
      const timer = setTimeout(() => setBiddingReady(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [gameState?.current_set, gameState?.current_round, gameState]);

  const isMyTurn = gameState?.current_player_id === user?.id;

  const getMyHand = (): Card[] => {
    if (!gameState || !user) return [];
    if (gameState.player1_id === user.id) return gameState.player1_hand;
    if (gameState.player2_id === user.id) return gameState.player2_hand;
    if (gameState.player3_id === user.id) return gameState.player3_hand;
    if (gameState.player4_id === user.id) return gameState.player4_hand;
    return [];
  };

  const getPlayerPosition = (playerId: string): number => {
    if (!gameState) return 0;
    if (gameState.player1_id === playerId) return 0;
    if (gameState.player2_id === playerId) return 1;
    if (gameState.player3_id === playerId) return 2;
    if (gameState.player4_id === playerId) return 3;
    return 0;
  };

  const getPlayersInOrder = (): string[] => {
    if (!gameState) return [];
    return [gameState.player1_id, gameState.player2_id, gameState.player3_id, gameState.player4_id];
  };

  // Handle bidding
  const handleBid = async (bid: number) => {
    if (!gameState || !user || !isMyTurn) return;

    const newBids = { ...gameState.bids, [user.id]: bid };
    const players = getPlayersInOrder();
    const nextPlayer = getNextPlayer(user.id, players);
    const allBid = Object.keys(newBids).length === 4;

    await supabase
      .from('joker_active_games')
      .update({
        bids: newBids,
        current_player_id: allBid ? gameState.trick_leader_id : nextPlayer,
        phase: allBid ? 'playing' : 'bidding',
        updated_at: new Date().toISOString()
      })
      .eq('id', gameId);
  };

  // Handle card play
  const handlePlayCard = async (card: Card, jokerMode?: 'high' | 'low', declaredSuit?: Suit) => {
    if (!gameState || !user || !isMyTurn || gameState.phase !== 'playing') return;

    const myHand = getMyHand();
    const leadSuit = gameState.current_trick.length > 0 
      ? (gameState.current_trick[0].card.isJoker 
          ? gameState.current_trick[0].declaredSuit 
          : gameState.current_trick[0].card.suit as Suit)
      : null;

    if (!canPlayCard(card, myHand, leadSuit, gameState.trump_suit as Suit | null, gameState.current_trick)) {
      toast({ title: 'არასწორი სვლა', variant: 'destructive' });
      return;
    }

    if (card.isJoker && !jokerMode) {
      setSelectedCard(card);
      setShowJokerModeDialog(true);
      return;
    }

    const newHand = myHand.filter(c => c.id !== card.id);
    const handKey = `player${getPlayerPosition(user.id) + 1}_hand`;

    const playedCard: PlayedCard = { card, playerId: user.id, jokerMode, declaredSuit };
    const newTrick = [...gameState.current_trick, playedCard];
    const players = getPlayersInOrder();
    
    if (newTrick.length === 4) {
      const winnerId = determineTrickWinner(newTrick, gameState.trump_suit as Suit | null);
      const newTricksWon = { 
        ...gameState.tricks_won, 
        [winnerId]: (gameState.tricks_won[winnerId] || 0) + 1 
      };

      const totalTricks = Object.values(newTricksWon).reduce((a, b) => a + b, 0);
      const roundComplete = totalTricks === gameState.cards_per_round;

      if (roundComplete) {
        const newScoreboard: ScoreboardEntry[] = [...gameState.scoreboard];
        const roundScores: ScoreboardEntry = {
          set: gameState.current_set,
          round: gameState.current_round,
          cardsPerRound: gameState.cards_per_round,
          scores: players.map(playerId => {
            const bid = gameState.bids[playerId] || 0;
            const tricksWon = newTricksWon[playerId] || 0;
            const points = calculateRoundScore(playerId, bid, tricksWon, gameState.cards_per_round, gameState.player_scores[playerId] || 0);
            return { playerId, bid, tricksWon, points, cumulativeScore: (gameState.player_scores[playerId] || 0) + points };
          })
        };
        newScoreboard.push(roundScores);

        const newPlayerScores = { ...gameState.player_scores };
        roundScores.scores.forEach(s => { newPlayerScores[s.playerId] = s.cumulativeScore; });

        const roundsInCurrentSet = getRoundsInSet(gameState.current_set);
        const roundsPlayedInSet = newScoreboard.filter(e => e.set === gameState.current_set).length;
        
        if (roundsPlayedInSet === roundsInCurrentSet) {
          players.forEach(playerId => {
            const { hasBonus, bonusAmount } = checkSetBonus(newScoreboard, playerId, gameState.current_set);
            if (hasBonus) {
              newPlayerScores[playerId] = (newPlayerScores[playerId] || 0) + bonusAmount;
            }
          });
        }

        let nextSet = gameState.current_set;
        let nextRound = gameState.current_round + 1;

        if (nextRound > roundsInCurrentSet) {
          nextSet++;
          nextRound = 1;
        }

        const gameFinished = isGameFinished(nextSet, nextRound);

        if (gameFinished) {
          const winner = determineWinner(newPlayerScores);
          await supabase
            .from('joker_active_games')
            .update({
              [handKey]: JSON.parse(JSON.stringify(newHand)) as Json,
              current_trick: [], tricks_won: {}, bids: {},
              scoreboard: JSON.parse(JSON.stringify(newScoreboard)) as Json,
              player_scores: newPlayerScores,
              phase: 'game_end', status: 'finished', winner_id: winner,
              updated_at: new Date().toISOString()
            })
            .eq('id', gameId);

          await supabase
            .from('joker_lobby_tables')
            .update({
              player1_id: null, player1_username: null,
              player2_id: null, player2_username: null,
              player3_id: null, player3_username: null,
              player4_id: null, player4_username: null,
              status: 'free', game_id: null
            })
            .eq('id', tableId);
        } else {
          const newDealer = getNextDealer(gameState.dealer_id, players);
          const firstPlayer = getNextPlayer(newDealer, players);
          const cardsPerRound = getCardsForRound(nextSet, nextRound);
          let deck = shuffleDeck(createDeck());
          const { hands, remainingDeck, trumpCard } = dealCards(deck, cardsPerRound);
          const trumpSuit = getTrumpSuit(trumpCard);

          await supabase
            .from('joker_active_games')
            .update({
              deck: JSON.parse(JSON.stringify(remainingDeck)) as Json,
              trump_card: JSON.parse(JSON.stringify(trumpCard)) as Json,
              trump_suit: trumpSuit,
              player1_hand: JSON.parse(JSON.stringify(sortHand(hands[0], trumpSuit))) as Json,
              player2_hand: JSON.parse(JSON.stringify(sortHand(hands[1], trumpSuit))) as Json,
              player3_hand: JSON.parse(JSON.stringify(sortHand(hands[2], trumpSuit))) as Json,
              player4_hand: JSON.parse(JSON.stringify(sortHand(hands[3], trumpSuit))) as Json,
              current_trick: [],
              tricks_won: { [players[0]]: 0, [players[1]]: 0, [players[2]]: 0, [players[3]]: 0 },
              bids: {},
              current_set: nextSet, current_round: nextRound, cards_per_round: cardsPerRound,
              dealer_id: newDealer, current_player_id: firstPlayer, trick_leader_id: firstPlayer,
              scoreboard: JSON.parse(JSON.stringify(newScoreboard)) as Json,
              player_scores: newPlayerScores,
              phase: 'bidding',
              updated_at: new Date().toISOString()
            })
            .eq('id', gameId);
        }
      } else {
        await supabase
          .from('joker_active_games')
          .update({
            [handKey]: JSON.parse(JSON.stringify(newHand)) as Json,
            current_trick: [],
            tricks_won: newTricksWon,
            current_player_id: winnerId, trick_leader_id: winnerId,
            updated_at: new Date().toISOString()
          })
          .eq('id', gameId);
      }
    } else {
      const nextPlayer = getNextPlayer(user.id, players);
      await supabase
        .from('joker_active_games')
        .update({
          [handKey]: JSON.parse(JSON.stringify(newHand)) as Json,
          current_trick: JSON.parse(JSON.stringify(newTrick)) as Json,
          current_player_id: nextPlayer,
          updated_at: new Date().toISOString()
        })
        .eq('id', gameId);
    }

    setSelectedCard(null);
  };

  const handleJokerModeSelect = (mode: 'high' | 'low', suit: Suit) => {
    if (selectedCard) {
      handlePlayCard(selectedCard, mode, suit);
    }
    setShowJokerModeDialog(false);
  };

  if (loading || !gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  const myHand = getMyHand();
  const players = getPlayersInOrder();
  const myPosition = user ? getPlayerPosition(user.id) : 0;

  const getRelativePosition = (playerId: string): 'bottom' | 'left' | 'top' | 'right' => {
    const pos = getPlayerPosition(playerId);
    const relative = (pos - myPosition + 4) % 4;
    return ['bottom', 'left', 'top', 'right'][relative] as 'bottom' | 'left' | 'top' | 'right';
  };

  const isBiddingPhase = gameState.phase === 'bidding';
  const showBidPanel = isBiddingPhase && isMyTurn && biddingReady;

  return (
    <div className={cn(
      "min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900",
      showBidPanel && "pb-48" // space for bottom bid panel
    )}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/30 backdrop-blur-lg border-b border-white/10">
        <div className="flex items-center justify-between p-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="text-white">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="text-white text-center">
            <div className="font-bold">ჯოკერი</div>
            <div className="text-xs opacity-70">
              სეტი {gameState.current_set} | რაუნდი {gameState.current_round} | {gameState.cards_per_round} კარტი
            </div>
          </div>
          <div className="w-10" />
        </div>
      </div>

      <div className="p-3 flex gap-3">
        {/* Main game area */}
        <div className="flex-1">
          {/* Trump indicator with glow */}
          {gameState.trump_card && (
            <div className="mb-3 flex items-center justify-center gap-2">
              <span className="text-white/70 text-sm">კოზირი:</span>
              <div className="relative">
                <div className="absolute inset-0 rounded-lg blur-md bg-yellow-400/40 animate-pulse" />
                <div className="relative">
                  <JokerCard card={gameState.trump_card} small isTrump />
                </div>
              </div>
              {gameState.trump_suit && (
                <span className={cn(
                  "text-3xl drop-shadow-[0_0_8px_rgba(255,215,0,0.6)]",
                  gameState.trump_suit === 'hearts' || gameState.trump_suit === 'diamonds' 
                    ? 'text-red-400' 
                    : 'text-white'
                )}>
                  {SUIT_SYMBOLS[gameState.trump_suit as Suit]}
                </span>
              )}
              {!gameState.trump_suit && (
                <span className="text-white/70 text-sm">არ არის (ჯოკერი)</span>
              )}
            </div>
          )}

          {/* Bidding status for non-active players */}
          {isBiddingPhase && !isMyTurn && (
            <div className="mb-3 text-center">
              <div className="inline-block bg-yellow-500/20 text-yellow-300 text-sm px-3 py-1.5 rounded-full animate-pulse">
                ⏳ {playerNames[gameState.current_player_id] || 'მოთამაშე'} ირჩევს ბიდს...
              </div>
            </div>
          )}

          {/* Game table */}
          <div className="relative aspect-square max-w-md mx-auto bg-green-800/50 rounded-2xl border-4 border-yellow-600/50">
            {/* Other players */}
            {players.filter(p => p !== user?.id).map((playerId) => {
              const position = getRelativePosition(playerId);
              const tricksWon = gameState.tricks_won[playerId] || 0;
              const bid = gameState.bids[playerId];
              const isCurrentPlayer = gameState.current_player_id === playerId;

              return (
                <div 
                  key={playerId}
                  className={cn(
                    "absolute flex flex-col items-center gap-1",
                    position === 'top' && "top-2 left-1/2 -translate-x-1/2",
                    position === 'left' && "left-2 top-1/2 -translate-y-1/2",
                    position === 'right' && "right-2 top-1/2 -translate-y-1/2"
                  )}
                >
                  <div className={cn(
                    "text-white text-xs px-2 py-1 rounded-full",
                    isCurrentPlayer ? "bg-yellow-500" : "bg-black/50"
                  )}>
                    {playerNames[playerId] || 'Player'}
                  </div>
                  <div className="text-white/70 text-[10px]">
                    {bid !== undefined ? `ბიდი: ${bid} | მოგ: ${tricksWon}` : 'ბიდი: ?'}
                  </div>
                </div>
              );
            })}

            {/* Current trick (center) */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex gap-1 flex-wrap justify-center max-w-[200px]">
                {gameState.current_trick.map((pc, idx) => (
                  <div key={idx} className="relative">
                    <JokerCard card={pc.card} small />
                    {pc.jokerMode && (
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] bg-purple-600 text-white px-1 rounded">
                        {pc.jokerMode === 'high' ? '⬆️' : '⬇️'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* My info */}
          <div className="mt-3 text-center">
            <div className={cn(
              "inline-block text-white text-sm px-3 py-1 rounded-full",
              isMyTurn ? "bg-yellow-500" : "bg-black/50"
            )}>
              {playerNames[user?.id || ''] || 'Me'} {isMyTurn && '(თქვენი სვლა)'}
            </div>
            <div className="text-white/70 text-xs mt-1">
              ბიდი: {gameState.bids[user?.id || ''] ?? '?'} | მოგებული: {gameState.tricks_won[user?.id || ''] || 0}
            </div>
          </div>

          {/* My hand - with deal animation */}
          <div className="mt-3 flex justify-center flex-wrap gap-1">
            {myHand.map((card, idx) => {
              const leadSuit = gameState.current_trick.length > 0 
                ? (gameState.current_trick[0].card.isJoker 
                    ? gameState.current_trick[0].declaredSuit 
                    : gameState.current_trick[0].card.suit as Suit)
                : null;
              const canPlay = isMyTurn && gameState.phase === 'playing' && 
                canPlayCard(card, myHand, leadSuit, gameState.trump_suit as Suit | null, gameState.current_trick);
              const isTrumpCard = !card.isJoker && card.suit === gameState.trump_suit;

              return (
                <motion.div
                  key={card.id}
                  initial={{ y: 40, opacity: 0, scale: 0.8 }}
                  animate={cardsRevealed ? { y: 0, opacity: 1, scale: 1 } : {}}
                  transition={{ delay: idx * 0.08, type: 'spring', damping: 15 }}
                >
                  <JokerCard
                    card={card}
                    onClick={() => canPlay && handlePlayCard(card)}
                    disabled={!canPlay}
                    selected={selectedCard?.id === card.id}
                    isTrump={isTrumpCard}
                  />
                </motion.div>
              );
            })}
          </div>

          {/* Game end */}
          {gameState.status === 'finished' && (
            <UICard className="mt-4 bg-yellow-500/20 border-yellow-500">
              <CardContent className="p-4 text-center">
                <Trophy className="w-12 h-12 mx-auto text-yellow-500 mb-2" />
                <h3 className="text-xl font-bold text-white">თამაში დასრულდა!</h3>
                <p className="text-white/80">
                  გამარჯვებული: {playerNames[gameState.winner_id || ''] || 'Unknown'}
                </p>
                <p className="text-white/70 text-sm">
                  ქულა: {gameState.player_scores[gameState.winner_id || ''] || 0}
                </p>
                <Button onClick={onBack} className="mt-3">
                  ლობიში დაბრუნება
                </Button>
              </CardContent>
            </UICard>
          )}
        </div>

        {/* Scoreboard sidebar */}
        <div className="w-64 hidden lg:block">
          <JokerScoreboard
            scoreboard={gameState.scoreboard}
            playerScores={gameState.player_scores}
            playerNames={playerNames}
            currentUserId={user?.id || ''}
            currentSet={gameState.current_set}
            currentRound={gameState.current_round}
          />
        </div>
      </div>

      {/* Inline Bidding Panel (bottom, never covers cards) */}
      <AnimatePresence>
        {showBidPanel && (
          <JokerBiddingPanel
            cardsPerRound={gameState.cards_per_round}
            existingBids={Object.values(gameState.bids)}
            isDealer={gameState.dealer_id === user?.id}
            onBid={handleBid}
            otherBids={gameState.bids}
            playerNames={playerNames}
          />
        )}
      </AnimatePresence>

      {/* Joker mode dialog */}
      <JokerModeDialog
        open={showJokerModeDialog}
        onSelect={handleJokerModeSelect}
      />

      {/* Mini Chat */}
      <GameMiniChat
        gameId={gameId}
        gameType="joker"
        playerNames={playerNames}
      />
    </div>
  );
});

export default JokerGame;
