export interface DominoTile {
  left: number;
  right: number;
  id: string;
}

export interface DominoMatchConfig {
  targetScore: number;
  numPlayers: 2 | 3 | 4;
}

export const DEFAULT_MATCH_CONFIG: DominoMatchConfig = {
  targetScore: 100,
  numPlayers: 2,
};

export const TARGET_SCORE_OPTIONS = [50, 100, 150, 200];

export type PlacementSide = 'left' | 'right' | 'top' | 'bottom';

export interface DominoGameState {
  boneyard: DominoTile[];
  playerHand: DominoTile[];
  botHand: DominoTile[];
  chain: DominoTile[];
  chainLeftEnd: number;
  chainRightEnd: number;
  /** Spinner (first double) support: top/bottom branches */
  spinnerIndex: number; // index in chain of the spinner tile, -1 if none
  spinnerValue: number; // the double value (e.g. 4 for 4-4), -1 if none
  chainTopEnd: number;  // open end going up from spinner, -1 if not yet placed
  chainBottomEnd: number; // open end going down from spinner, -1 if not yet placed
  topBranch: DominoTile[];  // tiles placed above spinner
  bottomBranch: DominoTile[]; // tiles placed below spinner
  topBranchOpen: boolean;  // can still place on top
  bottomBranchOpen: boolean; // can still place on bottom
  currentTurn: 'player' | 'bot';
  phase: 'playing' | 'roundEnd' | 'matchEnd';
  winner: 'player' | 'bot' | 'draw' | null;
  message: string;
  consecutivePasses: number;
  playerRoundScore: number;
  botRoundScore: number;
  playerMatchScore: number;
  botMatchScore: number;
  roundNumber: number;
  roundWinner: 'player' | 'bot' | null;
  matchConfig: DominoMatchConfig;
  lastPlayedTileId: string | null;
  isDrawing: boolean;
}

/** Create all 28 standard tiles (0-0 to 6-6) */
export function createAllTiles(): DominoTile[] {
  const tiles: DominoTile[] = [];
  for (let i = 0; i <= 6; i++) {
    for (let j = i; j <= 6; j++) {
      tiles.push({ left: i, right: j, id: `${i}_${j}` });
    }
  }
  return tiles;
}

export function shuffleTiles(tiles: DominoTile[]): DominoTile[] {
  const t = [...tiles];
  for (let i = t.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [t[i], t[j]] = [t[j], t[i]];
  }
  return t;
}

/**
 * Check where a tile can be played.
 * Returns array of valid sides: 'left', 'right', 'top', 'bottom', or null if none.
 */
export function canPlayTile(
  tile: DominoTile,
  state: Pick<DominoGameState, 'chainLeftEnd' | 'chainRightEnd' | 'chainTopEnd' | 'chainBottomEnd' | 'spinnerValue' | 'topBranchOpen' | 'bottomBranchOpen' | 'chain' | 'topBranch' | 'bottomBranch'>
): PlacementSide[] {
  const { chainLeftEnd, chainRightEnd, chainTopEnd, chainBottomEnd, spinnerValue, topBranchOpen, bottomBranchOpen, chain } = state;
  
  if (chain.length === 0) return ['left']; // first tile

  const sides: PlacementSide[] = [];

  // Left end
  if (tile.left === chainLeftEnd || tile.right === chainLeftEnd) {
    sides.push('left');
  }
  // Right end
  if (tile.left === chainRightEnd || tile.right === chainRightEnd) {
    sides.push('right');
  }

  // Top/Bottom only available if spinner exists
  if (spinnerValue >= 0) {
    // Top branch
    if (topBranchOpen) {
      const topEnd = chainTopEnd >= 0 ? chainTopEnd : spinnerValue;
      if (tile.left === topEnd || tile.right === topEnd) {
        sides.push('top');
      }
    }
    // Bottom branch
    if (bottomBranchOpen) {
      const bottomEnd = chainBottomEnd >= 0 ? chainBottomEnd : spinnerValue;
      if (tile.left === bottomEnd || tile.right === bottomEnd) {
        sides.push('bottom');
      }
    }
  }

  return sides;
}

/**
 * Legacy-compatible wrapper: returns 'left' | 'right' | 'both' | null
 * For simple checks. Does NOT include top/bottom.
 */
export function canPlayTileSimple(tile: DominoTile, leftEnd: number, rightEnd: number, chainLen: number): 'left' | 'right' | 'both' | null {
  if (chainLen === 0) return 'left';
  const matchesLeft = tile.left === leftEnd || tile.right === leftEnd;
  const matchesRight = tile.left === rightEnd || tile.right === rightEnd;
  if (matchesLeft && matchesRight) return 'both';
  if (matchesLeft) return 'left';
  if (matchesRight) return 'right';
  return null;
}

export function getPlayableTiles(hand: DominoTile[], state: Pick<DominoGameState, 'chainLeftEnd' | 'chainRightEnd' | 'chainTopEnd' | 'chainBottomEnd' | 'spinnerValue' | 'topBranchOpen' | 'bottomBranchOpen' | 'chain' | 'topBranch' | 'bottomBranch'>): DominoTile[] {
  return hand.filter(t => canPlayTile(t, state).length > 0);
}

export function tilePoints(tile: DominoTile): number {
  return tile.left + tile.right;
}

export function handPoints(hand: DominoTile[]): number {
  return hand.reduce((s, t) => s + tilePoints(t), 0);
}

/** Find the highest double in hand, returns value or -1 */
export function findHighestDouble(hand: DominoTile[]): number {
  let highest = -1;
  for (const t of hand) {
    if (t.left === t.right && t.left > highest) highest = t.left;
  }
  return highest;
}

/** Find the highest tile (by pip sum, tie-break: higher max side) in hand */
export function findHighestTile(hand: DominoTile[]): DominoTile | null {
  if (hand.length === 0) return null;
  return hand.reduce((best, t) => {
    const bestSum = tilePoints(best);
    const tSum = tilePoints(t);
    if (tSum > bestSum) return t;
    if (tSum === bestSum && Math.max(t.left, t.right) > Math.max(best.left, best.right)) return t;
    return best;
  }, hand[0]);
}

/** Helper to extract the state subset needed for canPlayTile */
export function getPlayState(state: DominoGameState): Pick<DominoGameState, 'chainLeftEnd' | 'chainRightEnd' | 'chainTopEnd' | 'chainBottomEnd' | 'spinnerValue' | 'topBranchOpen' | 'bottomBranchOpen' | 'chain' | 'topBranch' | 'bottomBranch'> {
  return {
    chainLeftEnd: state.chainLeftEnd,
    chainRightEnd: state.chainRightEnd,
    chainTopEnd: state.chainTopEnd,
    chainBottomEnd: state.chainBottomEnd,
    spinnerValue: state.spinnerValue,
    topBranchOpen: state.topBranchOpen,
    bottomBranchOpen: state.bottomBranchOpen,
    chain: state.chain,
    topBranch: state.topBranch,
    bottomBranch: state.bottomBranch,
  };
}
