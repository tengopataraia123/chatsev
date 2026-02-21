export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '10' | 'J' | 'Q' | 'K' | 'A';

export interface BuraCard {
  suit: Suit;
  rank: Rank;
  id: string;
}

// Davi ladder names
export const DAVI_LADDER = ['დავი', 'სე', 'ჩარი', 'ფანჯი', 'შაში'] as const;
export const DAVI_POINTS = [2, 3, 4, 5, 6] as const;

export interface BuraGameState {
  deck: BuraCard[];
  playerHand: BuraCard[];
  botHand: BuraCard[];
  trumpCard: BuraCard;
  trumpSuit: Suit;
  playerScore: number; // card points this round (goal: 31)
  botScore: number;
  playerTaken: BuraCard[];
  botTaken: BuraCard[];
  tablePlayerCards: BuraCard[];
  tableBotCards: BuraCard[];
  // Hidden cover: if defender plays face-down
  playerCoveredHidden: boolean;
  botCoveredHidden: boolean;
  currentTurn: 'player' | 'bot';
  phase: 'playing' | 'finished' | 'davi_pending';
  winner: 'player' | 'bot' | 'draw' | null;
  message: string;
  lastTrickWinner: 'player' | 'bot' | null;
  buraWin: boolean;
  // Davi system — ladder index (0=davi, 1=se, 2=chari, 3=fanji, 4=shashi)
  daviLevel: number; // 0 = no davi active, 1 = davi proposed, etc.
  daviProposedBy: 'player' | 'bot' | null;
  // Match scoring (first to 11)
  playerMatchScore: number;
  botMatchScore: number;
  matchTarget: number; // 11
  roundOver: boolean; // true when a single round is done but match continues
  roundWinner: 'player' | 'bot' | null;
  roundMessage: string;
}

export const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
export const RANKS: Rank[] = ['10', 'J', 'Q', 'K', 'A'];

export const CARD_VALUES: Record<Rank, number> = {
  '10': 10, 'J': 2, 'Q': 3, 'K': 4, 'A': 11,
};

// Bura rank order: A > 10 > K > Q > J
export const RANK_ORDER: Record<Rank, number> = {
  'J': 0, 'Q': 1, 'K': 2, '10': 3, 'A': 4,
};

export const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠',
};

export const SUIT_COLORS: Record<Suit, string> = {
  hearts: 'text-red-500', diamonds: 'text-red-500',
  clubs: 'text-white', spades: 'text-white',
};
