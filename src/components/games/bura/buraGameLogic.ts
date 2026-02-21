import { BuraCard, Suit, Rank, BuraGameState, SUITS, RANKS, CARD_VALUES, RANK_ORDER, DAVI_POINTS } from './buraTypes';

export function createDeck(): BuraCard[] {
  const deck: BuraCard[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, id: `${rank}_${suit}` });
    }
  }
  return shuffleDeck(deck);
}

function shuffleDeck(deck: BuraCard[]): BuraCard[] {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function dealCards(deck: BuraCard[], count: number): { dealt: BuraCard[]; remaining: BuraCard[] } {
  return { dealt: deck.slice(0, count), remaining: deck.slice(count) };
}

export function getCardPoints(cards: BuraCard[]): number {
  return cards.reduce((sum, c) => sum + CARD_VALUES[c.rank], 0);
}

export function doesBeat(attacker: BuraCard, defender: BuraCard, trumpSuit: Suit): boolean {
  if (attacker.suit === defender.suit) {
    return RANK_ORDER[attacker.rank] > RANK_ORDER[defender.rank];
  }
  if (attacker.suit === trumpSuit && defender.suit !== trumpSuit) return true;
  return false;
}

/** Check if defense cards beat all attack cards (same suit higher or trump) */
export function canDefenseBeat(
  attackCards: BuraCard[],
  defenseCards: BuraCard[],
  trumpSuit: Suit
): boolean {
  if (defenseCards.length !== attackCards.length) return false;
  for (let i = 0; i < attackCards.length; i++) {
    if (!doesBeat(defenseCards[i], attackCards[i], trumpSuit)) return false;
  }
  return true;
}

export function determineTrickWinner(
  attackCards: BuraCard[],
  defenseCards: BuraCard[],
  trumpSuit: Suit,
  attacker: 'player' | 'bot',
  defenderCoveredHidden: boolean
): 'player' | 'bot' {
  // If defender covered hidden (gave cards face-down), attacker always wins the trick
  if (defenderCoveredHidden) return attacker;
  
  const defender = attacker === 'player' ? 'bot' : 'player';
  if (canDefenseBeat(attackCards, defenseCards, trumpSuit)) return defender;
  return attacker;
}

/** Check for BURA — 3 trump cards = instant auto win */
export function checkBura(hand: BuraCard[], trumpSuit: Suit): boolean {
  return hand.filter(c => c.suit === trumpSuit).length >= 3 && hand.length >= 3;
}

/** Check for MALYUTKA — 3 same suit cards (not necessarily trump) */
export function checkMalyutka(hand: BuraCard[]): boolean {
  if (hand.length < 3) return false;
  const suit = hand[0].suit;
  return hand.length >= 3 && hand.slice(0, 3).every(c => c.suit === suit);
}

export function isLegalAttack(cards: BuraCard[]): boolean {
  if (cards.length === 0 || cards.length > 3) return false;
  const suit = cards[0].suit;
  return cards.every(c => c.suit === suit);
}

export function initBuraRound(prevState?: Partial<BuraGameState>): BuraGameState {
  const deck = createDeck();
  const p = dealCards(deck, 3);
  let remaining = p.remaining;
  const b = dealCards(remaining, 3);
  remaining = b.remaining;
  const trumpCard = remaining[remaining.length - 1];

  return {
    deck: remaining,
    playerHand: p.dealt,
    botHand: b.dealt,
    trumpCard,
    trumpSuit: trumpCard.suit,
    playerScore: 0,
    botScore: 0,
    playerTaken: [],
    botTaken: [],
    tablePlayerCards: [],
    tableBotCards: [],
    playerCoveredHidden: false,
    botCoveredHidden: false,
    currentTurn: 'player',
    phase: 'playing',
    winner: null,
    message: 'თქვენი სვლაა',
    lastTrickWinner: null,
    buraWin: false,
    daviLevel: 0,
    daviProposedBy: null,
    playerMatchScore: prevState?.playerMatchScore ?? 0,
    botMatchScore: prevState?.botMatchScore ?? 0,
    matchTarget: prevState?.matchTarget ?? 11,
    roundOver: false,
    roundWinner: null,
    roundMessage: '',
  };
}

// Legacy alias
export function initBuraGame(): BuraGameState {
  return initBuraRound();
}

export function drawCards(state: BuraGameState): BuraGameState {
  const deck = [...state.deck];
  const playerHand = [...state.playerHand];
  const botHand = [...state.botHand];

  // Winner draws first
  const first = state.lastTrickWinner === 'bot' ? botHand : playerHand;
  const second = state.lastTrickWinner === 'bot' ? playerHand : botHand;

  while (first.length < 3 && deck.length > 0) {
    first.push(deck.shift()!);
  }
  while (second.length < 3 && deck.length > 0) {
    second.push(deck.shift()!);
  }

  const newPlayerHand = state.lastTrickWinner === 'bot' ? second : first;
  const newBotHand = state.lastTrickWinner === 'bot' ? first : second;

  return { ...state, deck, playerHand: newPlayerHand, botHand: newBotHand };
}

/** Check if someone hit 31 or hands are empty */
export function checkRoundOver(state: BuraGameState): BuraGameState {
  // BURA check — 3 trumps = auto win
  if (checkBura(state.playerHand, state.trumpSuit)) {
    return finishRound(state, 'player', true);
  }
  if (checkBura(state.botHand, state.trumpSuit)) {
    return finishRound(state, 'bot', true);
  }

  // If both hands empty and deck empty
  if (state.playerHand.length === 0 && state.botHand.length === 0 && state.deck.length === 0) {
    if (state.playerScore >= 31) return finishRound(state, 'player', false);
    if (state.botScore >= 31) return finishRound(state, 'bot', false);
    // No one reached 31 — whoever has more wins
    if (state.playerScore > state.botScore) return finishRound(state, 'player', false);
    if (state.botScore > state.playerScore) return finishRound(state, 'bot', false);
    return finishRound(state, null, false);
  }
  return state;
}

/** Player or bot declares "I have 31" — check if true */
export function declareThirtyOne(state: BuraGameState, declarer: 'player' | 'bot'): BuraGameState {
  const score = declarer === 'player' ? state.playerScore : state.botScore;
  if (score >= 31) {
    return finishRound(state, declarer, false);
  }
  // Declared falsely — opponent wins!
  const opponent = declarer === 'player' ? 'bot' : 'player';
  return finishRound(state, opponent, false, `❌ ცრუ გამოცხადება! ${declarer === 'player' ? 'წააგეთ' : 'ბოტმა წააგო'}`);
}

function finishRound(
  state: BuraGameState, 
  winner: 'player' | 'bot' | null, 
  isBura: boolean,
  customMessage?: string
): BuraGameState {
  // Calculate match points earned
  const matchPointsEarned = state.daviLevel > 0 
    ? DAVI_POINTS[Math.min(state.daviLevel - 1, DAVI_POINTS.length - 1)]
    : 1;
  
  // Bura = double match points
  const finalPoints = isBura ? matchPointsEarned * 2 : matchPointsEarned;

  const newPlayerMatch = winner === 'player' 
    ? state.playerMatchScore + finalPoints 
    : state.playerMatchScore;
  const newBotMatch = winner === 'bot' 
    ? state.botMatchScore + finalPoints 
    : state.botMatchScore;

  const matchOver = newPlayerMatch >= state.matchTarget || newBotMatch >= state.matchTarget;

  let message = customMessage || '';
  if (!customMessage) {
    if (isBura) {
      message = winner === 'player' ? '🔥 ბურა! მოიგეთ რაუნდი!' : '🔥 ბოტის ბურა!';
    } else if (winner) {
      message = winner === 'player' ? '🎉 მოიგეთ რაუნდი!' : '😔 ბოტმა მოიგო რაუნდი';
    } else {
      message = '🤝 ფრე';
    }
  }
  
  if (matchOver) {
    const matchWinner = newPlayerMatch >= state.matchTarget ? 'player' : 'bot';
    message = matchWinner === 'player' 
      ? `🏆 მოიგეთ მატჩი! (${newPlayerMatch}:${newBotMatch})`
      : `😔 ბოტმა მოიგო მატჩი (${newBotMatch}:${newPlayerMatch})`;
  }

  message += ` [+${finalPoints} ქ.]`;

  return {
    ...state,
    phase: 'finished',
    winner,
    buraWin: isBura,
    playerMatchScore: newPlayerMatch,
    botMatchScore: newBotMatch,
    roundOver: true,
    roundWinner: winner,
    roundMessage: message,
    message,
  };
}

// Legacy export for compatibility
export const checkGameOver = checkRoundOver;
