import {
  DominoTile, DominoGameState, DominoMatchConfig, DEFAULT_MATCH_CONFIG,
  PlacementSide, createAllTiles, shuffleTiles, handPoints,
  findHighestDouble, tilePoints
} from './dominoTypes';

export function initDominoRound(
  config: DominoMatchConfig = DEFAULT_MATCH_CONFIG,
  playerMatchScore = 0,
  botMatchScore = 0,
  roundNumber = 1,
  previousWinner: 'player' | 'bot' | null = null
): DominoGameState {
  const tiles = shuffleTiles(createAllTiles());
  const playerHand = tiles.slice(0, 7);
  const botHand = tiles.slice(7, 14);
  const boneyard = tiles.slice(14);

  let firstPlayer: 'player' | 'bot' = previousWinner || 'player';

  // First round: highest double starts (Adjarabet style)
  if (roundNumber === 1) {
    const playerHighest = findHighestDouble(playerHand);
    const botHighest = findHighestDouble(botHand);

    if (playerHighest >= 0 && botHighest >= 0) {
      firstPlayer = playerHighest >= botHighest ? 'player' : 'bot';
    } else if (playerHighest >= 0) {
      firstPlayer = 'player';
    } else if (botHighest >= 0) {
      firstPlayer = 'bot';
    } else {
      const pSum = playerHand.reduce((best, t) => {
        const s = tilePoints(t);
        const bS = tilePoints(best);
        return s > bS || (s === bS && Math.max(t.left, t.right) > Math.max(best.left, best.right)) ? t : best;
      }, playerHand[0]);
      const bSum = botHand.reduce((best, t) => {
        const s = tilePoints(t);
        const bS = tilePoints(best);
        return s > bS || (s === bS && Math.max(t.left, t.right) > Math.max(best.left, best.right)) ? t : best;
      }, botHand[0]);
      firstPlayer = tilePoints(pSum) >= tilePoints(bSum) ? 'player' : 'bot';
    }
  }

  return {
    boneyard, playerHand, botHand, chain: [],
    chainLeftEnd: -1, chainRightEnd: -1,
    spinnerIndex: -1, spinnerValue: -1,
    chainTopEnd: -1, chainBottomEnd: -1,
    topBranch: [], bottomBranch: [],
    topBranchOpen: false, bottomBranchOpen: false,
    currentTurn: firstPlayer,
    phase: 'playing',
    winner: null,
    message: firstPlayer === 'player' ? 'შენი სვლაა — დადე ქვა' : 'ბოტი ფიქრობს...',
    consecutivePasses: 0,
    playerRoundScore: 0,
    botRoundScore: 0,
    playerMatchScore,
    botMatchScore,
    roundNumber,
    roundWinner: null,
    matchConfig: config,
    lastPlayedTileId: null,
    isDrawing: false,
  };
}

export function placeTile(
  state: DominoGameState,
  tile: DominoTile,
  side: PlacementSide,
  who: 'player' | 'bot'
): DominoGameState {
  const chain = [...state.chain];
  let leftEnd = state.chainLeftEnd;
  let rightEnd = state.chainRightEnd;
  let spinnerIndex = state.spinnerIndex;
  let spinnerValue = state.spinnerValue;
  let chainTopEnd = state.chainTopEnd;
  let chainBottomEnd = state.chainBottomEnd;
  let topBranch = [...state.topBranch];
  let bottomBranch = [...state.bottomBranch];
  let topBranchOpen = state.topBranchOpen;
  let bottomBranchOpen = state.bottomBranchOpen;

  if (chain.length === 0) {
    // First tile placed
    chain.push(tile);
    leftEnd = tile.left;
    rightEnd = tile.right;
    // If first tile is a double, it becomes the spinner
    if (tile.left === tile.right) {
      spinnerIndex = 0;
      spinnerValue = tile.left;
      topBranchOpen = true;
      bottomBranchOpen = true;
    }
  } else if (side === 'left') {
    if (tile.right === leftEnd) {
      chain.unshift(tile);
      leftEnd = tile.left;
    } else {
      chain.unshift({ ...tile, left: tile.right, right: tile.left, id: tile.id });
      leftEnd = tile.right;
    }
    // Adjust spinner index since we unshifted
    if (spinnerIndex >= 0) spinnerIndex++;
  } else if (side === 'right') {
    if (tile.left === rightEnd) {
      chain.push(tile);
      rightEnd = tile.right;
    } else {
      chain.push({ ...tile, left: tile.right, right: tile.left, id: tile.id });
      rightEnd = tile.left;
    }
  } else if (side === 'top') {
    // Place on top branch of spinner
    const topEnd = chainTopEnd >= 0 ? chainTopEnd : spinnerValue;
    if (tile.left === topEnd) {
      topBranch.push(tile);
      chainTopEnd = tile.right;
    } else {
      topBranch.push({ ...tile, left: tile.right, right: tile.left, id: tile.id });
      chainTopEnd = tile.left;
    }
  } else if (side === 'bottom') {
    // Place on bottom branch of spinner
    const bottomEnd = chainBottomEnd >= 0 ? chainBottomEnd : spinnerValue;
    if (tile.left === bottomEnd) {
      bottomBranch.push(tile);
      chainBottomEnd = tile.right;
    } else {
      bottomBranch.push({ ...tile, left: tile.right, right: tile.left, id: tile.id });
      chainBottomEnd = tile.left;
    }
  }

  // If first double is placed in the main chain (not as first tile), it becomes spinner
  if (spinnerValue < 0 && tile.left === tile.right && chain.length > 1) {
    // Only the first double placed in the game becomes spinner
    const idx = chain.findIndex(t => t.id === tile.id);
    if (idx >= 0) {
      spinnerIndex = idx;
      spinnerValue = tile.left;
      topBranchOpen = true;
      bottomBranchOpen = true;
    }
  }

  const playerHand = who === 'player' ? state.playerHand.filter(t => t.id !== tile.id) : [...state.playerHand];
  const botHand = who === 'bot' ? state.botHand.filter(t => t.id !== tile.id) : [...state.botHand];
  const nextTurn = who === 'player' ? 'bot' : 'player';

  let ns: DominoGameState = {
    ...state, chain, chainLeftEnd: leftEnd, chainRightEnd: rightEnd,
    spinnerIndex, spinnerValue, chainTopEnd, chainBottomEnd,
    topBranch, bottomBranch, topBranchOpen, bottomBranchOpen,
    playerHand, botHand, currentTurn: nextTurn, consecutivePasses: 0,
    message: nextTurn === 'player' ? 'შენი სვლაა' : 'ბოტი ფიქრობს...',
    lastPlayedTileId: tile.id,
    isDrawing: false,
  };

  if (playerHand.length === 0) {
    ns = finishRound(ns, 'player', 'lastTile');
  } else if (botHand.length === 0) {
    ns = finishRound(ns, 'bot', 'lastTile');
  }

  return ns;
}

function finishRound(state: DominoGameState, winner: 'player' | 'bot', reason: 'lastTile' | 'block'): DominoGameState {
  const loserHand = winner === 'player' ? state.botHand : state.playerHand;
  const bonusPoints = handPoints(loserHand);

  const playerMatchScore = state.playerMatchScore + (winner === 'player' ? bonusPoints : 0);
  const botMatchScore = state.botMatchScore + (winner === 'bot' ? bonusPoints : 0);
  const target = state.matchConfig.targetScore;

  const matchWon = playerMatchScore >= target || botMatchScore >= target;
  const matchWinner = playerMatchScore >= target ? 'player' : botMatchScore >= target ? 'bot' : null;

  let message: string;
  if (matchWon) {
    message = matchWinner === 'player' ? '🏆 მოიგე მატჩი!' : '😔 ბოტმა მოიგო მატჩი';
  } else if (reason === 'block') {
    message = winner === 'player'
      ? `🔒 ჩაიხურა! შენ მოიგე +${bonusPoints}`
      : `🔒 ჩაიხურა! ბოტმა მოიგო +${bonusPoints}`;
  } else {
    message = winner === 'player'
      ? `🎉 რაუნდი მოგებულია! +${bonusPoints}`
      : `😔 ბოტმა მოიგო რაუნდი +${bonusPoints}`;
  }

  return {
    ...state,
    phase: matchWon ? 'matchEnd' : 'roundEnd',
    winner: matchWon ? matchWinner : winner,
    roundWinner: winner,
    playerRoundScore: winner === 'player' ? bonusPoints : 0,
    botRoundScore: winner === 'bot' ? bonusPoints : 0,
    playerMatchScore,
    botMatchScore,
    message,
    lastPlayedTileId: null,
  };
}

export function drawFromBoneyard(state: DominoGameState, who: 'player' | 'bot'): DominoGameState {
  if (state.boneyard.length === 0) return state;
  const boneyard = [...state.boneyard];
  const tile = boneyard.shift()!;
  return {
    ...state, boneyard,
    playerHand: who === 'player' ? [...state.playerHand, tile] : [...state.playerHand],
    botHand: who === 'bot' ? [...state.botHand, tile] : [...state.botHand],
    isDrawing: true,
  };
}

export function passTurn(state: DominoGameState, who: 'player' | 'bot'): DominoGameState {
  const passes = state.consecutivePasses + 1;
  const nextTurn = who === 'player' ? 'bot' : 'player';

  if (passes >= 2 && state.boneyard.length === 0) {
    const pP = handPoints(state.playerHand);
    const bP = handPoints(state.botHand);
    const roundWinner: 'player' | 'bot' = pP <= bP ? 'player' : 'bot';
    return finishRound({ ...state, consecutivePasses: passes }, roundWinner, 'block');
  }

  return {
    ...state,
    currentTurn: nextTurn,
    consecutivePasses: passes,
    message: nextTurn === 'player' ? 'შენი სვლაა' : 'ბოტი ფიქრობს...',
    lastPlayedTileId: null,
    isDrawing: false,
  };
}
