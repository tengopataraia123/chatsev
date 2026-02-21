// Single player Durak game against bot

import { memo, useState, useCallback, useEffect, useMemo } from 'react';
import { ArrowLeft, RotateCcw, Flag, Bot, Trophy, Shield, Swords } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Card, TableCard, Suit, SUIT_SYMBOLS, SUIT_COLORS, DurakGameState } from './types';
import { 
  initializeGame, 
  canBeat, 
  canAddToAttack, 
  getValidDefenseCards,
  refillHands, 
  checkWinCondition,
  sortHand 
} from './gameLogic';
import {
  BotDifficulty,
  getBotDelay,
  getBotAttackCard,
  getBotDefenseCard,
  shouldBotPass,
  shouldBotTake
} from './DurakBotAI';
import PlayingCard from './PlayingCard';
import { cn } from '@/lib/utils';

interface DurakBotGameProps {
  difficulty: BotDifficulty;
  onBack: () => void;
}

const BOT_NAMES: Record<BotDifficulty, string> = {
  easy: '🤖 მარტივი ბოტი',
  medium: '🤖 საშუალო ბოტი', 
  hard: '🤖 რთული ბოტი',
};

const DurakBotGame = memo(function DurakBotGame({ difficulty, onBack }: DurakBotGameProps) {
  const { user, profile } = useAuth();
  const [game, setGame] = useState<{
    deck: Card[];
    trumpCard: Card | null;
    trumpSuit: Suit | null;
    playerHand: Card[];
    botHand: Card[];
    tableCards: TableCard[];
    discardPile: Card[];
    isPlayerAttacker: boolean;
    phase: 'attack' | 'defense' | 'finished';
    winner: 'player' | 'bot' | null;
  } | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [botThinking, setBotThinking] = useState(false);

  // Initialize game
  useEffect(() => {
    const playerId = user?.id || 'player';
    const botId = 'bot';
    const init = initializeGame(playerId, botId);
    
    // Randomly decide who attacks first
    const playerAttacksFirst = init.attackerId === playerId;
    
    setGame({
      deck: init.deck,
      trumpCard: init.trumpCard,
      trumpSuit: init.trumpSuit,
      playerHand: sortHand(init.player1Hand, init.trumpSuit),
      botHand: sortHand(init.player2Hand, init.trumpSuit),
      tableCards: [],
      discardPile: [],
      isPlayerAttacker: playerAttacksFirst,
      phase: 'attack',
      winner: null,
    });
  }, [user?.id]);

  // Bot move logic
  const botMove = useCallback(async () => {
    if (!game || game.phase === 'finished' || game.winner) return;
    
    setBotThinking(true);
    await new Promise(resolve => setTimeout(resolve, getBotDelay(difficulty)));
    
    setGame(prev => {
      if (!prev || prev.phase === 'finished') return prev;
      
      const isAttacking = !prev.isPlayerAttacker;
      
      if (isAttacking && prev.phase === 'attack') {
        // Bot is attacking
        if (prev.tableCards.length > 0 && prev.tableCards.every(tc => tc.defense !== null)) {
          // Check if should pass
          if (shouldBotPass(difficulty, prev.botHand, prev.tableCards, prev.trumpSuit as Suit, prev.deck.length)) {
            // Bito - discard and swap roles
            const allCards = prev.tableCards.flatMap(tc => [tc.attack, tc.defense].filter(Boolean) as Card[]);
            const { attackerHand, defenderHand, deck } = refillHands(prev.botHand, prev.playerHand, prev.deck);
            const { winner, loser } = checkWinCondition(defenderHand, attackerHand, deck);
            
            return {
              ...prev,
              tableCards: [],
              discardPile: [...prev.discardPile, ...allCards],
              botHand: attackerHand,
              playerHand: defenderHand,
              deck,
              isPlayerAttacker: true,
              phase: winner ? 'finished' : 'attack',
              winner: winner === 'player1' ? 'player' : winner === 'player2' ? 'bot' : null,
            };
          }
        }
        
        // Try to attack
        const attackCard = getBotAttackCard(
          difficulty, 
          prev.botHand, 
          prev.tableCards, 
          prev.trumpSuit as Suit,
          prev.deck.length,
          prev.playerHand.length
        );
        
        if (!attackCard) {
          // Can't attack - pass
          if (prev.tableCards.length > 0) {
            const allCards = prev.tableCards.flatMap(tc => [tc.attack, tc.defense].filter(Boolean) as Card[]);
            const { attackerHand, defenderHand, deck } = refillHands(prev.botHand, prev.playerHand, prev.deck);
            const { winner } = checkWinCondition(defenderHand, attackerHand, deck);
            
            return {
              ...prev,
              tableCards: [],
              discardPile: [...prev.discardPile, ...allCards],
              botHand: attackerHand,
              playerHand: defenderHand,
              deck,
              isPlayerAttacker: true,
              phase: winner ? 'finished' : 'attack',
              winner: winner === 'player1' ? 'player' : winner === 'player2' ? 'bot' : null,
            };
          }
          return prev;
        }
        
        // Play attack card
        return {
          ...prev,
          botHand: prev.botHand.filter(c => c.id !== attackCard.id),
          tableCards: [...prev.tableCards, { attack: attackCard, defense: null }],
          phase: 'defense',
        };
      } else if (!isAttacking && prev.phase === 'defense') {
        // Bot is defending
        const undefended = prev.tableCards.find(tc => !tc.defense);
        if (!undefended) return prev;
        
        // Check if should take
        if (shouldBotTake(difficulty, prev.botHand, undefended.attack, prev.trumpSuit as Suit, prev.tableCards, prev.deck.length)) {
          // Take all cards
          const allCards = prev.tableCards.flatMap(tc => [tc.attack, tc.defense].filter(Boolean) as Card[]);
          const newBotHand = [...prev.botHand, ...allCards];
          const { attackerHand, deck } = refillHands(prev.playerHand, [], prev.deck);
          
          return {
            ...prev,
            tableCards: [],
            botHand: newBotHand,
            playerHand: attackerHand,
            deck,
            phase: 'attack',
          };
        }
        
        // Try to defend
        const defenseCard = getBotDefenseCard(
          difficulty,
          prev.botHand,
          undefended.attack,
          prev.trumpSuit as Suit,
          prev.deck.length,
          prev.tableCards
        );
        
        if (!defenseCard) {
          // Must take
          const allCards = prev.tableCards.flatMap(tc => [tc.attack, tc.defense].filter(Boolean) as Card[]);
          const newBotHand = [...prev.botHand, ...allCards];
          const { attackerHand, deck } = refillHands(prev.playerHand, [], prev.deck);
          
          return {
            ...prev,
            tableCards: [],
            botHand: newBotHand,
            playerHand: attackerHand,
            deck,
            phase: 'attack',
          };
        }
        
        // Play defense card
        const newTableCards = prev.tableCards.map(tc => 
          tc === undefended ? { ...tc, defense: defenseCard } : tc
        );
        const allDefended = newTableCards.every(tc => tc.defense !== null);
        
        return {
          ...prev,
          botHand: prev.botHand.filter(c => c.id !== defenseCard.id),
          tableCards: newTableCards,
          phase: allDefended ? 'attack' : 'defense',
        };
      }
      
      return prev;
    });
    
    setBotThinking(false);
  }, [game, difficulty]);

  // Trigger bot move when it's bot's turn
  useEffect(() => {
    if (!game || game.phase === 'finished' || botThinking) return;
    
    const isBotTurn = (!game.isPlayerAttacker && game.phase === 'attack') || 
                      (game.isPlayerAttacker && game.phase === 'defense');
    
    if (isBotTurn) {
      botMove();
    }
  }, [game, botThinking, botMove]);

  // Player attack
  const playerAttack = useCallback((card: Card) => {
    if (!game || !game.isPlayerAttacker || game.phase !== 'attack') return;
    
    if (game.tableCards.length > 0 && !canAddToAttack(card, game.tableCards)) {
      return;
    }
    
    // Max attacks
    if (game.tableCards.length >= 6 || game.tableCards.length >= game.botHand.length) {
      return;
    }
    
    setGame(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        playerHand: prev.playerHand.filter(c => c.id !== card.id),
        tableCards: [...prev.tableCards, { attack: card, defense: null }],
        phase: 'defense',
      };
    });
    setSelectedCard(null);
  }, [game]);

  // Player defense
  const playerDefend = useCallback((defenseCard: Card, attackIndex: number) => {
    if (!game || game.isPlayerAttacker || game.phase !== 'defense') return;
    
    const attackCard = game.tableCards[attackIndex]?.attack;
    if (!attackCard || game.tableCards[attackIndex]?.defense) return;
    
    if (!canBeat(attackCard, defenseCard, game.trumpSuit as Suit)) {
      return;
    }
    
    setGame(prev => {
      if (!prev) return prev;
      
      const newTableCards = prev.tableCards.map((tc, i) => 
        i === attackIndex ? { ...tc, defense: defenseCard } : tc
      );
      const allDefended = newTableCards.every(tc => tc.defense !== null);
      
      return {
        ...prev,
        playerHand: prev.playerHand.filter(c => c.id !== defenseCard.id),
        tableCards: newTableCards,
        phase: allDefended ? 'attack' : 'defense',
      };
    });
    setSelectedCard(null);
  }, [game]);

  // Player pass (bito)
  const playerPass = useCallback(() => {
    if (!game || !game.isPlayerAttacker || game.phase !== 'attack') return;
    if (game.tableCards.length === 0 || !game.tableCards.every(tc => tc.defense)) return;
    
    setGame(prev => {
      if (!prev) return prev;
      
      const allCards = prev.tableCards.flatMap(tc => [tc.attack, tc.defense].filter(Boolean) as Card[]);
      const { attackerHand, defenderHand, deck } = refillHands(prev.playerHand, prev.botHand, prev.deck);
      const { winner } = checkWinCondition(attackerHand, defenderHand, deck);
      
      return {
        ...prev,
        tableCards: [],
        discardPile: [...prev.discardPile, ...allCards],
        playerHand: attackerHand,
        botHand: defenderHand,
        deck,
        isPlayerAttacker: false,
        phase: winner ? 'finished' : 'attack',
        winner: winner === 'player1' ? 'player' : winner === 'player2' ? 'bot' : null,
      };
    });
  }, [game]);

  // Player take
  const playerTake = useCallback(() => {
    if (!game || game.isPlayerAttacker || game.tableCards.length === 0) return;
    
    setGame(prev => {
      if (!prev) return prev;
      
      const allCards = prev.tableCards.flatMap(tc => [tc.attack, tc.defense].filter(Boolean) as Card[]);
      const newPlayerHand = [...prev.playerHand, ...allCards];
      const { attackerHand, deck } = refillHands(prev.botHand, [], prev.deck);
      
      return {
        ...prev,
        tableCards: [],
        playerHand: newPlayerHand,
        botHand: attackerHand,
        deck,
        phase: 'attack',
      };
    });
  }, [game]);

  // Handle card click
  const handleCardClick = useCallback((card: Card) => {
    if (!game) return;
    
    const isPlayerTurn = (game.isPlayerAttacker && game.phase === 'attack') ||
                         (!game.isPlayerAttacker && game.phase === 'defense');
    
    if (!isPlayerTurn) return;
    
    if (game.isPlayerAttacker && game.phase === 'attack') {
      if (selectedCard?.id === card.id) {
        playerAttack(card);
      } else {
        setSelectedCard(card);
      }
    } else if (!game.isPlayerAttacker && game.phase === 'defense') {
      // Check if this card can beat any undefended attack card
      const undefended = game.tableCards
        .map((tc, idx) => ({ tc, idx }))
        .filter(({ tc }) => !tc.defense);
      
      if (undefended.length > 0 && game.trumpSuit) {
        // Find which attack cards this defense card can beat
        const canBeatCards = undefended.filter(({ tc }) => 
          canBeat(tc.attack, card, game.trumpSuit as Suit)
        );
        
        if (canBeatCards.length === 1) {
          // Auto-beat if only one card can be beaten
          playerDefend(card, canBeatCards[0].idx);
          return;
        } else if (canBeatCards.length > 1) {
          // Multiple options - select the card and let user choose which to beat
          setSelectedCard(card);
        } else {
          // Can't beat any card with this one
          setSelectedCard(card);
        }
      } else {
        setSelectedCard(card);
      }
    }
  }, [game, selectedCard, playerAttack, playerDefend]);

  // Handle table card click (for defense)
  const handleTableCardClick = useCallback((index: number) => {
    if (!game || game.isPlayerAttacker || game.phase !== 'defense' || !selectedCard) return;
    if (game.tableCards[index]?.defense) return;
    
    // Verify the selected card can beat this attack
    const attackCard = game.tableCards[index]?.attack;
    if (!attackCard || !game.trumpSuit) return;
    
    if (canBeat(attackCard, selectedCard, game.trumpSuit as Suit)) {
      playerDefend(selectedCard, index);
    }
  }, [game, selectedCard, playerDefend]);

  if (!game) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isPlayerTurn = (game.isPlayerAttacker && game.phase === 'attack') ||
                       (!game.isPlayerAttacker && game.phase === 'defense');
  const sortedHand = sortHand(game.playerHand, game.trumpSuit as Suit);
  
  // Calculate if player can defend any undefended card
  const undefendedCards = game.tableCards.filter(tc => !tc.defense);
  const isDefending = !game.isPlayerAttacker && game.phase === 'defense';
  
  const canDefendAnyCard = isDefending && game.trumpSuit && undefendedCards.some(tc => 
    getValidDefenseCards(game.playerHand, tc.attack, game.trumpSuit as Suit).length > 0
  );
  
  // Get valid defense cards for highlighting
  const validDefenseCardIds = new Set<string>();
  if (isDefending && game.trumpSuit) {
    undefendedCards.forEach(tc => {
      const validCards = getValidDefenseCards(game.playerHand, tc.attack, game.trumpSuit as Suit);
      validCards.forEach(c => validDefenseCardIds.add(c.id));
    });
  }
  
  // Check if selected card can beat a specific attack card
  const canSelectedCardBeat = (attackCard: Card) => {
    if (!selectedCard || !game.trumpSuit) return false;
    return canBeat(attackCard, selectedCard, game.trumpSuit as Suit);
  };

  return (
    <div className="flex flex-col h-full min-h-[600px] gap-2 p-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          გასვლა
        </Button>
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4" />
          <span className="text-sm font-medium">{BOT_NAMES[difficulty]}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className={cn(
            'px-2 py-1 rounded',
            isPlayerTurn ? 'bg-green-500/20 text-green-500' : 'bg-muted text-muted-foreground'
          )}>
            {isPlayerTurn 
              ? (game.isPlayerAttacker ? 'შეტევა' : 'დაცვა') 
              : 'ბოტის სვლა'}
          </span>
        </div>
      </div>

      {/* Game finished overlay */}
      {game.phase === 'finished' && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-xl text-center">
            <Trophy className={cn(
              "w-16 h-16 mx-auto mb-4",
              game.winner === 'player' ? 'text-yellow-500' : 'text-muted-foreground'
            )} />
            <h2 className="text-2xl font-bold mb-2">
              {game.winner === 'player' ? '🎉 გაიმარჯვე!' : '😢 დამარცხდი'}
            </h2>
            <p className="text-muted-foreground mb-4">
              {game.winner === 'player' 
                ? 'შენ დაამარცხე ბოტი!' 
                : 'ბოტმა გაგიმარჯვა. სცადე თავიდან!'}
            </p>
            <Button onClick={onBack}>ლობიში დაბრუნება</Button>
          </div>
        </div>
      )}

      {/* Bot area */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-xs text-muted-foreground">{BOT_NAMES[difficulty]}</span>
        <div className="flex gap-1 justify-center">
          {Array.from({ length: game.botHand.length }).map((_, i) => (
            <PlayingCard key={i} card={{ suit: 'hearts', rank: '6', id: `back-${i}` }} faceDown small />
          ))}
        </div>
        {botThinking && <span className="text-xs text-yellow-500 animate-pulse">ფიქრობს...</span>}
      </div>

      {/* Game table */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-green-900/20 rounded-xl p-4 min-h-[200px] relative">
        {/* Trump and deck */}
        <div className="flex items-center gap-4 absolute top-4 left-4">
          {game.deck.length > 0 && (
            <div className="relative">
              <PlayingCard card={{ suit: 'spades', rank: 'A', id: 'deck' }} faceDown small />
              <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-xs text-muted-foreground">
                {game.deck.length}
              </span>
            </div>
          )}
          {game.trumpCard && (
            <div className="rotate-90 origin-center">
              <PlayingCard card={game.trumpCard} small disabled />
            </div>
          )}
          {game.trumpSuit && (
            <span className="text-xs text-muted-foreground">
              ტრამპი: {SUIT_SYMBOLS[game.trumpSuit]}
            </span>
          )}
        </div>

        {/* Table cards */}
        <div className="flex flex-wrap justify-center gap-2 max-w-lg mt-12">
          {game.tableCards.map((tc, index) => {
            const canBeatThis = !tc.defense && canSelectedCardBeat(tc.attack);
            return (
              <div 
                key={index} 
                className={cn(
                  'relative transition-all',
                  isDefending && !tc.defense && selectedCard && 'cursor-pointer hover:scale-105',
                  canBeatThis && 'ring-2 ring-green-500 rounded-lg'
                )}
                onClick={() => handleTableCardClick(index)}
              >
                <PlayingCard card={tc.attack} disabled />
                {tc.defense && (
                  <div className="absolute top-4 left-4">
                    <PlayingCard card={tc.defense} disabled />
                  </div>
                )}
                {/* Show beat indicator when selected card can beat this */}
                {canBeatThis && (
                  <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-1 z-10">
                    <Shield className="w-3 h-3" />
                  </div>
                )}
                {/* Show dashed border for potential defense spot */}
                {isDefending && !tc.defense && selectedCard && !canBeatThis && (
                  <div className="absolute inset-0 border-2 border-dashed border-destructive/50 rounded-lg" />
                )}
              </div>
            );
          })}
          {game.tableCards.length === 0 && (
            <div className="text-muted-foreground text-sm">
              {game.isPlayerAttacker ? 'დადეთ კარტი შესატევად' : 'დაელოდეთ შეტევას'}
            </div>
          )}
        </div>

        {/* Action buttons and defense indicator */}
        <div className="flex flex-col items-center gap-2">
          {/* Defense status indicator */}
          {isDefending && undefendedCards.length > 0 && (
            <div className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg border',
              canDefendAnyCard 
                ? 'bg-green-500/20 border-green-500/50 text-green-400' 
                : 'bg-destructive/20 border-destructive/50 text-destructive'
            )}>
              {canDefendAnyCard ? (
                <>
                  <Shield className="w-4 h-4" />
                  <span className="text-sm font-medium">შეგიძლია გაჭრა! ({validDefenseCardIds.size} კარტი)</span>
                </>
              ) : (
                <>
                  <Swords className="w-4 h-4" />
                  <span className="text-sm font-medium">ვერ გაჭრი - აიღე კარტები</span>
                </>
              )}
            </div>
          )}
          
          {/* Action buttons */}
          <div className="flex gap-2">
            {game.isPlayerAttacker && game.phase === 'attack' && game.tableCards.length > 0 && 
             game.tableCards.every(tc => tc.defense) && (
              <Button onClick={playerPass} variant="secondary" size="sm">
                <Flag className="w-4 h-4 mr-1" />
                ბიტო
              </Button>
            )}
            {isDefending && game.tableCards.length > 0 && (
              <Button 
                onClick={playerTake} 
                variant={canDefendAnyCard ? "outline" : "destructive"} 
                size="sm"
                className={canDefendAnyCard ? "opacity-70" : ""}
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                აღება
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Player hand */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-xs text-muted-foreground">{profile?.username || 'შენ'}</span>
        <div className="flex gap-1 justify-center flex-wrap">
          {sortedHand.map((card) => {
            const isValidDefenseCard = validDefenseCardIds.has(card.id);
            return (
              <div key={card.id} className="relative">
                <PlayingCard 
                  card={card} 
                  selected={selectedCard?.id === card.id}
                  onClick={() => handleCardClick(card)}
                  disabled={!isPlayerTurn}
                  className={cn(
                    isDefending && isValidDefenseCard && 'ring-2 ring-green-500'
                  )}
                />
                {isDefending && isValidDefenseCard && !selectedCard && (
                  <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full p-0.5">
                    <Shield className="w-2 h-2" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {isPlayerTurn && (
          <span className={cn(
            "text-xs",
            game.isPlayerAttacker ? "text-primary" : (canDefendAnyCard ? "text-green-500" : "text-destructive")
          )}>
            {game.isPlayerAttacker 
              ? 'შეგიძლია შეუტიო' 
              : (canDefendAnyCard 
                  ? '🛡️ აირჩიე მწვანე კარტი გასაჭრელად' 
                  : '❌ ვერ გაჭრი - აიღე კარტები')}
          </span>
        )}
      </div>
    </div>
  );
});

export default DurakBotGame;
