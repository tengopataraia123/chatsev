import { memo, useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Bot, Trophy, RefreshCw, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card as UICard, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { 
  Card, Suit, PlayedCard, ScoreboardEntry,
  SUIT_SYMBOLS, getCardsForRound, getRoundsInSet
} from './types';
import { 
  initializeGame, shuffleDeck, createDeck, dealCards, getTrumpSuit,
  sortHand, canPlayCard, determineTrickWinner, calculateRoundScore,
  getNextPlayer, getNextDealer, isGameFinished, determineWinner, checkSetBonus
} from './gameLogic';
import { BotDifficulty, getBotDelay, getBotBid, getBotPlayCard } from './JokerBotAI';
import JokerCard from './JokerCard';
import JokerScoreboard from './JokerScoreboard';
import JokerBiddingDialog from './JokerBiddingDialog';
import JokerModeDialog from './JokerModeDialog';
import { cn } from '@/lib/utils';

interface JokerBotGameProps {
  difficulty: BotDifficulty;
  onBack: () => void;
}

interface GameState {
  deck: Card[];
  trumpCard: Card | null;
  trumpSuit: Suit | null;
  hands: Card[][];
  currentTrick: PlayedCard[];
  trickLeaderId: string;
  bids: Record<string, number>;
  tricksWon: Record<string, number>;
  currentSet: number;
  currentRound: number;
  cardsPerRound: number;
  dealerId: string;
  currentPlayerId: string;
  phase: 'bidding' | 'playing' | 'round_end' | 'game_end';
  scoreboard: ScoreboardEntry[];
  playerScores: Record<string, number>;
  winnerId: string | null;
}

const BOT_NAMES = ['ბოტი 1', 'ბოტი 2', 'ბოტი 3'];
const DIFFICULTY_NAMES: Record<BotDifficulty, string> = {
  easy: 'მარტივი',
  medium: 'საშუალო',
  hard: 'რთული'
};

const JokerBotGame = memo(function JokerBotGame({ difficulty, onBack }: JokerBotGameProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [showBiddingDialog, setShowBiddingDialog] = useState(false);
  const [showJokerModeDialog, setShowJokerModeDialog] = useState(false);
  const [showScoreboard, setShowScoreboard] = useState(false);
  const botThinkingRef = useRef(false);

  // Player IDs (user is always player 0)
  const playerId = user?.id || 'human';
  const players = [playerId, 'bot1', 'bot2', 'bot3'];
  const playerNames: Record<string, string> = {
    [playerId]: profile?.username || 'თქვენ',
    'bot1': BOT_NAMES[0],
    'bot2': BOT_NAMES[1],
    'bot3': BOT_NAMES[2],
  };

  // Initialize game
  useEffect(() => {
    startNewGame();
  }, [playerId]);

  const startNewGame = useCallback(() => {
    const gameInit = initializeGame(playerId, 'bot1', 'bot2', 'bot3');
    
    const initialScores: Record<string, number> = {
      [playerId]: 0, 'bot1': 0, 'bot2': 0, 'bot3': 0
    };
    const initialTricksWon: Record<string, number> = {
      [playerId]: 0, 'bot1': 0, 'bot2': 0, 'bot3': 0
    };

    setGameState({
      deck: gameInit.deck,
      trumpCard: gameInit.trumpCard,
      trumpSuit: gameInit.trumpSuit,
      hands: [
        gameInit.player1Hand,
        gameInit.player2Hand,
        gameInit.player3Hand,
        gameInit.player4Hand
      ],
      currentTrick: [],
      trickLeaderId: gameInit.firstPlayerId,
      bids: {},
      tricksWon: initialTricksWon,
      currentSet: 1,
      currentRound: 1,
      cardsPerRound: 1,
      dealerId: gameInit.dealerId,
      currentPlayerId: gameInit.firstPlayerId,
      phase: 'bidding',
      scoreboard: [],
      playerScores: initialScores,
      winnerId: null
    });
    setShowScoreboard(false);
  }, [playerId]);

  // Get player index
  const getPlayerIndex = (pid: string): number => players.indexOf(pid);

  // Is it human's turn?
  const isMyTurn = gameState?.currentPlayerId === playerId;

  // Get my hand
  const getMyHand = (): Card[] => gameState?.hands[0] || [];

  // Bot logic
  useEffect(() => {
    if (!gameState || botThinkingRef.current) return;
    if (gameState.phase === 'game_end') return;
    if (gameState.currentPlayerId === playerId) return;

    const botId = gameState.currentPlayerId;
    const botIndex = getPlayerIndex(botId);
    
    botThinkingRef.current = true;

    const delay = getBotDelay(difficulty);
    
    setTimeout(() => {
      if (gameState.phase === 'bidding') {
        // Bot bidding
        const existingBids = players
          .slice(0, botIndex)
          .map(p => gameState.bids[p])
          .filter(b => b !== undefined);
        
        const isDealer = gameState.dealerId === botId;
        const bid = getBotBid(
          difficulty,
          gameState.hands[botIndex],
          gameState.cardsPerRound,
          existingBids,
          isDealer,
          gameState.trumpSuit
        );
        
        handleBotBid(botId, bid);
      } else if (gameState.phase === 'playing') {
        // Bot playing
        const result = getBotPlayCard(
          difficulty,
          gameState.hands[botIndex],
          gameState.currentTrick,
          gameState.trumpSuit,
          gameState.bids[botId] || 0,
          gameState.tricksWon[botId] || 0,
          gameState.cardsPerRound
        );
        
        if (result) {
          handleBotPlay(botId, result.card, result.jokerMode, result.declaredSuit);
        }
      }
      
      botThinkingRef.current = false;
    }, delay);
  }, [gameState?.currentPlayerId, gameState?.phase, difficulty, playerId]);

  // Handle bot bid
  const handleBotBid = (botId: string, bid: number) => {
    setGameState(prev => {
      if (!prev) return prev;
      
      const newBids = { ...prev.bids, [botId]: bid };
      const allBid = Object.keys(newBids).length === 4;
      const nextPlayer = getNextPlayer(botId, players);
      
      return {
        ...prev,
        bids: newBids,
        currentPlayerId: allBid ? prev.trickLeaderId : nextPlayer,
        phase: allBid ? 'playing' : 'bidding'
      };
    });
  };

  // Handle bot play
  const handleBotPlay = (botId: string, card: Card, jokerMode?: 'high' | 'low', declaredSuit?: Suit) => {
    processCardPlay(botId, card, jokerMode, declaredSuit);
  };

  // Handle human bid
  const handleBid = (bid: number) => {
    setGameState(prev => {
      if (!prev) return prev;
      
      const newBids = { ...prev.bids, [playerId]: bid };
      const allBid = Object.keys(newBids).length === 4;
      const nextPlayer = getNextPlayer(playerId, players);
      
      return {
        ...prev,
        bids: newBids,
        currentPlayerId: allBid ? prev.trickLeaderId : nextPlayer,
        phase: allBid ? 'playing' : 'bidding'
      };
    });
    setShowBiddingDialog(false);
  };

  // Handle human card play
  const handlePlayCard = (card: Card, jokerMode?: 'high' | 'low', declaredSuit?: Suit) => {
    if (!gameState || !isMyTurn || gameState.phase !== 'playing') return;

    const myHand = getMyHand();
    const leadSuit = gameState.currentTrick.length > 0 
      ? (gameState.currentTrick[0].card.isJoker 
          ? gameState.currentTrick[0].declaredSuit 
          : gameState.currentTrick[0].card.suit as Suit)
      : null;

    if (!canPlayCard(card, myHand, leadSuit, gameState.trumpSuit, gameState.currentTrick)) {
      toast({ title: 'არასწორი სვლა', variant: 'destructive' });
      return;
    }

    if (card.isJoker && !jokerMode) {
      setSelectedCard(card);
      setShowJokerModeDialog(true);
      return;
    }

    processCardPlay(playerId, card, jokerMode, declaredSuit);
    setSelectedCard(null);
  };

  // Process card play (shared by human and bot)
  const processCardPlay = (pid: string, card: Card, jokerMode?: 'high' | 'low', declaredSuit?: Suit) => {
    setGameState(prev => {
      if (!prev) return prev;

      const playerIndex = getPlayerIndex(pid);
      const newHands = [...prev.hands];
      newHands[playerIndex] = newHands[playerIndex].filter(c => c.id !== card.id);

      const playedCard: PlayedCard = { card, playerId: pid, jokerMode, declaredSuit };
      const newTrick = [...prev.currentTrick, playedCard];

      // Trick complete?
      if (newTrick.length === 4) {
        const winnerId = determineTrickWinner(newTrick, prev.trumpSuit);
        const newTricksWon = { 
          ...prev.tricksWon, 
          [winnerId]: (prev.tricksWon[winnerId] || 0) + 1 
        };

        const totalTricks = Object.values(newTricksWon).reduce((a, b) => a + b, 0);
        const roundComplete = totalTricks === prev.cardsPerRound;

        if (roundComplete) {
          return processRoundEnd(prev, newHands, newTricksWon);
        } else {
          return {
            ...prev,
            hands: newHands,
            currentTrick: [],
            tricksWon: newTricksWon,
            currentPlayerId: winnerId,
            trickLeaderId: winnerId
          };
        }
      } else {
        return {
          ...prev,
          hands: newHands,
          currentTrick: newTrick,
          currentPlayerId: getNextPlayer(pid, players)
        };
      }
    });
  };

  // Process round end
  const processRoundEnd = (prev: GameState, newHands: Card[][], newTricksWon: Record<string, number>): GameState => {
    const newScoreboard: ScoreboardEntry[] = [...prev.scoreboard];
    const roundScores: ScoreboardEntry = {
      set: prev.currentSet,
      round: prev.currentRound,
      cardsPerRound: prev.cardsPerRound,
      scores: players.map(pid => {
        const bid = prev.bids[pid] || 0;
        const tricksWon = newTricksWon[pid] || 0;
        const points = calculateRoundScore(pid, bid, tricksWon, prev.cardsPerRound, prev.playerScores[pid] || 0);
        return {
          playerId: pid,
          bid,
          tricksWon,
          points,
          cumulativeScore: (prev.playerScores[pid] || 0) + points
        };
      })
    };
    newScoreboard.push(roundScores);

    const newPlayerScores = { ...prev.playerScores };
    roundScores.scores.forEach(s => {
      newPlayerScores[s.playerId] = s.cumulativeScore;
    });

    // Check set bonus
    const roundsInCurrentSet = getRoundsInSet(prev.currentSet);
    const roundsPlayedInSet = newScoreboard.filter(e => e.set === prev.currentSet).length;
    
    if (roundsPlayedInSet === roundsInCurrentSet) {
      players.forEach(pid => {
        const { hasBonus, bonusAmount } = checkSetBonus(newScoreboard, pid, prev.currentSet);
        if (hasBonus) {
          newPlayerScores[pid] = (newPlayerScores[pid] || 0) + bonusAmount;
        }
      });
    }

    // Next round
    let nextSet = prev.currentSet;
    let nextRound = prev.currentRound + 1;

    if (nextRound > roundsInCurrentSet) {
      nextSet++;
      nextRound = 1;
    }

    if (isGameFinished(nextSet, nextRound)) {
      const winner = determineWinner(newPlayerScores);
      return {
        ...prev,
        hands: newHands,
        currentTrick: [],
        scoreboard: newScoreboard,
        playerScores: newPlayerScores,
        phase: 'game_end',
        winnerId: winner
      };
    }

    // Start new round
    const newDealer = getNextDealer(prev.dealerId, players);
    const firstPlayer = getNextPlayer(newDealer, players);
    const cardsPerRound = getCardsForRound(nextSet, nextRound);
    
    let deck = shuffleDeck(createDeck());
    const { hands, remainingDeck, trumpCard } = dealCards(deck, cardsPerRound);
    const trumpSuit = getTrumpSuit(trumpCard);

    return {
      ...prev,
      deck: remainingDeck,
      trumpCard,
      trumpSuit,
      hands: hands.map(h => sortHand(h, trumpSuit)),
      currentTrick: [],
      tricksWon: { [playerId]: 0, 'bot1': 0, 'bot2': 0, 'bot3': 0 },
      bids: {},
      currentSet: nextSet,
      currentRound: nextRound,
      cardsPerRound,
      dealerId: newDealer,
      currentPlayerId: firstPlayer,
      trickLeaderId: firstPlayer,
      scoreboard: newScoreboard,
      playerScores: newPlayerScores,
      phase: 'bidding'
    };
  };

  // Show bidding dialog
  useEffect(() => {
    if (gameState?.phase === 'bidding' && isMyTurn && !showBiddingDialog) {
      setShowBiddingDialog(true);
    }
  }, [gameState?.phase, isMyTurn, showBiddingDialog]);

  // Handle joker mode
  const handleJokerModeSelect = (mode: 'high' | 'low', suit: Suit) => {
    if (selectedCard) {
      handlePlayCard(selectedCard, mode, suit);
    }
    setShowJokerModeDialog(false);
  };

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  const myHand = getMyHand();

  // Relative positions
  const getRelativePlayer = (index: number): { id: string; name: string; hand: Card[]; position: string } => {
    const positions = ['bottom', 'left', 'top', 'right'];
    return {
      id: players[index],
      name: playerNames[players[index]],
      hand: gameState.hands[index],
      position: positions[index]
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/30 backdrop-blur-lg border-b border-white/10">
        <div className="flex items-center justify-between p-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="text-white">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="text-white text-center">
            <div className="font-bold flex items-center justify-center gap-2">
              <Bot className="w-4 h-4" />
              ჯოკერი - {DIFFICULTY_NAMES[difficulty]}
            </div>
            <div className="text-xs opacity-70">
              სეტი {gameState.currentSet} | რაუნდი {gameState.currentRound} | {gameState.cardsPerRound} კარტი
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowScoreboard(true)}
            className="text-white text-xs"
          >
            ქულები
          </Button>
        </div>
      </div>

      {/* Game end overlay */}
      {gameState.phase === 'game_end' && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <UICard className="max-w-sm w-full bg-gradient-to-br from-yellow-500 to-amber-600 border-0">
            <CardContent className="p-6 text-center text-white">
              <Trophy className="w-16 h-16 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">თამაში დასრულდა!</h2>
              <p className="text-lg mb-4">
                გამარჯვებული: {playerNames[gameState.winnerId || '']}
              </p>
              <div className="space-y-2 mb-4">
                {players.map(pid => (
                  <div key={pid} className="flex justify-between">
                    <span>{playerNames[pid]}</span>
                    <span className="font-bold">{gameState.playerScores[pid]} ქულა</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button onClick={startNewGame} className="flex-1 bg-white text-amber-600">
                  თავიდან
                </Button>
                <Button onClick={onBack} variant="outline" className="flex-1 border-white text-white">
                  გასვლა
                </Button>
              </div>
            </CardContent>
          </UICard>
        </div>
      )}

      {/* Trump indicator */}
      {gameState.trumpCard && (
        <div className="p-2 flex items-center justify-center gap-2">
          <span className="text-white/70 text-sm">ტრამპი:</span>
          {gameState.trumpSuit ? (
            <span className={cn(
              "text-xl",
              gameState.trumpSuit === 'hearts' || gameState.trumpSuit === 'diamonds' 
                ? 'text-red-400' 
                : 'text-white'
            )}>
              {SUIT_SYMBOLS[gameState.trumpSuit]}
            </span>
          ) : (
            <span className="text-white/50 text-sm">არ არის</span>
          )}
        </div>
      )}

      {/* Game table */}
      <div className="relative mx-auto max-w-2xl aspect-square p-4">
        {/* Center trick area */}
        <div className="absolute inset-1/4 bg-green-800/50 rounded-lg flex items-center justify-center">
          <div className="flex gap-1">
            {gameState.currentTrick.map((pc, i) => (
              <div key={i} className="transform scale-75">
                <JokerCard card={pc.card} small />
                <div className="text-white text-xs text-center mt-1">
                  {playerNames[pc.playerId]?.slice(0, 6)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Other players */}
        {[1, 2, 3].map(index => {
          const player = getRelativePlayer(index);
          const isCurrentPlayer = gameState.currentPlayerId === player.id;
          const positions = {
            1: 'left-0 top-1/2 -translate-y-1/2',
            2: 'top-0 left-1/2 -translate-x-1/2',
            3: 'right-0 top-1/2 -translate-y-1/2'
          };

          return (
            <div 
              key={player.id}
              className={cn('absolute', positions[index as 1 | 2 | 3])}
            >
              <UICard className={cn(
                'transition-all',
                isCurrentPlayer && 'ring-2 ring-yellow-400'
              )}>
                <CardContent className="p-2 text-center">
                  <Bot className="w-6 h-6 mx-auto text-purple-400 mb-1" />
                  <div className="text-xs text-white font-medium">{player.name}</div>
                  <div className="text-[10px] text-white/60">
                    კარტი: {player.hand.length}
                  </div>
                  {gameState.bids[player.id] !== undefined && (
                    <div className="text-[10px] text-yellow-400">
                      ბიდი: {gameState.bids[player.id]} | მოგებული: {gameState.tricksWon[player.id] || 0}
                    </div>
                  )}
                </CardContent>
              </UICard>
            </div>
          );
        })}

        {/* My info */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
          <div className="text-center text-white text-sm mb-1">
            <span className="font-medium">{playerNames[playerId]}</span>
            {gameState.bids[playerId] !== undefined && (
              <span className="ml-2 text-yellow-400">
                ბიდი: {gameState.bids[playerId]} | მოგებული: {gameState.tricksWon[playerId] || 0}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* My hand */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/50 backdrop-blur-lg p-3">
        <div className="flex justify-center gap-1 flex-wrap">
          {myHand.map((card) => {
            const leadSuit = gameState.currentTrick.length > 0 
              ? (gameState.currentTrick[0].card.isJoker 
                  ? gameState.currentTrick[0].declaredSuit 
                  : gameState.currentTrick[0].card.suit as Suit)
              : null;
            const canPlay = isMyTurn && gameState.phase === 'playing' && 
              canPlayCard(card, myHand, leadSuit, gameState.trumpSuit, gameState.currentTrick);

            return (
              <div
                key={card.id}
                onClick={() => canPlay && handlePlayCard(card)}
                className={cn(
                  'transition-all cursor-pointer',
                  canPlay && 'hover:-translate-y-2 hover:shadow-lg',
                  !canPlay && 'opacity-50'
                )}
              >
                <JokerCard card={card} />
              </div>
            );
          })}
        </div>
        {isMyTurn && (
          <div className="text-center text-yellow-400 text-sm mt-2 animate-pulse">
            თქვენი სვლაა
          </div>
        )}
      </div>

      {/* Bidding dialog */}
      <JokerBiddingDialog
        open={showBiddingDialog}
        onBid={handleBid}
        cardsPerRound={gameState.cardsPerRound}
        existingBids={Object.values(gameState.bids)}
        isDealer={gameState.dealerId === playerId}
      />

      {/* Joker mode dialog */}
      <JokerModeDialog
        open={showJokerModeDialog}
        onSelect={handleJokerModeSelect}
      />

      {/* Scoreboard Sheet */}
      <Sheet open={showScoreboard} onOpenChange={setShowScoreboard}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              ქულების ცხრილი
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <JokerScoreboard
              scoreboard={gameState.scoreboard}
              playerScores={gameState.playerScores}
              playerNames={playerNames}
              currentUserId={playerId}
              currentSet={gameState.currentSet}
              currentRound={gameState.currentRound}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
});

export default JokerBotGame;
