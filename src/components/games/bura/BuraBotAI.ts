import { BuraCard, Suit, CARD_VALUES, RANK_ORDER } from './buraTypes';
import { doesBeat, checkBura, getCardPoints } from './buraGameLogic';
import { BotDifficulty } from '../shared/types';

export function getBuraBotCards(
  difficulty: BotDifficulty,
  hand: BuraCard[],
  opponentCards: BuraCard[],
  trumpSuit: Suit,
  isAttacking: boolean,
  deckSize: number
): { cards: BuraCard[]; hiddenCover: boolean } {
  // BURA = instant play all trumps
  if (checkBura(hand, trumpSuit)) {
    return { cards: hand.filter(c => c.suit === trumpSuit).slice(0, 3), hiddenCover: false };
  }

  switch (difficulty) {
    case 'easy': return easyPlay(hand, opponentCards, trumpSuit, isAttacking);
    case 'medium': return mediumPlay(hand, opponentCards, trumpSuit, isAttacking);
    case 'hard': return hardPlay(hand, opponentCards, trumpSuit, isAttacking, deckSize);
  }
}

/** Bot decides whether to accept დავი (Se) or fold (Chari) */
export function botRespondToDavi(
  difficulty: BotDifficulty,
  hand: BuraCard[],
  trumpSuit: Suit,
  currentScore: number,
  opponentScore: number
): 'se' | 'chari' {
  const trumpCount = hand.filter(c => c.suit === trumpSuit).length;
  const handValue = hand.reduce((s, c) => s + CARD_VALUES[c.rank], 0);

  if (difficulty === 'easy') {
    return Math.random() < 0.4 ? 'chari' : 'se';
  }

  if (difficulty === 'medium') {
    if (trumpCount === 0 && handValue < 10) return 'chari';
    if (opponentScore > 20 && handValue < 10) return 'chari';
    return 'se';
  }

  // Hard
  const highCards = hand.filter(c => RANK_ORDER[c.rank] >= 7).length;
  const strength = trumpCount * 3 + highCards * 2 + (handValue / 10);
  if (strength < 3) return 'chari';
  if (opponentScore >= 25 && strength < 5) return 'chari';
  return 'se';
}

/** Bot decides whether to propose დავი */
export function botShouldProposeDavi(
  difficulty: BotDifficulty,
  hand: BuraCard[],
  trumpSuit: Suit,
  currentScore: number,
  opponentScore: number,
  currentDaviLevel: number
): boolean {
  if (currentDaviLevel >= 5) return false; // max shashi

  const trumpCount = hand.filter(c => c.suit === trumpSuit).length;
  const handValue = hand.reduce((s, c) => s + CARD_VALUES[c.rank], 0);

  if (difficulty === 'easy') return Math.random() < 0.1;
  
  if (difficulty === 'medium') {
    return trumpCount >= 2 && handValue >= 15;
  }

  // Hard
  const highCards = hand.filter(c => RANK_ORDER[c.rank] >= 7).length;
  return (trumpCount >= 2 && highCards >= 2) || handValue >= 20;
}

/** Bot decides whether to count/declare 31 */
export function botShouldDeclare31(
  difficulty: BotDifficulty,
  score: number
): boolean {
  if (score >= 31) {
    // Easy bot might forget to declare sometimes
    if (difficulty === 'easy') return Math.random() < 0.7;
    return true;
  }
  // Hard bot might bluff (very rarely)
  if (difficulty === 'hard' && score >= 28 && Math.random() < 0.02) return true;
  return false;
}

/** Bot decides whether to cover hidden (give face-down) instead of beating */
function shouldCoverHidden(
  difficulty: BotDifficulty,
  hand: BuraCard[],
  attackCards: BuraCard[],
  trumpSuit: Suit
): boolean {
  // Check if bot CAN beat
  const canBeat = findBeatingCards(hand, attackCards, trumpSuit);
  if (!canBeat) return true; // must give if can't beat

  if (difficulty === 'easy') {
    // Easy: sometimes gives even when can beat
    return Math.random() < 0.2;
  }

  // Medium/Hard: give hidden when beating would waste trumps on low-value cards
  const attackValue = getCardPoints(attackCards);
  const wouldUseTrumps = canBeat.some(c => c.suit === trumpSuit);
  if (wouldUseTrumps && attackValue <= 5) return true;

  return false;
}

function findBeatingCards(hand: BuraCard[], attackCards: BuraCard[], trumpSuit: Suit): BuraCard[] | null {
  const count = attackCards.length;
  
  if (count === 1) {
    const atk = attackCards[0];
    // Same suit higher
    const sameSuit = hand
      .filter(c => c.suit === atk.suit && RANK_ORDER[c.rank] > RANK_ORDER[atk.rank])
      .sort((a, b) => RANK_ORDER[a.rank] - RANK_ORDER[b.rank]);
    if (sameSuit.length > 0) return [sameSuit[0]];
    
    // Trump
    if (atk.suit !== trumpSuit) {
      const trumps = hand.filter(c => c.suit === trumpSuit)
        .sort((a, b) => RANK_ORDER[a.rank] - RANK_ORDER[b.rank]);
      if (trumps.length > 0) return [trumps[0]];
    }
    return null;
  }
  
  // Multi-card: need same suit cards that beat each corresponding attack card
  // Simplified: find group of same suit cards
  const suitGroups = groupBySuit(hand);
  for (const group of suitGroups) {
    if (group.length >= count) {
      const sorted = group.sort((a, b) => RANK_ORDER[b.rank] - RANK_ORDER[a.rank]);
      return sorted.slice(0, count);
    }
  }
  return null;
}

function easyPlay(hand: BuraCard[], oppCards: BuraCard[], trumpSuit: Suit, isAttacking: boolean): { cards: BuraCard[]; hiddenCover: boolean } {
  if (isAttacking) {
    return { cards: [hand[Math.floor(Math.random() * hand.length)]], hiddenCover: false };
  }
  
  if (shouldCoverHidden('easy', hand, oppCards, trumpSuit)) {
    // Give face-down (hidden cover)
    return { cards: hand.slice(0, oppCards.length), hiddenCover: true };
  }
  
  const beating = findBeatingCards(hand, oppCards, trumpSuit);
  if (beating) return { cards: beating, hiddenCover: false };
  return { cards: hand.slice(0, oppCards.length), hiddenCover: true };
}

function mediumPlay(hand: BuraCard[], oppCards: BuraCard[], trumpSuit: Suit, isAttacking: boolean): { cards: BuraCard[]; hiddenCover: boolean } {
  if (isAttacking) {
    const nonTrumps = hand.filter(c => c.suit !== trumpSuit);
    const source = nonTrumps.length > 0 ? nonTrumps : hand;
    return { cards: [source.sort((a, b) => RANK_ORDER[a.rank] - RANK_ORDER[b.rank])[0]], hiddenCover: false };
  }
  
  if (shouldCoverHidden('medium', hand, oppCards, trumpSuit)) {
    const lowest = [...hand].sort((a, b) => CARD_VALUES[a.rank] - CARD_VALUES[b.rank]);
    return { cards: lowest.slice(0, oppCards.length), hiddenCover: true };
  }
  
  const beating = findBeatingCards(hand, oppCards, trumpSuit);
  if (beating) return { cards: beating, hiddenCover: false };
  const lowest = [...hand].sort((a, b) => CARD_VALUES[a.rank] - CARD_VALUES[b.rank]);
  return { cards: lowest.slice(0, oppCards.length), hiddenCover: true };
}

function hardPlay(hand: BuraCard[], oppCards: BuraCard[], trumpSuit: Suit, isAttacking: boolean, deckSize: number): { cards: BuraCard[]; hiddenCover: boolean } {
  if (isAttacking) {
    // Try multi-card attack with same suit for maximum points
    if (deckSize === 0) {
      const suitGroups = groupBySuit(hand);
      const best = suitGroups
        .filter(g => g.length >= 1)
        .sort((a, b) => {
          const aVal = a.reduce((s, c) => s + CARD_VALUES[c.rank], 0);
          const bVal = b.reduce((s, c) => s + CARD_VALUES[c.rank], 0);
          return bVal - aVal;
        })[0];
      if (best) return { cards: best.slice(0, 3), hiddenCover: false };
    }
    const nonTrumps = hand.filter(c => c.suit !== trumpSuit);
    if (nonTrumps.length > 0) {
      return { cards: [nonTrumps.sort((a, b) => RANK_ORDER[a.rank] - RANK_ORDER[b.rank])[0]], hiddenCover: false };
    }
    return { cards: [hand.sort((a, b) => RANK_ORDER[a.rank] - RANK_ORDER[b.rank])[0]], hiddenCover: false };
  }
  
  if (shouldCoverHidden('hard', hand, oppCards, trumpSuit)) {
    const lowest = [...hand].sort((a, b) => CARD_VALUES[a.rank] - CARD_VALUES[b.rank]);
    return { cards: lowest.slice(0, oppCards.length), hiddenCover: true };
  }
  
  const beating = findBeatingCards(hand, oppCards, trumpSuit);
  if (beating) return { cards: beating, hiddenCover: false };
  const lowest = [...hand].sort((a, b) => CARD_VALUES[a.rank] - CARD_VALUES[b.rank]);
  return { cards: lowest.slice(0, oppCards.length), hiddenCover: true };
}

function groupBySuit(cards: BuraCard[]): BuraCard[][] {
  const groups: Record<string, BuraCard[]> = {};
  for (const c of cards) {
    if (!groups[c.suit]) groups[c.suit] = [];
    groups[c.suit].push(c);
  }
  return Object.values(groups).sort((a, b) => b.length - a.length);
}

export function getBuraBotDelay(difficulty: BotDifficulty): number {
  const delays: Record<BotDifficulty, [number, number]> = {
    easy: [800, 1500], medium: [600, 1200], hard: [400, 800]
  };
  const [min, max] = delays[difficulty];
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
