// Joker card game types

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit | 'joker';
  rank: Rank | 'joker';
  id: string;
  isJoker?: boolean;
  jokerType?: 'red' | 'black'; // Two jokers: red and black
}

export interface PlayedCard {
  card: Card;
  playerId: string;
  jokerMode?: 'high' | 'low';
  declaredSuit?: Suit;
}

export interface JokerTable {
  id: string;
  table_number: number;
  player1_id: string | null;
  player1_username: string | null;
  player2_id: string | null;
  player2_username: string | null;
  player3_id: string | null;
  player3_username: string | null;
  player4_id: string | null;
  player4_username: string | null;
  status: 'free' | 'waiting' | 'playing';
  game_id: string | null;
}

export interface PlayerBid {
  playerId: string;
  bid: number;
  isPass: boolean;
}

export interface TrickResult {
  winnerId: string;
  cards: PlayedCard[];
}

export interface RoundScore {
  playerId: string;
  bid: number;
  tricksWon: number;
  points: number;
  cumulativeScore: number;
}

export interface ScoreboardEntry {
  set: number;
  round: number;
  cardsPerRound: number;
  scores: RoundScore[];
}

export interface JokerGameState {
  id: string;
  table_id: string;
  player1_id: string;
  player2_id: string;
  player3_id: string;
  player4_id: string;
  
  deck: Card[];
  trump_card: Card | null;
  trump_suit: Suit | null;
  
  player1_hand: Card[];
  player2_hand: Card[];
  player3_hand: Card[];
  player4_hand: Card[];
  
  current_trick: PlayedCard[];
  trick_leader_id: string;
  
  bids: Record<string, number>;
  tricks_won: Record<string, number>;
  
  current_set: number;
  current_round: number;
  cards_per_round: number;
  dealer_id: string;
  current_player_id: string;
  
  phase: 'bidding' | 'playing' | 'round_end' | 'set_end' | 'game_end';
  
  scoreboard: ScoreboardEntry[];
  player_scores: Record<string, number>;
  
  status: 'playing' | 'finished';
  winner_id: string | null;
}

// Card rank values for comparison (A is highest)
export const RANK_VALUES: Record<Rank, number> = {
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  'J': 11,
  'Q': 12,
  'K': 13,
  'A': 14,
};

// Suit symbols for display
export const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

// Suit colors
export const SUIT_COLORS: Record<Suit | 'joker', string> = {
  hearts: 'text-red-500',
  diamonds: 'text-red-500',
  clubs: 'text-gray-900 dark:text-white',
  spades: 'text-gray-900 dark:text-white',
  joker: 'text-purple-600',
};

// Georgian translations for suits
export const SUIT_NAMES_GE: Record<Suit, string> = {
  hearts: 'გული',
  diamonds: 'აგური',
  clubs: 'ჯვარი',
  spades: 'ყვავი',
};

// Round structure for all 24 rounds
export const GAME_STRUCTURE = {
  // Set 1: 1-8 cards (8 rounds)
  set1: [1, 2, 3, 4, 5, 6, 7, 8],
  // Set 2: 9 cards each (4 rounds)
  set2: [9, 9, 9, 9],
  // Set 3: 8-1 cards (8 rounds)
  set3: [8, 7, 6, 5, 4, 3, 2, 1],
  // Set 4: 9 cards each (4 rounds)
  set4: [9, 9, 9, 9],
};

export function getCardsForRound(set: number, roundInSet: number): number {
  switch (set) {
    case 1:
      return GAME_STRUCTURE.set1[roundInSet - 1] || 1;
    case 2:
      return 9;
    case 3:
      return GAME_STRUCTURE.set3[roundInSet - 1] || 1;
    case 4:
      return 9;
    default:
      return 1;
  }
}

export function getRoundsInSet(set: number): number {
  return set === 1 || set === 3 ? 8 : 4;
}

export function getTotalRounds(): number {
  return 24; // 8 + 4 + 8 + 4
}
