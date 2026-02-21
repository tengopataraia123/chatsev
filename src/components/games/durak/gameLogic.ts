// Durak game logic utilities

import { Card, Suit, Rank, TableCard, RANK_VALUES } from './types';

// Create a standard 36-card deck
export function createDeck(): Card[] {
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks: Rank[] = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const deck: Card[] = [];
  
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({
        suit,
        rank,
        id: `${suit}-${rank}-${Math.random().toString(36).substring(7)}`
      });
    }
  }
  
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
export function dealCards(deck: Card[], count: number): { cards: Card[]; remainingDeck: Card[] } {
  const cards = deck.slice(0, count);
  const remainingDeck = deck.slice(count);
  return { cards, remainingDeck };
}

// Initialize a new game
export function initializeGame(player1Id: string, player2Id: string): {
  deck: Card[];
  trumpCard: Card;
  trumpSuit: Suit;
  player1Hand: Card[];
  player2Hand: Card[];
  attackerId: string;
  defenderId: string;
} {
  // Create and shuffle deck
  let deck = shuffleDeck(createDeck());
  
  // Deal 6 cards to each player
  const { cards: player1Hand, remainingDeck: deck1 } = dealCards(deck, 6);
  const { cards: player2Hand, remainingDeck: deck2 } = dealCards(deck1, 6);
  deck = deck2;
  
  // Trump card is the bottom card of the deck (last card dealt from talon)
  const trumpCard = deck[deck.length - 1];
  const trumpSuit = trumpCard.suit;
  
  // Find who has the lowest trump to determine first attacker
  const player1LowestTrump = findLowestTrump(player1Hand, trumpSuit);
  const player2LowestTrump = findLowestTrump(player2Hand, trumpSuit);
  
  let attackerId: string;
  let defenderId: string;
  
  if (!player1LowestTrump && !player2LowestTrump) {
    // No trumps - random first attacker
    attackerId = Math.random() > 0.5 ? player1Id : player2Id;
  } else if (!player1LowestTrump) {
    attackerId = player2Id;
  } else if (!player2LowestTrump) {
    attackerId = player1Id;
  } else {
    // Both have trumps - lowest trump attacks first
    attackerId = RANK_VALUES[player1LowestTrump.rank] <= RANK_VALUES[player2LowestTrump.rank] 
      ? player1Id 
      : player2Id;
  }
  
  defenderId = attackerId === player1Id ? player2Id : player1Id;
  
  return {
    deck,
    trumpCard,
    trumpSuit,
    player1Hand,
    player2Hand,
    attackerId,
    defenderId,
  };
}

// Find the lowest trump card in a hand
export function findLowestTrump(hand: Card[], trumpSuit: Suit): Card | null {
  const trumps = hand.filter(card => card.suit === trumpSuit);
  if (trumps.length === 0) return null;
  
  return trumps.reduce((lowest, card) => 
    RANK_VALUES[card.rank] < RANK_VALUES[lowest.rank] ? card : lowest
  );
}

// Check if a card can beat another card
export function canBeat(attackCard: Card, defenseCard: Card, trumpSuit: Suit): boolean {
  // Same suit - defense must be higher rank
  if (attackCard.suit === defenseCard.suit) {
    return RANK_VALUES[defenseCard.rank] > RANK_VALUES[attackCard.rank];
  }
  
  // Defense is trump and attack is not - defense wins
  if (defenseCard.suit === trumpSuit && attackCard.suit !== trumpSuit) {
    return true;
  }
  
  // Attack is trump and defense is not - defense loses
  if (attackCard.suit === trumpSuit && defenseCard.suit !== trumpSuit) {
    return false;
  }
  
  // Different non-trump suits - cannot beat
  return false;
}

// Check if a card can be added to the attack
export function canAddToAttack(card: Card, tableCards: TableCard[]): boolean {
  if (tableCards.length === 0) return true; // First attack card
  
  // Card rank must match any rank on the table
  const ranksOnTable = new Set<Rank>();
  for (const tc of tableCards) {
    ranksOnTable.add(tc.attack.rank);
    if (tc.defense) {
      ranksOnTable.add(tc.defense.rank);
    }
  }
  
  return ranksOnTable.has(card.rank);
}

// Get valid attack cards from hand
export function getValidAttackCards(hand: Card[], tableCards: TableCard[]): Card[] {
  return hand.filter(card => canAddToAttack(card, tableCards));
}

// Get valid defense cards from hand for a specific attack card
export function getValidDefenseCards(hand: Card[], attackCard: Card, trumpSuit: Suit): Card[] {
  return hand.filter(card => canBeat(attackCard, card, trumpSuit));
}

// Refill hands from deck (attacker first, then defender)
export function refillHands(
  attackerHand: Card[],
  defenderHand: Card[],
  deck: Card[]
): { attackerHand: Card[]; defenderHand: Card[]; deck: Card[] } {
  let newDeck = [...deck];
  let newAttackerHand = [...attackerHand];
  let newDefenderHand = [...defenderHand];
  
  // Attacker refills first
  while (newAttackerHand.length < 6 && newDeck.length > 0) {
    newAttackerHand.push(newDeck.shift()!);
  }
  
  // Then defender
  while (newDefenderHand.length < 6 && newDeck.length > 0) {
    newDefenderHand.push(newDeck.shift()!);
  }
  
  return { attackerHand: newAttackerHand, defenderHand: newDefenderHand, deck: newDeck };
}

// Check win condition
export function checkWinCondition(
  player1Hand: Card[],
  player2Hand: Card[],
  deck: Card[]
): { winner: 'player1' | 'player2' | null; loser: 'player1' | 'player2' | null } {
  // Game only ends when deck is empty
  if (deck.length > 0) {
    return { winner: null, loser: null };
  }
  
  // First player to empty their hand wins
  if (player1Hand.length === 0) {
    return { winner: 'player1', loser: 'player2' };
  }
  if (player2Hand.length === 0) {
    return { winner: 'player2', loser: 'player1' };
  }
  
  return { winner: null, loser: null };
}

// Sort hand by suit and rank
export function sortHand(hand: Card[], trumpSuit: Suit): Card[] {
  return [...hand].sort((a, b) => {
    // Trumps go to the end
    if (a.suit === trumpSuit && b.suit !== trumpSuit) return 1;
    if (b.suit === trumpSuit && a.suit !== trumpSuit) return -1;
    
    // Same suit - sort by rank
    if (a.suit === b.suit) {
      return RANK_VALUES[a.rank] - RANK_VALUES[b.rank];
    }
    
    // Different suits - sort by suit order
    const suitOrder: Suit[] = ['spades', 'clubs', 'diamonds', 'hearts'];
    return suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit);
  });
}
