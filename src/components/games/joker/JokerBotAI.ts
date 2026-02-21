// Joker Bot AI with multiple difficulty levels

import { Card, Suit, Rank, PlayedCard, RANK_VALUES } from './types';
import { canPlayCard, isValidBid, getForbiddenBidForDealer } from './gameLogic';

export type BotDifficulty = 'easy' | 'medium' | 'hard';

// Bot decision delay based on difficulty (in ms)
export const BOT_DELAYS: Record<BotDifficulty, { min: number; max: number }> = {
  easy: { min: 1500, max: 2500 },
  medium: { min: 1000, max: 1800 },
  hard: { min: 600, max: 1200 },
};

// Get random delay for bot move
export function getBotDelay(difficulty: BotDifficulty): number {
  const { min, max } = BOT_DELAYS[difficulty];
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Sort cards by value
function sortByValue(cards: Card[], ascending: boolean = true): Card[] {
  return [...cards].sort((a, b) => {
    if (a.isJoker && !b.isJoker) return ascending ? 1 : -1;
    if (!a.isJoker && b.isJoker) return ascending ? -1 : 1;
    if (a.isJoker && b.isJoker) return 0;
    const diff = RANK_VALUES[a.rank as Rank] - RANK_VALUES[b.rank as Rank];
    return ascending ? diff : -diff;
  });
}

// Get trump cards from hand
function getTrumps(hand: Card[], trumpSuit: Suit | null): Card[] {
  if (!trumpSuit) return [];
  return hand.filter(c => c.suit === trumpSuit && !c.isJoker);
}

// Get non-trump cards from hand
function getNonTrumps(hand: Card[], trumpSuit: Suit | null): Card[] {
  return hand.filter(c => c.suit !== trumpSuit && !c.isJoker);
}

// Get jokers from hand
function getJokers(hand: Card[]): Card[] {
  return hand.filter(c => c.isJoker);
}

// Count potential winning cards
function countWinningCards(hand: Card[], trumpSuit: Suit | null): number {
  let count = 0;
  const jokers = getJokers(hand);
  count += jokers.length; // Jokers can win tricks
  
  // Count high trumps
  const trumps = getTrumps(hand, trumpSuit);
  trumps.forEach(c => {
    if (RANK_VALUES[c.rank as Rank] >= RANK_VALUES['Q']) count++;
  });
  
  // Count aces of other suits
  const nonTrumps = getNonTrumps(hand, trumpSuit);
  nonTrumps.forEach(c => {
    if (c.rank === 'A') count++;
  });
  
  return count;
}

// ========== BIDDING AI ==========

export function getBotBid(
  difficulty: BotDifficulty,
  hand: Card[],
  cardsPerRound: number,
  existingBids: number[],
  isDealer: boolean,
  trumpSuit: Suit | null
): number {
  const winningCards = countWinningCards(hand, trumpSuit);
  let bid: number;
  
  switch (difficulty) {
    case 'easy':
      // Easy: bid somewhat randomly, often underbids
      bid = Math.floor(Math.random() * (cardsPerRound + 1));
      break;
      
    case 'medium':
      // Medium: bid based on winning cards with some randomness
      bid = Math.min(winningCards + (Math.random() > 0.5 ? 1 : 0), cardsPerRound);
      break;
      
    case 'hard':
      // Hard: precise calculation
      bid = calculateOptimalBid(hand, cardsPerRound, trumpSuit);
      break;
      
    default:
      bid = 0;
  }
  
  // Ensure bid is valid
  bid = Math.max(0, Math.min(bid, cardsPerRound));
  
  // Check dealer restriction
  if (isDealer) {
    const forbiddenBid = getForbiddenBidForDealer(cardsPerRound, existingBids);
    if (bid === forbiddenBid) {
      // Adjust bid
      bid = bid > 0 ? bid - 1 : bid + 1;
      if (bid > cardsPerRound) bid = cardsPerRound - 1;
      if (bid < 0) bid = 0;
    }
  }
  
  return bid;
}

function calculateOptimalBid(hand: Card[], cardsPerRound: number, trumpSuit: Suit | null): number {
  let expectedWins = 0;
  
  // Jokers almost always win
  expectedWins += getJokers(hand).length * 0.9;
  
  // High trumps are strong
  const trumps = getTrumps(hand, trumpSuit);
  trumps.forEach(c => {
    const value = RANK_VALUES[c.rank as Rank];
    if (value >= RANK_VALUES['A']) expectedWins += 0.9;
    else if (value >= RANK_VALUES['K']) expectedWins += 0.75;
    else if (value >= RANK_VALUES['Q']) expectedWins += 0.6;
    else if (value >= RANK_VALUES['J']) expectedWins += 0.4;
    else expectedWins += 0.2;
  });
  
  // Non-trump aces
  const nonTrumps = getNonTrumps(hand, trumpSuit);
  nonTrumps.forEach(c => {
    if (c.rank === 'A') expectedWins += 0.6;
    else if (c.rank === 'K') expectedWins += 0.3;
  });
  
  return Math.round(expectedWins);
}

// ========== PLAYING AI ==========

export function getBotPlayCard(
  difficulty: BotDifficulty,
  hand: Card[],
  currentTrick: PlayedCard[],
  trumpSuit: Suit | null,
  myBid: number,
  myTricksWon: number,
  cardsPerRound: number
): { card: Card; jokerMode?: 'high' | 'low'; declaredSuit?: Suit } | null {
  const playableCards = hand.filter(c => 
    canPlayCard(c, hand, getLeadSuit(currentTrick), trumpSuit, currentTrick)
  );
  
  if (playableCards.length === 0) return null;
  
  switch (difficulty) {
    case 'easy':
      return easyBotPlay(playableCards, currentTrick, trumpSuit);
    case 'medium':
      return mediumBotPlay(playableCards, currentTrick, trumpSuit, myBid, myTricksWon);
    case 'hard':
      return hardBotPlay(playableCards, currentTrick, trumpSuit, myBid, myTricksWon, cardsPerRound, hand);
  }
}

function getLeadSuit(trick: PlayedCard[]): Suit | null {
  if (trick.length === 0) return null;
  const leadCard = trick[0];
  return leadCard.card.isJoker ? leadCard.declaredSuit || null : leadCard.card.suit as Suit;
}

function getMostCommonSuit(hand: Card[]): Suit {
  const suitCounts: Record<Suit, number> = {
    hearts: 0, diamonds: 0, clubs: 0, spades: 0
  };
  
  hand.filter(c => !c.isJoker).forEach(c => {
    suitCounts[c.suit as Suit]++;
  });
  
  return (Object.entries(suitCounts).sort((a, b) => b[1] - a[1])[0][0] as Suit) || 'hearts';
}

function easyBotPlay(
  playableCards: Card[],
  currentTrick: PlayedCard[],
  trumpSuit: Suit | null
): { card: Card; jokerMode?: 'high' | 'low'; declaredSuit?: Suit } {
  // Easy: play random card
  const card = playableCards[Math.floor(Math.random() * playableCards.length)];
  
  if (card.isJoker) {
    const mode = Math.random() > 0.5 ? 'high' : 'low';
    const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
    const declaredSuit = suits[Math.floor(Math.random() * suits.length)];
    return { card, jokerMode: mode, declaredSuit };
  }
  
  return { card };
}

function mediumBotPlay(
  playableCards: Card[],
  currentTrick: PlayedCard[],
  trumpSuit: Suit | null,
  myBid: number,
  myTricksWon: number
): { card: Card; jokerMode?: 'high' | 'low'; declaredSuit?: Suit } {
  const needTricks = myBid - myTricksWon;
  const jokers = playableCards.filter(c => c.isJoker);
  const nonJokers = playableCards.filter(c => !c.isJoker);
  
  // Leading
  if (currentTrick.length === 0) {
    if (needTricks > 0 && jokers.length > 0) {
      // Play high joker to win
      return { 
        card: jokers[0], 
        jokerMode: 'high', 
        declaredSuit: getMostCommonSuit(playableCards) 
      };
    }
    // Play lowest non-trump
    const sorted = sortByValue(nonJokers.filter(c => c.suit !== trumpSuit), true);
    if (sorted.length > 0) return { card: sorted[0] };
    return { card: sortByValue(playableCards, true)[0] };
  }
  
  // Following
  if (needTricks > 0) {
    // Try to win
    if (jokers.length > 0) {
      return { 
        card: jokers[0], 
        jokerMode: 'high', 
        declaredSuit: getLeadSuit(currentTrick) || 'hearts'
      };
    }
    // Play highest
    return { card: sortByValue(nonJokers, false)[0] || playableCards[0] };
  } else {
    // Don't need tricks - play low
    if (jokers.length > 0 && nonJokers.length === 0) {
      return { 
        card: jokers[0], 
        jokerMode: 'low', 
        declaredSuit: getLeadSuit(currentTrick) || 'hearts'
      };
    }
    return { card: sortByValue(nonJokers, true)[0] || playableCards[0] };
  }
}

function hardBotPlay(
  playableCards: Card[],
  currentTrick: PlayedCard[],
  trumpSuit: Suit | null,
  myBid: number,
  myTricksWon: number,
  cardsPerRound: number,
  fullHand: Card[]
): { card: Card; jokerMode?: 'high' | 'low'; declaredSuit?: Suit } {
  const needTricks = myBid - myTricksWon;
  const remainingRounds = fullHand.length;
  const jokers = playableCards.filter(c => c.isJoker);
  const nonJokers = playableCards.filter(c => !c.isJoker);
  const trumps = playableCards.filter(c => c.suit === trumpSuit && !c.isJoker);
  
  // Leading
  if (currentTrick.length === 0) {
    if (needTricks > 0) {
      // Need to win - use strongest cards strategically
      if (needTricks === remainingRounds) {
        // Need to win all remaining - play strongest
        if (jokers.length > 0) {
          return { 
            card: jokers[0], 
            jokerMode: 'high', 
            declaredSuit: getMostCommonSuit(fullHand)
          };
        }
        if (trumps.length > 0) {
          return { card: sortByValue(trumps, false)[0] };
        }
      }
      
      // Play aces or high cards
      const aces = nonJokers.filter(c => c.rank === 'A');
      if (aces.length > 0) return { card: aces[0] };
      
      // Play high trump
      if (trumps.length > 0) {
        return { card: sortByValue(trumps, false)[0] };
      }
    } else if (needTricks < 0) {
      // Already won enough - dump low cards
      const lowNonTrumps = sortByValue(nonJokers.filter(c => c.suit !== trumpSuit), true);
      if (lowNonTrumps.length > 0) return { card: lowNonTrumps[0] };
    }
    
    // Default: play lowest non-trump
    const sorted = sortByValue(nonJokers.filter(c => c.suit !== trumpSuit), true);
    if (sorted.length > 0) return { card: sorted[0] };
    return { card: sortByValue(playableCards, true)[0] };
  }
  
  // Following - analyze trick
  const leadSuit = getLeadSuit(currentTrick);
  const currentWinner = findCurrentWinner(currentTrick, trumpSuit);
  const canWinThisTrick = canBeatCurrentWinner(playableCards, currentWinner, leadSuit, trumpSuit);
  
  if (needTricks > 0 && canWinThisTrick) {
    // Need tricks and can win - find minimum winning card
    return findMinWinningCard(playableCards, currentWinner, leadSuit, trumpSuit, jokers);
  } else if (needTricks <= 0) {
    // Don't need tricks - dump lowest
    if (jokers.length > 0 && nonJokers.length === 0) {
      return { 
        card: jokers[0], 
        jokerMode: 'low', 
        declaredSuit: leadSuit || 'hearts'
      };
    }
    return { card: sortByValue(nonJokers, true)[0] || playableCards[0] };
  }
  
  // Can't win or neutral - play lowest
  return { card: sortByValue(nonJokers, true)[0] || playableCards[0] };
}

function findCurrentWinner(trick: PlayedCard[], trumpSuit: Suit | null): PlayedCard | null {
  if (trick.length === 0) return null;
  
  // Simplified - find highest card considering trump
  let winner = trick[0];
  const leadSuit = getLeadSuit(trick);
  
  for (const played of trick) {
    if (played.card.isJoker && played.jokerMode === 'high') {
      winner = played;
    } else if (!winner.card.isJoker || winner.jokerMode === 'low') {
      if (played.card.suit === trumpSuit && winner.card.suit !== trumpSuit) {
        winner = played;
      } else if (played.card.suit === winner.card.suit) {
        if (RANK_VALUES[played.card.rank as Rank] > RANK_VALUES[winner.card.rank as Rank]) {
          winner = played;
        }
      }
    }
  }
  
  return winner;
}

function canBeatCurrentWinner(
  playableCards: Card[],
  currentWinner: PlayedCard | null,
  leadSuit: Suit | null,
  trumpSuit: Suit | null
): boolean {
  if (!currentWinner) return true;
  
  // Jokers can beat (almost) anything
  if (playableCards.some(c => c.isJoker)) return true;
  
  // Check if we have higher trump
  if (currentWinner.card.suit === trumpSuit && !currentWinner.card.isJoker) {
    const myTrumps = playableCards.filter(c => c.suit === trumpSuit);
    return myTrumps.some(c => RANK_VALUES[c.rank as Rank] > RANK_VALUES[currentWinner.card.rank as Rank]);
  }
  
  // Check same suit
  if (leadSuit) {
    const mySuitCards = playableCards.filter(c => c.suit === leadSuit);
    if (mySuitCards.some(c => RANK_VALUES[c.rank as Rank] > RANK_VALUES[currentWinner.card.rank as Rank])) {
      return true;
    }
  }
  
  // Check if we can trump
  if (trumpSuit && playableCards.some(c => c.suit === trumpSuit)) {
    return true;
  }
  
  return false;
}

function findMinWinningCard(
  playableCards: Card[],
  currentWinner: PlayedCard | null,
  leadSuit: Suit | null,
  trumpSuit: Suit | null,
  jokers: Card[]
): { card: Card; jokerMode?: 'high' | 'low'; declaredSuit?: Suit } {
  if (!currentWinner) {
    return { card: sortByValue(playableCards, false)[0] };
  }
  
  // Try to win with minimum card
  const nonJokers = playableCards.filter(c => !c.isJoker);
  
  // Same suit winners
  if (leadSuit && !currentWinner.card.isJoker) {
    const suitCards = sortByValue(
      nonJokers.filter(c => c.suit === leadSuit && 
        RANK_VALUES[c.rank as Rank] > RANK_VALUES[currentWinner.card.rank as Rank]),
      true
    );
    if (suitCards.length > 0) return { card: suitCards[0] };
  }
  
  // Trump winners
  if (trumpSuit && currentWinner.card.suit !== trumpSuit) {
    const trumpCards = sortByValue(nonJokers.filter(c => c.suit === trumpSuit), true);
    if (trumpCards.length > 0) return { card: trumpCards[0] };
  }
  
  // Use joker as last resort
  if (jokers.length > 0) {
    return { 
      card: jokers[0], 
      jokerMode: 'high', 
      declaredSuit: leadSuit || 'hearts'
    };
  }
  
  return { card: sortByValue(playableCards, false)[0] };
}
