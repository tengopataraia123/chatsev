// Durak card game types

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
  id: string; // unique identifier for React keys
}

export interface TableCard {
  attack: Card;
  defense: Card | null;
}

export interface DurakTable {
  id: string;
  table_number: number;
  player1_id: string | null;
  player1_username: string | null;
  player2_id: string | null;
  player2_username: string | null;
  status: 'free' | 'waiting' | 'playing';
  game_id: string | null;
}

export interface DurakGameState {
  id: string;
  table_id: string;
  player1_id: string;
  player2_id: string;
  deck: Card[];
  trump_card: Card | null;
  trump_suit: Suit | null;
  discard_pile: Card[];
  player1_hand: Card[];
  player2_hand: Card[];
  table_cards: TableCard[];
  attacker_id: string;
  defender_id: string;
  phase: 'attack' | 'defense' | 'pickup' | 'finished';
  status: 'playing' | 'finished';
  winner_id: string | null;
  loser_id: string | null;
}

// Rank values for comparison
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
export const SUIT_COLORS: Record<Suit, string> = {
  hearts: 'text-red-500',
  diamonds: 'text-red-500',
  clubs: 'text-gray-900 dark:text-white',
  spades: 'text-gray-900 dark:text-white',
};

// Georgian translations for suits
export const SUIT_NAMES_GE: Record<Suit, string> = {
  hearts: 'გული',
  diamonds: 'აგური',
  clubs: 'ჯვარი',
  spades: 'ყვავი',
};
