import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { ArrowLeft, Pause, Play, RotateCcw, Lightbulb, CheckCircle, Pencil, Eraser, Undo2, Redo2, Trophy, Clock, Star, Grid3X3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Board, PencilMarks, Difficulty,
  generatePuzzle, cloneBoard, isBoardComplete,
  getCellConflicts, calculateScore, isValid
} from './sudokuEngine';
import confetti from 'canvas-confetti';

interface SudokuGameProps {
  onBack: () => void;
}

interface GameState {
  puzzle: Board;
  solution: Board;
  current: Board;
  pencilMarks: PencilMarks;
  difficulty: Difficulty;
  elapsed: number;
  hintsUsed: number;
  errors: number;
  history: Board[];
  historyIndex: number;
  selectedCell: [number, number] | null;
  pencilMode: boolean;
  paused: boolean;
  completed: boolean;
  score: number;
  gameId: string | null;
}

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'მარტივი',
  medium: 'საშუალო',
  hard: 'რთული',
};

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  easy: 'from-green-500 to-emerald-600',
  medium: 'from-amber-500 to-orange-600',
  hard: 'from-red-500 to-rose-600',
};

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
};

const SudokuGame = memo(function SudokuGame({ onBack }: SudokuGameProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [gameState, setGameState] = useState<'menu' | 'playing' | 'result'>('menu');
  const [game, setGame] = useState<GameState | null>(null);
  const [bestScores, setBestScores] = useState<Record<Difficulty, { time: number; score: number; wins: number }>>({
    easy: { time: 0, score: 0, wins: 0 },
    medium: { time: 0, score: 0, wins: 0 },
    hard: { time: 0, score: 0, wins: 0 },
  });
  const [resumeAvailable, setResumeAvailable] = useState<{ difficulty: Difficulty; id: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const saveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load best scores & check for resumable game
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [scoresRes, activeRes] = await Promise.all([
        supabase.from('sudoku_best_scores').select('*').eq('user_id', user.id),
        supabase.from('sudoku_games').select('id, difficulty').eq('user_id', user.id).eq('status', 'playing').order('updated_at', { ascending: false }).limit(1),
      ]);
      if (scoresRes.data) {
        const s = { ...bestScores };
        scoresRes.data.forEach((r: any) => {
          s[r.difficulty as Difficulty] = { time: r.best_time_seconds, score: r.best_score, wins: r.total_wins };
        });
        setBestScores(s);
      }
      if (activeRes.data && activeRes.data.length > 0) {
        setResumeAvailable({ difficulty: activeRes.data[0].difficulty as Difficulty, id: activeRes.data[0].id });
      }
    };
    load();
  }, [user]);

  // Timer
  useEffect(() => {
    if (gameState !== 'playing' || !game || game.paused || game.completed) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setGame(prev => prev ? { ...prev, elapsed: prev.elapsed + 1 } : prev);
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState, game?.paused, game?.completed]);

  // Auto-save every 10 seconds
  useEffect(() => {
    if (!game || !game.gameId || game.completed || gameState !== 'playing') return;
    saveRef.current = setTimeout(() => saveGame(game), 10000);
    return () => { if (saveRef.current) clearTimeout(saveRef.current); };
  }, [game?.elapsed, game?.current]);

  const saveGame = async (g: GameState) => {
    if (!g.gameId || !user) return;
    await supabase.from('sudoku_games').update({
      current_state: g.current as any,
      pencil_marks: g.pencilMarks as any,
      hints_used: g.hintsUsed,
      errors: g.errors,
      elapsed_seconds: g.elapsed,
      updated_at: new Date().toISOString(),
    }).eq('id', g.gameId);
  };

  const startNewGame = async (difficulty: Difficulty) => {
    if (!user) return;
    setLoading(true);
    const { puzzle, solution } = generatePuzzle(difficulty);

    const { data } = await supabase.from('sudoku_games').insert({
      user_id: user.id,
      difficulty,
      puzzle: puzzle as any,
      solution: solution as any,
      current_state: puzzle as any,
    }).select('id').single();

    setGame({
      puzzle, solution, current: cloneBoard(puzzle),
      pencilMarks: {}, difficulty, elapsed: 0,
      hintsUsed: 0, errors: 0,
      history: [cloneBoard(puzzle)], historyIndex: 0,
      selectedCell: null, pencilMode: false,
      paused: false, completed: false, score: 0,
      gameId: data?.id ?? null,
    });
    setGameState('playing');
    setLoading(false);
  };

  const resumeGame = async () => {
    if (!resumeAvailable || !user) return;
    setLoading(true);
    const { data } = await supabase.from('sudoku_games')
      .select('*').eq('id', resumeAvailable.id).single();
    if (!data) { setLoading(false); return; }

    const puzzle = data.puzzle as unknown as Board;
    const solution = data.solution as unknown as Board;
    const current = data.current_state as unknown as Board;
    const pencilMarks = (data.pencil_marks as unknown as PencilMarks) || {};

    setGame({
      puzzle, solution, current,
      pencilMarks,
      difficulty: data.difficulty as Difficulty,
      elapsed: data.elapsed_seconds || 0,
      hintsUsed: data.hints_used || 0,
      errors: data.errors || 0,
      history: [cloneBoard(current)], historyIndex: 0,
      selectedCell: null, pencilMode: false,
      paused: false, completed: false, score: 0,
      gameId: data.id,
    });
    setGameState('playing');
    setLoading(false);
  };

  const pushHistory = (board: Board, g: GameState): GameState => {
    const newHistory = g.history.slice(0, g.historyIndex + 1);
    newHistory.push(cloneBoard(board));
    return { ...g, history: newHistory, historyIndex: newHistory.length - 1 };
  };

  const handleCellSelect = useCallback((r: number, c: number) => {
    setGame(prev => prev ? { ...prev, selectedCell: [r, c] } : prev);
  }, []);

  const handleNumberInput = useCallback((num: number) => {
    setGame(prev => {
      if (!prev || !prev.selectedCell || prev.completed || prev.paused) return prev;
      const [r, c] = prev.selectedCell;
      if (prev.puzzle[r][c] !== 0) return prev; // fixed cell

      if (prev.pencilMode) {
        const key = `${r},${c}`;
        const marks = { ...prev.pencilMarks };
        const current = marks[key] ? [...marks[key]] : [];
        const idx = current.indexOf(num);
        if (idx >= 0) current.splice(idx, 1);
        else current.push(num);
        marks[key] = current;
        return { ...prev, pencilMarks: marks };
      }

      const newBoard = cloneBoard(prev.current);
      newBoard[r][c] = num;

      // Check for conflicts
      const conflicts = getCellConflicts(newBoard, r, c);
      let errors = prev.errors;
      if (conflicts.length > 0) errors++;

      // Clear pencil marks for this cell
      const marks = { ...prev.pencilMarks };
      delete marks[`${r},${c}`];

      let updated = { ...prev, current: newBoard, pencilMarks: marks, errors };
      updated = pushHistory(newBoard, updated);

      // Check win
      if (isBoardComplete(newBoard, prev.solution)) {
        const score = calculateScore(prev.difficulty, prev.elapsed, prev.hintsUsed, errors);
        updated.completed = true;
        updated.score = score;
        // Trigger win
        setTimeout(() => handleWin(score, prev.difficulty, prev.elapsed, prev.hintsUsed, prev.gameId), 100);
      }

      return updated;
    });
  }, []);

  const handleErase = useCallback(() => {
    setGame(prev => {
      if (!prev || !prev.selectedCell || prev.completed || prev.paused) return prev;
      const [r, c] = prev.selectedCell;
      if (prev.puzzle[r][c] !== 0) return prev;
      const newBoard = cloneBoard(prev.current);
      newBoard[r][c] = 0;
      const marks = { ...prev.pencilMarks };
      delete marks[`${r},${c}`];
      let updated = { ...prev, current: newBoard, pencilMarks: marks };
      return pushHistory(newBoard, updated);
    });
  }, []);

  const handleUndo = useCallback(() => {
    setGame(prev => {
      if (!prev || prev.historyIndex <= 0) return prev;
      const newIdx = prev.historyIndex - 1;
      return { ...prev, current: cloneBoard(prev.history[newIdx]), historyIndex: newIdx };
    });
  }, []);

  const handleRedo = useCallback(() => {
    setGame(prev => {
      if (!prev || prev.historyIndex >= prev.history.length - 1) return prev;
      const newIdx = prev.historyIndex + 1;
      return { ...prev, current: cloneBoard(prev.history[newIdx]), historyIndex: newIdx };
    });
  }, []);

  const handleHint = useCallback(() => {
    setGame(prev => {
      if (!prev || prev.completed || prev.paused) return prev;
      // Find an empty or wrong cell
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (prev.current[r][c] !== prev.solution[r][c] && prev.puzzle[r][c] === 0) {
            const newBoard = cloneBoard(prev.current);
            newBoard[r][c] = prev.solution[r][c];
            const marks = { ...prev.pencilMarks };
            delete marks[`${r},${c}`];
            let updated = {
              ...prev, current: newBoard, pencilMarks: marks,
              hintsUsed: prev.hintsUsed + 1, selectedCell: [r, c] as [number, number]
            };
            updated = pushHistory(newBoard, updated);
            if (isBoardComplete(newBoard, prev.solution)) {
              const score = calculateScore(prev.difficulty, prev.elapsed, updated.hintsUsed, prev.errors);
              updated.completed = true;
              updated.score = score;
              setTimeout(() => handleWin(score, prev.difficulty, prev.elapsed, updated.hintsUsed, prev.gameId), 100);
            }
            return updated;
          }
        }
      }
      return prev;
    });
  }, []);

  const handleWin = async (score: number, difficulty: Difficulty, elapsed: number, hints: number, gameId: string | null) => {
    confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });

    if (gameId) {
      await supabase.from('sudoku_games').update({
        status: 'completed',
        score,
        elapsed_seconds: elapsed,
        hints_used: hints,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', gameId);
    }

    if (user) {
      // Upsert best score
      const { data: existing } = await supabase.from('sudoku_best_scores')
        .select('*').eq('user_id', user.id).eq('difficulty', difficulty).maybeSingle();
      
      if (existing) {
        await supabase.from('sudoku_best_scores').update({
          best_time_seconds: Math.min(existing.best_time_seconds, elapsed),
          best_score: Math.max(existing.best_score, score),
          total_wins: (existing.total_wins || 0) + 1,
          updated_at: new Date().toISOString(),
        }).eq('id', existing.id);
      } else {
        await supabase.from('sudoku_best_scores').insert({
          user_id: user.id,
          difficulty,
          best_time_seconds: elapsed,
          best_score: score,
        });
      }

      // Award wallet points
      try {
        const pts = difficulty === 'easy' ? 5 : difficulty === 'medium' ? 10 : 20;
        await supabase.rpc('add_points_to_wallet' as any, { p_user_id: user.id, p_points: pts });
      } catch {}
    }

    setGameState('result');
  };

  // --- MENU ---
  if (gameState === 'menu') {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border/40">
          <div className="flex items-center gap-3 p-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Grid3X3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">სუდოკუ</h1>
              <p className="text-xs text-muted-foreground">აირჩიე სირთულე</p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {resumeAvailable && (
            <Card className="border-primary/40 bg-primary/5 cursor-pointer hover:scale-[1.01] transition-transform active:scale-[0.99]" onClick={resumeGame}>
              <CardContent className="p-4 flex items-center gap-3">
                <Play className="w-6 h-6 text-primary" />
                <div>
                  <p className="font-bold text-sm">გაგრძელება</p>
                  <p className="text-xs text-muted-foreground">{DIFFICULTY_LABELS[resumeAvailable.difficulty]}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
            <Card
              key={d}
              className="cursor-pointer hover:scale-[1.01] transition-transform active:scale-[0.99] overflow-hidden"
              onClick={() => !loading && startNewGame(d)}
            >
              <div className="flex items-center gap-4 p-4">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${DIFFICULTY_COLORS[d]} flex items-center justify-center flex-shrink-0`}>
                  <Grid3X3 className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base">{DIFFICULTY_LABELS[d]}</h3>
                  <p className="text-xs text-muted-foreground">
                    {d === 'easy' ? '40-45 ციფრი' : d === 'medium' ? '30-35 ციფრი' : '22-28 ციფრი'}
                  </p>
                  {bestScores[d].wins > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      🏆 {bestScores[d].wins} მოგება • ⏱ {formatTime(bestScores[d].time)} • ⭐ {bestScores[d].score}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // --- RESULT ---
  if (gameState === 'result' && game) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm">
          <Card className="text-center">
            <CardContent className="p-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center mx-auto">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-bold">🎉 დასრულებულია!</h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-muted/50 rounded-lg p-3">
                  <Clock className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="font-bold">{formatTime(game.elapsed)}</p>
                  <p className="text-xs text-muted-foreground">დრო</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <Star className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="font-bold">{game.score}</p>
                  <p className="text-xs text-muted-foreground">ქულა</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <Lightbulb className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="font-bold">{game.hintsUsed}</p>
                  <p className="text-xs text-muted-foreground">მინიშნება</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="font-bold text-lg">{DIFFICULTY_LABELS[game.difficulty]}</p>
                  <p className="text-xs text-muted-foreground">სირთულე</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => { setGameState('menu'); setGame(null); setResumeAvailable(null); }}>
                  მენიუ
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => { setGame(null); startNewGame(game.difficulty); }}>
                  ახალი თამაში
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // --- PLAYING ---
  if (!game) return null;

  const { puzzle, solution, current, selectedCell, pencilMode, paused, pencilMarks, elapsed, hintsUsed, errors, difficulty, completed } = game;

  // Determine highlighted cells
  const highlightSet = new Set<string>();
  const conflictSet = new Set<string>();
  const sameNumberSet = new Set<string>();
  if (selectedCell) {
    const [sr, sc] = selectedCell;
    for (let i = 0; i < 9; i++) {
      highlightSet.add(`${sr},${i}`);
      highlightSet.add(`${i},${sc}`);
    }
    const br = Math.floor(sr / 3) * 3;
    const bc = Math.floor(sc / 3) * 3;
    for (let i = br; i < br + 3; i++)
      for (let j = bc; j < bc + 3; j++)
        highlightSet.add(`${i},${j}`);

    // Same number highlight
    const val = current[sr][sc];
    if (val !== 0) {
      for (let r = 0; r < 9; r++)
        for (let c = 0; c < 9; c++)
          if (current[r][c] === val) sameNumberSet.add(`${r},${c}`);
    }

    // Conflicts
    if (val !== 0) {
      getCellConflicts(current, sr, sc).forEach(([r, c]) => conflictSet.add(`${r},${c}`));
      if (conflictSet.size > 0) conflictSet.add(`${sr},${sc}`);
    }
  }

  return (
    <div className="h-dvh bg-background flex flex-col overflow-hidden">
      {/* Header - compact */}
      <div className="z-10 bg-background/80 backdrop-blur-lg border-b border-border/40 flex-shrink-0">
        <div className="flex items-center justify-between px-3 py-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { saveGame(game); onBack(); }}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2 text-sm">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium bg-gradient-to-r ${DIFFICULTY_COLORS[difficulty]} text-white`}>
              {DIFFICULTY_LABELS[difficulty]}
            </span>
            <span className="font-mono font-bold text-sm">{formatTime(elapsed)}</span>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setGame(prev => prev ? { ...prev, paused: !prev.paused } : prev)}>
            {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Pause overlay */}
      <AnimatePresence>
        {paused && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-20 bg-background/95 flex items-center justify-center"
          >
            <div className="text-center space-y-4">
              <Pause className="w-12 h-12 mx-auto text-muted-foreground" />
              <p className="text-lg font-bold">პაუზა</p>
              <Button onClick={() => setGame(prev => prev ? { ...prev, paused: false } : prev)}>
                <Play className="w-4 h-4 mr-2" /> გაგრძელება
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Board + Controls - fill remaining space without scroll */}
      <div className="flex-1 flex flex-col items-center gap-2 px-2 py-2 min-h-0">
        {/* Grid - dynamically sized */}
        <div className="w-full max-w-[min(92vw,400px)] flex-shrink-0" style={{ padding: '0 2px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gridTemplateRows: 'repeat(9, 1fr)', border: '3px solid hsl(var(--foreground))', borderRadius: '0.5rem', width: '100%', aspectRatio: '1 / 1' }}>
              {Array.from({ length: 81 }, (_, idx) => {
                const r = Math.floor(idx / 9);
                const c = idx % 9;
                const val = current[r][c];
                const isFixed = puzzle[r][c] !== 0;
                const isSelected = selectedCell?.[0] === r && selectedCell?.[1] === c;
                const isHighlight = highlightSet.has(`${r},${c}`);
                const isConflict = conflictSet.has(`${r},${c}`);
                const isSameNum = sameNumberSet.has(`${r},${c}`) && !isSelected;
                const marks = pencilMarks[`${r},${c}`] || [];

                // Inline border styles for guaranteed visibility
                const borderStyle: React.CSSProperties = {
                  borderRight: c < 8 ? ((c + 1) % 3 === 0 ? '3px solid hsl(var(--foreground))' : '1px solid hsl(var(--foreground) / 0.4)') : 'none',
                  borderBottom: r < 8 ? ((r + 1) % 3 === 0 ? '3px solid hsl(var(--foreground))' : '1px solid hsl(var(--foreground) / 0.4)') : 'none',
                };

                let bg = 'bg-background';
                if (isSelected) bg = 'bg-primary/20';
                else if (isConflict) bg = 'bg-red-500/15';
                else if (isSameNum) bg = 'bg-primary/10';
                else if (isHighlight) bg = 'bg-muted/50';

                return (
                  <button
                    key={idx}
                    className={`relative flex items-center justify-center ${bg} select-none touch-manipulation`}
                    style={borderStyle}
                    onClick={() => handleCellSelect(r, c)}
                    aria-label={`Row ${r + 1} Col ${c + 1}`}
                  >
                    {val !== 0 ? (
                      <span className={`text-[clamp(12px,3.8vw,20px)] leading-none font-bold ${isFixed ? 'text-foreground' : isConflict ? 'text-red-500' : 'text-primary'}`}>
                        {val}
                      </span>
                    ) : marks.length > 0 ? (
                      <div className="grid grid-cols-3 grid-rows-3 w-full h-full p-[1px]">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                          <span key={n} className="text-[clamp(5px,1.3vw,8px)] flex items-center justify-center text-muted-foreground/70 leading-none">
                            {marks.includes(n) ? n : ''}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {completed && val !== 0 && (
                      <motion.div
                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                        transition={{ delay: idx * 0.005 }}
                        className="absolute inset-0 bg-primary/5 pointer-events-none"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

        {/* Controls - fixed at bottom, compact */}
        <div className="w-full max-w-[min(92vw,400px)] flex-shrink-0 space-y-1.5 pt-1">
          {/* Tool buttons */}
          <div className="flex justify-center gap-1.5">
            <ToolBtn icon={Undo2} label="უკან" onClick={handleUndo} disabled={game.historyIndex <= 0} />
            <ToolBtn icon={Redo2} label="წინ" onClick={handleRedo} disabled={game.historyIndex >= game.history.length - 1} />
            <ToolBtn icon={Eraser} label="წაშლა" onClick={handleErase} />
            <ToolBtn
              icon={Pencil} label="ფანქარი" onClick={() => setGame(prev => prev ? { ...prev, pencilMode: !prev.pencilMode } : prev)}
              active={pencilMode}
            />
            <ToolBtn icon={Lightbulb} label="მინიშნ." onClick={handleHint} />
            <ToolBtn icon={RotateCcw} label="თავიდან" onClick={() => {
              if (!game) return;
              const fresh = cloneBoard(puzzle);
              setGame({ ...game, current: fresh, pencilMarks: {}, history: [cloneBoard(fresh)], historyIndex: 0, hintsUsed: 0, errors: 0 });
            }} />
          </div>

          {/* Number pad */}
          <div className="grid grid-cols-9 gap-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => {
              let count = 0;
              for (let r = 0; r < 9; r++)
                for (let c = 0; c < 9; c++)
                  if (current[r][c] === n) count++;
              const full = count >= 9;
              return (
                <button
                  key={n}
                  disabled={full || completed}
                  onClick={() => handleNumberInput(n)}
                  className={`h-11 rounded-lg font-bold text-base transition-all active:scale-90 select-none touch-manipulation
                    ${full ? 'bg-muted/30 text-muted-foreground/30' : 'bg-primary/10 text-primary hover:bg-primary/20 active:bg-primary/30'}`}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
});

// Tool button component
function ToolBtn({ icon: Icon, label, onClick, disabled, active }: {
  icon: any; label: string; onClick: () => void; disabled?: boolean; active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg text-xs transition-all active:scale-90 select-none touch-manipulation
        ${active ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-muted/50'}
        ${disabled ? 'opacity-30 pointer-events-none' : ''}`}
    >
      <Icon className="w-5 h-5" />
      <span className="text-[10px] leading-none">{label}</span>
    </button>
  );
}

export default SudokuGame;
