import { DominoTile, DominoGameState, PlacementSide, canPlayTile, getPlayableTiles, getPlayState, tilePoints } from './dominoTypes';
import { BotDifficulty } from '../shared/types';

export interface BotDominoMove {
  tile: DominoTile;
  side: PlacementSide;
}

/** Track what numbers the opponent has passed on (couldn't play) */
export interface OpponentTracker {
  passedOnEnds: number[];
}

export function createOpponentTracker(): OpponentTracker {
  return { passedOnEnds: [] };
}

export function trackOpponentPass(tracker: OpponentTracker, state: DominoGameState): OpponentTracker {
  const newEnds = [...tracker.passedOnEnds];
  const ends = [state.chainLeftEnd, state.chainRightEnd];
  if (state.spinnerValue >= 0) {
    if (state.topBranchOpen) ends.push(state.chainTopEnd >= 0 ? state.chainTopEnd : state.spinnerValue);
    if (state.bottomBranchOpen) ends.push(state.chainBottomEnd >= 0 ? state.chainBottomEnd : state.spinnerValue);
  }
  for (const e of ends) {
    if (e >= 0 && !newEnds.includes(e)) newEnds.push(e);
  }
  return { passedOnEnds: newEnds };
}

function getEndForSide(tile: DominoTile, side: PlacementSide, state: DominoGameState): number {
  if (side === 'left') {
    return tile.right === state.chainLeftEnd ? tile.left : tile.right;
  } else if (side === 'right') {
    return tile.left === state.chainRightEnd ? tile.right : tile.left;
  } else if (side === 'top') {
    const topEnd = state.chainTopEnd >= 0 ? state.chainTopEnd : state.spinnerValue;
    return tile.left === topEnd ? tile.right : tile.left;
  } else {
    const bottomEnd = state.chainBottomEnd >= 0 ? state.chainBottomEnd : state.spinnerValue;
    return tile.left === bottomEnd ? tile.right : tile.left;
  }
}

export function getDominoBotMove(
  difficulty: BotDifficulty,
  hand: DominoTile[],
  state: DominoGameState,
  tracker?: OpponentTracker
): BotDominoMove | null {
  const playState = getPlayState(state);
  const playable = getPlayableTiles(hand, playState);
  if (playable.length === 0) return null;

  // Get all valid (tile, side) pairs
  const allMoves: BotDominoMove[] = [];
  for (const tile of playable) {
    const sides = canPlayTile(tile, playState);
    for (const side of sides) {
      allMoves.push({ tile, side });
    }
  }
  if (allMoves.length === 0) return null;

  switch (difficulty) {
    case 'easy': {
      return allMoves[Math.floor(Math.random() * allMoves.length)];
    }

    case 'medium': {
      const counts: Record<number, number> = {};
      hand.forEach(t => {
        counts[t.left] = (counts[t.left] || 0) + 1;
        counts[t.right] = (counts[t.right] || 0) + 1;
      });

      let best = allMoves[0];
      let bestScore = -Infinity;

      for (const move of allMoves) {
        let score = tilePoints(move.tile) * 3;
        if (move.tile.left === move.tile.right) score += 8;
        const newEnd = getEndForSide(move.tile, move.side, state);
        score += (counts[newEnd] || 0) * 2;
        if (score > bestScore) { bestScore = score; best = move; }
      }
      return best;
    }

    case 'hard': {
      const counts: Record<number, number> = {};
      hand.forEach(t => {
        counts[t.left] = (counts[t.left] || 0) + 1;
        counts[t.right] = (counts[t.right] || 0) + 1;
      });
      const passedOn = tracker?.passedOnEnds || [];

      let best = allMoves[0];
      let bestScore = -Infinity;

      for (const move of allMoves) {
        let score = tilePoints(move.tile) * 2;
        if (move.tile.left === move.tile.right) score += 10;
        const newEnd = getEndForSide(move.tile, move.side, state);
        score += (counts[newEnd] || 0) * 3;
        if (passedOn.includes(newEnd)) score += 15;
        if ((counts[newEnd] || 0) === 0) score -= 5;
        if (score > bestScore) { bestScore = score; best = move; }
      }
      return best;
    }
  }
}

export function getDominoBotDelay(difficulty: BotDifficulty): number {
  const delays: Record<BotDifficulty, [number, number]> = {
    easy: [700, 1100], medium: [500, 900], hard: [500, 1100]
  };
  const [min, max] = delays[difficulty];
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
