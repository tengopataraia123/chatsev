// Joker game logic utilities

import { 
  Card, Suit, Rank, PlayedCard, PlayerBid, 
  RoundScore, ScoreboardEntry, RANK_VALUES,
  getCardsForRound, getRoundsInSet
} from './types';

// Create a 36-card deck with 2 jokers (replacing black 6s)
export function createDeck(): Card[] {
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks: Rank[] = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const deck: Card[] = [];
  
  for (const suit of suits) {
    for (const rank of ranks) {
      // Skip black 6s (clubs and spades) - they're replaced by jokers
      if (rank === '6' && (suit === 'clubs' || suit === 'spades')) {
        continue;
      }
      deck.push({
        suit,
        rank,
        id: `${suit}-${rank}-${Math.random().toString(36).substring(7)}`
      });
    }
  }
  
  // Add two jokers
  deck.push({
    suit: 'joker',
    rank: 'joker',
    id: `joker-red-${Math.random().toString(36).substring(7)}`,
    isJoker: true,
    jokerType: 'red'
  });
  
  deck.push({
    suit: 'joker',
    rank: 'joker',
    id: `joker-black-${Math.random().toString(36).substring(7)}`,
    isJoker: true,
    jokerType: 'black'
  });
  
  return deck;
}

// Fisher-Yates shuffle
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Deal cards to players
export function dealCards(
  deck: Card[], 
  cardsPerPlayer: number
): { 
  hands: Card[][]; 
  remainingDeck: Card[];
  trumpCard: Card | null;
} {
  let newDeck = [...deck];
  const hands: Card[][] = [[], [], [], []];
  
  // Deal cards to each player
  for (let i = 0; i < cardsPerPlayer; i++) {
    for (let p = 0; p < 4; p++) {
      if (newDeck.length > 0) {
        hands[p].push(newDeck.shift()!);
      }
    }
  }
  
  // Reveal trump card (next card after dealing)
  let trumpCard: Card | null = null;
  if (newDeck.length > 0) {
    trumpCard = newDeck[0]; // Don't remove, just reveal
  }
  
  return { hands, remainingDeck: newDeck, trumpCard };
}

// Get trump suit from trump card
export function getTrumpSuit(trumpCard: Card | null): Suit | null {
  if (!trumpCard || trumpCard.isJoker) {
    return null; // No trump if joker is revealed
  }
  return trumpCard.suit as Suit;
}

// Initialize a new game
export function initializeGame(
  player1Id: string, 
  player2Id: string,
  player3Id: string,
  player4Id: string
): {
  deck: Card[];
  trumpCard: Card | null;
  trumpSuit: Suit | null;
  player1Hand: Card[];
  player2Hand: Card[];
  player3Hand: Card[];
  player4Hand: Card[];
  dealerId: string;
  firstPlayerId: string;
} {
  // Create and shuffle deck
  let deck = shuffleDeck(createDeck());
  
  // First round has 1 card per player
  const { hands, remainingDeck, trumpCard } = dealCards(deck, 1);
  deck = remainingDeck;
  
  const trumpSuit = getTrumpSuit(trumpCard);
  
  // Randomly select dealer for first game
  const players = [player1Id, player2Id, player3Id, player4Id];
  const dealerIndex = Math.floor(Math.random() * 4);
  const dealerId = players[dealerIndex];
  
  // First player is to the left of dealer (clockwise)
  const firstPlayerId = players[(dealerIndex + 1) % 4];
  
  return {
    deck,
    trumpCard,
    trumpSuit,
    player1Hand: sortHand(hands[0], trumpSuit),
    player2Hand: sortHand(hands[1], trumpSuit),
    player3Hand: sortHand(hands[2], trumpSuit),
    player4Hand: sortHand(hands[3], trumpSuit),
    dealerId,
    firstPlayerId,
  };
}

// Sort hand by suit and rank
export function sortHand(hand: Card[], trumpSuit: Suit | null): Card[] {
  return [...hand].sort((a, b) => {
    // Jokers go to the end
    if (a.isJoker && !b.isJoker) return 1;
    if (!a.isJoker && b.isJoker) return -1;
    if (a.isJoker && b.isJoker) return 0;
    
    // Trumps go after jokers but before other suits
    if (a.suit === trumpSuit && b.suit !== trumpSuit) return 1;
    if (b.suit === trumpSuit && a.suit !== trumpSuit) return -1;
    
    // Same suit - sort by rank (high to low)
    if (a.suit === b.suit) {
      return RANK_VALUES[b.rank as Rank] - RANK_VALUES[a.rank as Rank];
    }
    
    // Different suits - sort by suit order
    const suitOrder: Suit[] = ['spades', 'clubs', 'diamonds', 'hearts'];
    return suitOrder.indexOf(a.suit as Suit) - suitOrder.indexOf(b.suit as Suit);
  });
}

// Validate bid (sum can't equal cards per round when it's dealer's turn)
export function isValidBid(
  bid: number,
  cardsPerRound: number,
  existingBids: number[],
  isDealer: boolean
): boolean {
  if (bid < 0 || bid > cardsPerRound) return false;
  
  if (isDealer) {
    const sumWithNewBid = existingBids.reduce((a, b) => a + b, 0) + bid;
    return sumWithNewBid !== cardsPerRound;
  }
  
  return true;
}

// Get forbidden bid for dealer (the one that makes sum equal to cards)
export function getForbiddenBidForDealer(
  cardsPerRound: number,
  existingBids: number[]
): number {
  const currentSum = existingBids.reduce((a, b) => a + b, 0);
  return cardsPerRound - currentSum;
}

// Check if a card can be played
export function canPlayCard(
  card: Card,
  hand: Card[],
  leadSuit: Suit | null,
  trumpSuit: Suit | null,
  trickCards: PlayedCard[]
): boolean {
  // Joker can always be played
  if (card.isJoker) return true;
  
  // If leading, any card can be played
  if (!leadSuit || trickCards.length === 0) return true;
  
  // Check if there's a high joker leading
  const leadingCard = trickCards[0];
  if (leadingCard.card.isJoker && leadingCard.jokerMode === 'high') {
    // Must play highest card of declared suit, or another joker
    const declaredSuit = leadingCard.declaredSuit;
    const cardsOfSuit = hand.filter(c => c.suit === declaredSuit && !c.isJoker);
    
    if (cardsOfSuit.length > 0) {
      // Must play highest card of that suit
      const highestCard = cardsOfSuit.reduce((max, c) => 
        RANK_VALUES[c.rank as Rank] > RANK_VALUES[max.rank as Rank] ? c : max
      );
      return card.id === highestCard.id || card.isJoker;
    }
    
    // No cards of that suit - can play any card
    return true;
  }
  
  // Check if there's a low joker leading
  if (leadingCard.card.isJoker && leadingCard.jokerMode === 'low') {
    const declaredSuit = leadingCard.declaredSuit;
    const hasMatchingSuit = hand.some(c => c.suit === declaredSuit && !c.isJoker);
    
    if (hasMatchingSuit) {
      // Must play any card of that suit
      return card.suit === declaredSuit || card.isJoker;
    }
    
    // No cards of that suit - must play trump if available
    const hasTrump = hand.some(c => c.suit === trumpSuit && !c.isJoker);
    if (hasTrump && trumpSuit) {
      return card.suit === trumpSuit || card.isJoker;
    }
    
    // No trump - can play any card
    return true;
  }
  
  // Normal card leading - must follow suit if possible
  const hasMatchingSuit = hand.some(c => c.suit === leadSuit && !c.isJoker);
  
  if (hasMatchingSuit) {
    // Must follow suit
    return card.suit === leadSuit || card.isJoker;
  }
  
  // No matching suit - must play trump if available
  const hasTrump = hand.some(c => c.suit === trumpSuit && !c.isJoker);
  if (hasTrump && trumpSuit) {
    return card.suit === trumpSuit || card.isJoker;
  }
  
  // No trump either - can play any card
  return true;
}

// Determine trick winner
export function determineTrickWinner(
  trickCards: PlayedCard[],
  trumpSuit: Suit | null
): string {
  if (trickCards.length === 0) return '';
  
  let winningCard = trickCards[0];
  let leadSuit = winningCard.card.isJoker 
    ? winningCard.declaredSuit 
    : winningCard.card.suit as Suit;
  
  // Track high jokers in trick
  const highJokers = trickCards.filter(pc => 
    pc.card.isJoker && pc.jokerMode === 'high'
  );
  
  // If there are multiple high jokers, the last one wins (unless trump played)
  if (highJokers.length >= 2) {
    // Check if anyone played trump when joker declared non-trump suit
    const lastHighJoker = highJokers[highJokers.length - 1];
    if (lastHighJoker.declaredSuit !== trumpSuit) {
      const trumpCards = trickCards.filter(pc => 
        !pc.card.isJoker && pc.card.suit === trumpSuit
      );
      if (trumpCards.length > 0) {
        // Highest trump wins
        winningCard = trumpCards.reduce((max, pc) =>
          RANK_VALUES[pc.card.rank as Rank] > RANK_VALUES[max.card.rank as Rank] ? pc : max
        );
        return winningCard.playerId;
      }
    }
    return lastHighJoker.playerId;
  }
  
  // Single high joker
  if (highJokers.length === 1) {
    const highJoker = highJokers[0];
    // Check if declared suit is not trump and someone played trump
    if (highJoker.declaredSuit !== trumpSuit && trumpSuit) {
      const trumpCards = trickCards.filter(pc =>
        !pc.card.isJoker && pc.card.suit === trumpSuit
      );
      if (trumpCards.length > 0) {
        winningCard = trumpCards.reduce((max, pc) =>
          RANK_VALUES[pc.card.rank as Rank] > RANK_VALUES[max.card.rank as Rank] ? pc : max
        );
        return winningCard.playerId;
      }
    }
    return highJoker.playerId;
  }
  
  // Check for low jokers (they always lose except when nothing else)
  const nonLowJokerCards = trickCards.filter(pc =>
    !(pc.card.isJoker && pc.jokerMode === 'low')
  );
  
  if (nonLowJokerCards.length === 0) {
    // All cards are low jokers - last one wins
    return trickCards[trickCards.length - 1].playerId;
  }
  
  // No high jokers - standard logic
  // First check for trump cards
  const trumpCards = nonLowJokerCards.filter(pc =>
    !pc.card.isJoker && pc.card.suit === trumpSuit
  );
  
  if (trumpCards.length > 0) {
    // Highest trump wins
    winningCard = trumpCards.reduce((max, pc) =>
      RANK_VALUES[pc.card.rank as Rank] > RANK_VALUES[max.card.rank as Rank] ? pc : max
    );
    return winningCard.playerId;
  }
  
  // No trumps - highest card of lead suit wins
  const leadSuitCards = nonLowJokerCards.filter(pc =>
    !pc.card.isJoker && pc.card.suit === leadSuit
  );
  
  if (leadSuitCards.length > 0) {
    winningCard = leadSuitCards.reduce((max, pc) =>
      RANK_VALUES[pc.card.rank as Rank] > RANK_VALUES[max.card.rank as Rank] ? pc : max
    );
    return winningCard.playerId;
  }
  
  // Fallback - first card wins
  return trickCards[0].playerId;
}

// Calculate score for a round
export function calculateRoundScore(
  playerId: string,
  bid: number,
  tricksWon: number,
  cardsPerRound: number,
  previousScore: number
): number {
  // If bid all tricks and won all
  if (bid === cardsPerRound && tricksWon === cardsPerRound && bid > 0) {
    return 100 * tricksWon;
  }
  
  // If exact bid
  if (bid === tricksWon) {
    return (50 * tricksWon) + 50;
  }
  
  // Wrong bid
  return 10 * tricksWon;
}

// Check if all bids in a set were successful for a player
export function checkSetBonus(
  scoreboard: ScoreboardEntry[],
  playerId: string,
  setNumber: number
): { hasBonus: boolean; bonusAmount: number } {
  const setScores = scoreboard.filter(entry => entry.set === setNumber);
  
  if (setScores.length === 0) {
    return { hasBonus: false, bonusAmount: 0 };
  }
  
  let allSuccessful = true;
  let maxScore = 0;
  
  for (const entry of setScores) {
    const playerScore = entry.scores.find(s => s.playerId === playerId);
    if (!playerScore) continue;
    
    // Check if bid was successful
    if (playerScore.bid !== playerScore.tricksWon) {
      allSuccessful = false;
      break;
    }
    
    maxScore = Math.max(maxScore, playerScore.points);
  }
  
  return {
    hasBonus: allSuccessful,
    bonusAmount: allSuccessful ? maxScore : 0
  };
}

// Get next player in clockwise order
export function getNextPlayer(
  currentPlayerId: string,
  players: string[]
): string {
  const currentIndex = players.indexOf(currentPlayerId);
  return players[(currentIndex + 1) % 4];
}

// Get next dealer (rotates clockwise)
export function getNextDealer(
  currentDealerId: string,
  players: string[]
): string {
  return getNextPlayer(currentDealerId, players);
}

// Calculate global round number from set and round within set
export function getGlobalRoundNumber(set: number, roundInSet: number): number {
  let total = 0;
  for (let s = 1; s < set; s++) {
    total += getRoundsInSet(s);
  }
  return total + roundInSet;
}

// Check if game is finished
export function isGameFinished(set: number, roundInSet: number): boolean {
  if (set > 4) return true;
  if (set === 4 && roundInSet > 4) return true;
  return false;
}

// Determine winner based on final scores
export function determineWinner(
  playerScores: Record<string, number>
): string | null {
  let maxScore = -Infinity;
  let winnerId: string | null = null;
  
  for (const [playerId, score] of Object.entries(playerScores)) {
    if (score > maxScore) {
      maxScore = score;
      winnerId = playerId;
    }
  }
  
  return winnerId;
}
