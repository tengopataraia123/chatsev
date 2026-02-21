// Durak Bot AI with multiple difficulty levels

import { Card, Suit, TableCard, RANK_VALUES } from './types';
import { canBeat, canAddToAttack, getValidDefenseCards } from './gameLogic';

export type BotDifficulty = 'easy' | 'medium' | 'hard';

// Bot decision delay based on difficulty (in ms)
export const BOT_DELAYS: Record<BotDifficulty, { min: number; max: number }> = {
  easy: { min: 1500, max: 3000 },
  medium: { min: 1000, max: 2000 },
  hard: { min: 500, max: 1200 },
};

// Get random delay for bot move
export function getBotDelay(difficulty: BotDifficulty): number {
  const { min, max } = BOT_DELAYS[difficulty];
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Sort cards by value (lower first for easy, higher first for hard)
function sortByValue(cards: Card[], ascending: boolean = true): Card[] {
  return [...cards].sort((a, b) => {
    const diff = RANK_VALUES[a.rank] - RANK_VALUES[b.rank];
    return ascending ? diff : -diff;
  });
}

// Get trump cards from hand
function getTrumps(hand: Card[], trumpSuit: Suit): Card[] {
  return hand.filter(c => c.suit === trumpSuit);
}

// Get non-trump cards from hand
function getNonTrumps(hand: Card[], trumpSuit: Suit): Card[] {
  return hand.filter(c => c.suit !== trumpSuit);
}

// EASY BOT: Plays randomly, doesn't think strategically
function easyBotAttack(hand: Card[], tableCards: TableCard[], trumpSuit: Suit): Card | null {
  const validCards = hand.filter(c => canAddToAttack(c, tableCards));
  if (validCards.length === 0) return null;
  
  // Random card selection
  return validCards[Math.floor(Math.random() * validCards.length)];
}

function easyBotDefend(hand: Card[], attackCard: Card, trumpSuit: Suit): Card | null {
  const validCards = getValidDefenseCards(hand, attackCard, trumpSuit);
  if (validCards.length === 0) return null;
  
  // Random card selection
  return validCards[Math.floor(Math.random() * validCards.length)];
}

// MEDIUM BOT: Uses basic strategy, tries to save trumps
function mediumBotAttack(hand: Card[], tableCards: TableCard[], trumpSuit: Suit): Card | null {
  const validCards = hand.filter(c => canAddToAttack(c, tableCards));
  if (validCards.length === 0) return null;
  
  // Prefer non-trump cards, lower values first
  const nonTrumps = getNonTrumps(validCards, trumpSuit);
  if (nonTrumps.length > 0) {
    return sortByValue(nonTrumps, true)[0];
  }
  
  // If only trumps, play lowest
  return sortByValue(validCards, true)[0];
}

function mediumBotDefend(hand: Card[], attackCard: Card, trumpSuit: Suit): Card | null {
  const validCards = getValidDefenseCards(hand, attackCard, trumpSuit);
  if (validCards.length === 0) return null;
  
  // Prefer same suit cards over trumps
  const sameSuitCards = validCards.filter(c => c.suit === attackCard.suit);
  if (sameSuitCards.length > 0) {
    return sortByValue(sameSuitCards, true)[0]; // Lowest same-suit card
  }
  
  // If attack is not trump and we must use trump, use lowest
  const trumpCards = getTrumps(validCards, trumpSuit);
  if (trumpCards.length > 0) {
    return sortByValue(trumpCards, true)[0];
  }
  
  return sortByValue(validCards, true)[0];
}

// HARD BOT: Advanced strategy, considers game state
function hardBotAttack(
  hand: Card[], 
  tableCards: TableCard[], 
  trumpSuit: Suit,
  deckSize: number,
  opponentHandSize: number
): Card | null {
  const validCards = hand.filter(c => canAddToAttack(c, tableCards));
  if (validCards.length === 0) return null;
  
  const nonTrumps = getNonTrumps(validCards, trumpSuit);
  const trumps = getTrumps(validCards, trumpSuit);
  
  // End game strategy: if deck is empty, be more aggressive
  if (deckSize === 0) {
    // Try to make opponent take cards
    if (nonTrumps.length > 0) {
      // Play middle-value cards to force trump usage
      const sorted = sortByValue(nonTrumps, true);
      return sorted[Math.floor(sorted.length / 2)];
    }
    // Use lower trumps if necessary
    if (trumps.length > 0) {
      return sortByValue(trumps, true)[0];
    }
  }
  
  // Standard play: prioritize getting rid of low non-trump cards
  if (nonTrumps.length > 0) {
    // Find cards with same rank on table (good for adding to attack)
    if (tableCards.length > 0) {
      const ranksOnTable = new Set(tableCards.flatMap(tc => 
        [tc.attack.rank, tc.defense?.rank].filter(Boolean)
      ));
      const matchingCards = nonTrumps.filter(c => ranksOnTable.has(c.rank));
      if (matchingCards.length > 0) {
        return sortByValue(matchingCards, true)[0];
      }
    }
    return sortByValue(nonTrumps, true)[0];
  }
  
  // Only trumps left - play lowest
  return sortByValue(trumps, true)[0];
}

function hardBotDefend(
  hand: Card[], 
  attackCard: Card, 
  trumpSuit: Suit,
  deckSize: number,
  tableCards: TableCard[]
): Card | null {
  const validCards = getValidDefenseCards(hand, attackCard, trumpSuit);
  if (validCards.length === 0) return null;
  
  const totalCardsOnTable = tableCards.reduce((sum, tc) => 
    sum + 1 + (tc.defense ? 1 : 0), 0
  );
  
  // Calculate if we should take or defend
  const sameSuitCards = validCards.filter(c => c.suit === attackCard.suit);
  const trumpCards = getTrumps(validCards, trumpSuit);
  
  // If attack is low and we have same suit, defend
  if (sameSuitCards.length > 0) {
    // Use lowest card that beats the attack
    return sortByValue(sameSuitCards, true)[0];
  }
  
  // End game: be more careful with trumps
  if (deckSize === 0) {
    // Consider taking if it costs too many trumps
    if (trumpCards.length > 0 && hand.length <= 3) {
      // Take if we have to use our last trumps
      const lowestTrump = sortByValue(trumpCards, true)[0];
      if (RANK_VALUES[lowestTrump.rank] >= RANK_VALUES['Q']) {
        return null; // Take instead of using high trump
      }
    }
  }
  
  // Use lowest trump if necessary
  if (trumpCards.length > 0) {
    return sortByValue(trumpCards, true)[0];
  }
  
  return sortByValue(validCards, true)[0];
}

// Should bot pass (bito)?
export function shouldBotPass(
  difficulty: BotDifficulty,
  hand: Card[],
  tableCards: TableCard[],
  trumpSuit: Suit,
  deckSize: number
): boolean {
  if (tableCards.length === 0) return false;
  
  // Check if all attacks are defended
  const allDefended = tableCards.every(tc => tc.defense !== null);
  if (!allDefended) return false;
  
  // Check if can add more cards
  const validCards = hand.filter(c => canAddToAttack(c, tableCards));
  
  switch (difficulty) {
    case 'easy':
      // Easy bot passes 50% of the time when possible
      return validCards.length === 0 || Math.random() > 0.5;
    
    case 'medium':
      // Medium bot passes if can't add more or has only trumps
      if (validCards.length === 0) return true;
      const nonTrumpValid = validCards.filter(c => c.suit !== trumpSuit);
      return nonTrumpValid.length === 0;
    
    case 'hard':
      // Hard bot strategically decides
      if (validCards.length === 0) return true;
      // In end game, try to add more cards
      if (deckSize === 0) return false;
      // Otherwise, pass if only trumps available
      const nonTrumps = validCards.filter(c => c.suit !== trumpSuit);
      return nonTrumps.length === 0;
  }
}

// Should bot take cards?
export function shouldBotTake(
  difficulty: BotDifficulty,
  hand: Card[],
  attackCard: Card,
  trumpSuit: Suit,
  tableCards: TableCard[],
  deckSize: number
): boolean {
  const validDefense = getValidDefenseCards(hand, attackCard, trumpSuit);
  if (validDefense.length === 0) return true; // Must take
  
  // Calculate cost of defending
  const totalCardsToTake = tableCards.reduce((sum, tc) => 
    sum + 1 + (tc.defense ? 1 : 0), 0
  );
  
  switch (difficulty) {
    case 'easy':
      // Easy bot always tries to defend if possible
      return false;
    
    case 'medium':
      // Medium bot takes if would cost high trump
      const trumpDefense = validDefense.filter(c => c.suit === trumpSuit);
      if (trumpDefense.length > 0 && trumpDefense.every(c => RANK_VALUES[c.rank] >= RANK_VALUES['K'])) {
        return totalCardsToTake <= 3; // Take if not too many cards
      }
      return false;
    
    case 'hard':
      // Hard bot calculates risk/reward
      if (deckSize === 0) {
        // End game: taking might be strategic
        if (hand.length + totalCardsToTake + 1 < 6) {
          return false; // Defend - still manageable hand
        }
        // Check if defense costs important cards
        const defenseCard = hardBotDefend(hand, attackCard, trumpSuit, deckSize, tableCards);
        if (defenseCard && defenseCard.suit === trumpSuit && RANK_VALUES[defenseCard.rank] >= RANK_VALUES['Q']) {
          return totalCardsToTake <= 2; // Take only if few cards
        }
      }
      return false;
  }
}

// Main bot move function
export function getBotAttackCard(
  difficulty: BotDifficulty,
  hand: Card[],
  tableCards: TableCard[],
  trumpSuit: Suit,
  deckSize: number = 0,
  opponentHandSize: number = 6
): Card | null {
  switch (difficulty) {
    case 'easy':
      return easyBotAttack(hand, tableCards, trumpSuit);
    case 'medium':
      return mediumBotAttack(hand, tableCards, trumpSuit);
    case 'hard':
      return hardBotAttack(hand, tableCards, trumpSuit, deckSize, opponentHandSize);
  }
}

export function getBotDefenseCard(
  difficulty: BotDifficulty,
  hand: Card[],
  attackCard: Card,
  trumpSuit: Suit,
  deckSize: number = 0,
  tableCards: TableCard[] = []
): Card | null {
  switch (difficulty) {
    case 'easy':
      return easyBotDefend(hand, attackCard, trumpSuit);
    case 'medium':
      return mediumBotDefend(hand, attackCard, trumpSuit);
    case 'hard':
      return hardBotDefend(hand, attackCard, trumpSuit, deckSize, tableCards);
  }
}
