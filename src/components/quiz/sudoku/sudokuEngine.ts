// Sudoku puzzle generator & solver — lightweight, no dependencies

export type Board = number[][]; // 9x9, 0 = empty
export type PencilMarks = Record<string, number[]>; // "r,c" → marks

export type Difficulty = 'easy' | 'medium' | 'hard';

const CLUE_RANGES: Record<Difficulty, [number, number]> = {
  easy: [40, 45],
  medium: [30, 35],
  hard: [22, 28],
};

// --- helpers ---
const rand = (n: number) => Math.floor(Math.random() * n);
const shuffle = <T,>(a: T[]): T[] => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const emptyBoard = (): Board =>
  Array.from({ length: 9 }, () => Array(9).fill(0));

export const cloneBoard = (b: Board): Board => b.map(r => [...r]);

// Check if placing `num` at (r,c) is valid
export function isValid(board: Board, r: number, c: number, num: number): boolean {
  for (let i = 0; i < 9; i++) {
    if (board[r][i] === num) return false;
    if (board[i][c] === num) return false;
  }
  const br = Math.floor(r / 3) * 3;
  const bc = Math.floor(c / 3) * 3;
  for (let i = br; i < br + 3; i++)
    for (let j = bc; j < bc + 3; j++)
      if (board[i][j] === num) return false;
  return true;
}

// Backtracking solver — returns true if solved in-place, counts solutions up to `limit`
function solve(board: Board, limit = 1): number {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] !== 0) continue;
      const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      let count = 0;
      for (const n of nums) {
        if (!isValid(board, r, c, n)) continue;
        board[r][c] = n;
        count += solve(board, limit - count);
        if (count >= limit) return count;
        board[r][c] = 0;
      }
      return count;
    }
  }
  return 1; // board full
}

// Generate a fully solved board
function generateSolution(): Board {
  const board = emptyBoard();
  solve(board, 1);
  return board;
}

// Remove clues to create puzzle with unique solution
export function generatePuzzle(difficulty: Difficulty): { puzzle: Board; solution: Board } {
  const solution = generateSolution();
  const puzzle = cloneBoard(solution);
  const [minClues, maxClues] = CLUE_RANGES[difficulty];
  const targetClues = minClues + rand(maxClues - minClues + 1);
  const targetRemove = 81 - targetClues;

  const positions = shuffle(
    Array.from({ length: 81 }, (_, i) => [Math.floor(i / 9), i % 9] as [number, number])
  );

  let removed = 0;
  for (const [r, c] of positions) {
    if (removed >= targetRemove) break;
    const val = puzzle[r][c];
    if (val === 0) continue;
    puzzle[r][c] = 0;
    // Check unique solution
    const test = cloneBoard(puzzle);
    if (solve(test, 2) !== 1) {
      puzzle[r][c] = val; // restore
    } else {
      removed++;
    }
  }

  return { puzzle, solution };
}

// Check if the board is complete and correct
export function isBoardComplete(board: Board, solution: Board): boolean {
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (board[r][c] !== solution[r][c]) return false;
  return true;
}

// Find conflicts for a cell
export function getCellConflicts(board: Board, r: number, c: number): [number, number][] {
  const val = board[r][c];
  if (val === 0) return [];
  const conflicts: [number, number][] = [];
  for (let i = 0; i < 9; i++) {
    if (i !== c && board[r][i] === val) conflicts.push([r, i]);
    if (i !== r && board[i][c] === val) conflicts.push([i, c]);
  }
  const br = Math.floor(r / 3) * 3;
  const bc = Math.floor(c / 3) * 3;
  for (let i = br; i < br + 3; i++)
    for (let j = bc; j < bc + 3; j++)
      if ((i !== r || j !== c) && board[i][j] === val) conflicts.push([i, j]);
  return conflicts;
}

// Scoring
export function calculateScore(difficulty: Difficulty, elapsedSeconds: number, hintsUsed: number, errors: number): number {
  const base: Record<Difficulty, number> = { easy: 100, medium: 250, hard: 500 };
  let score = base[difficulty];

  // Time bonus — faster = more points
  const timeLimits: Record<Difficulty, number> = { easy: 600, medium: 1200, hard: 2400 };
  const timeRatio = Math.max(0, 1 - elapsedSeconds / timeLimits[difficulty]);
  score += Math.floor(timeRatio * base[difficulty]);

  // Penalty
  score -= hintsUsed * 15;
  score -= errors * 5;

  // No-hint bonus
  if (hintsUsed === 0) score += 50;

  return Math.max(10, score);
}
