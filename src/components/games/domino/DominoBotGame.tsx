import { memo, useState, useCallback, useEffect, useRef } from 'react';
import { ArrowLeft, RotateCcw, Trophy, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BotDifficulty } from '../shared/types';
import {
  DominoGameState, DominoTile, DominoMatchConfig, DEFAULT_MATCH_CONFIG,
  TARGET_SCORE_OPTIONS, PlacementSide, getPlayableTiles, canPlayTile, getPlayState
} from './dominoTypes';
import { initDominoRound, placeTile, drawFromBoneyard, passTurn } from './dominoGameLogic';
import { getDominoBotMove, getDominoBotDelay, OpponentTracker, createOpponentTracker, trackOpponentPass } from './DominoBotAI';
import DominoTileView from './DominoTileView';
import DominoChainSnake from './DominoChainSnake';

const diffLabels: Record<BotDifficulty, string> = { easy: 'მარტივი', medium: 'საშუალო', hard: 'რთული' };

const sideLabels: Record<PlacementSide, string> = {
  left: '⬅ მარცხნივ',
  right: 'მარჯვნივ ➡',
  top: '⬆ ზემოთ',
  bottom: '⬇ ქვემოთ',
};

interface Props {
  difficulty: BotDifficulty;
  onBack: () => void;
}

const DominoBotGame = memo(function DominoBotGame({ difficulty, onBack }: Props) {
  const [config, setConfig] = useState<DominoMatchConfig>(DEFAULT_MATCH_CONFIG);
  const [game, setGame] = useState<DominoGameState | null>(null);
  const [sideChoice, setSideChoice] = useState<{ tile: DominoTile; sides: PlacementSide[] } | null>(null);
  const [showSetup, setShowSetup] = useState(true);
  const [opponentTracker, setOpponentTracker] = useState<OpponentTracker>(createOpponentTracker());
  const botTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => { if (botTimerRef.current) clearTimeout(botTimerRef.current); }, []);

  const startMatch = useCallback(() => {
    setShowSetup(false);
    setOpponentTracker(createOpponentTracker());
    setGame(initDominoRound(config));
  }, [config]);

  // Bot turn
  useEffect(() => {
    if (!game || game.currentTurn !== 'bot' || game.phase !== 'playing') return;
    botTimerRef.current = setTimeout(() => {
      setGame(prev => {
        if (!prev || prev.currentTurn !== 'bot' || prev.phase !== 'playing') return prev;
        let state = { ...prev };

        const ps = getPlayState(state);
        let playable = getPlayableTiles(state.botHand, ps);
        while (playable.length === 0 && state.boneyard.length > 0) {
          state = drawFromBoneyard(state, 'bot');
          playable = getPlayableTiles(state.botHand, getPlayState(state));
        }

        if (playable.length === 0) {
          return passTurn(state, 'bot');
        }

        const move = getDominoBotMove(difficulty, state.botHand, state, opponentTracker);
        if (!move) return passTurn(state, 'bot');
        return placeTile(state, move.tile, move.side, 'bot');
      });
    }, getDominoBotDelay(difficulty));
  }, [game?.currentTurn, game?.phase, difficulty]);

  const handleTileClick = useCallback((tile: DominoTile) => {
    if (!game || game.currentTurn !== 'player' || game.phase !== 'playing') return;
    const sides = canPlayTile(tile, getPlayState(game));
    if (sides.length === 0) return;
    if (sides.length === 1) {
      setGame(prev => prev ? placeTile(prev, tile, sides[0], 'player') : prev);
      return;
    }
    // Multiple sides available — let player choose
    setSideChoice({ tile, sides });
  }, [game]);

  const handleSideSelect = useCallback((side: PlacementSide) => {
    if (!sideChoice) return;
    setGame(prev => prev ? placeTile(prev, sideChoice.tile, side, 'player') : prev);
    setSideChoice(null);
  }, [sideChoice]);

  const handleDraw = useCallback(() => {
    if (!game || game.boneyard.length === 0 || game.currentTurn !== 'player' || game.phase !== 'playing') return;
    setGame(prev => {
      if (!prev) return prev;
      const newState = drawFromBoneyard(prev, 'player');
      const playable = getPlayableTiles(newState.playerHand, getPlayState(newState));
      if (playable.length > 0) {
        return { ...newState, message: `აიღე ქვა — ახლა ითამაშე! (ბაზარი: ${newState.boneyard.length})` };
      }
      return { ...newState, message: `აიღე ქვა — კიდევ აიღე (ბაზარი: ${newState.boneyard.length})` };
    });
  }, [game?.boneyard.length, game?.currentTurn, game?.phase]);

  const handlePass = useCallback(() => {
    if (!game) return;
    setOpponentTracker(prev => trackOpponentPass(prev, game));
    setGame(prev => prev ? passTurn(prev, 'player') : prev);
  }, [game]);

  const nextRound = useCallback(() => {
    if (!game) return;
    if (botTimerRef.current) clearTimeout(botTimerRef.current);
    setGame(initDominoRound(game.matchConfig, game.playerMatchScore, game.botMatchScore, game.roundNumber + 1, game.roundWinner));
    setSideChoice(null);
    setOpponentTracker(createOpponentTracker());
  }, [game]);

  const restartMatch = useCallback(() => {
    if (botTimerRef.current) clearTimeout(botTimerRef.current);
    setGame(initDominoRound(config));
    setSideChoice(null);
    setOpponentTracker(createOpponentTracker());
  }, [config]);

  // Setup screen
  if (showSetup) {
    return (
      <div className="fixed inset-0 z-[100] bg-stone-900 flex flex-col">
        <div className="flex-shrink-0 bg-stone-900/95 backdrop-blur-lg border-b border-amber-900/30">
          <div className="flex items-center gap-3 p-3">
            <Button variant="ghost" size="icon" className="text-amber-200 hover:bg-amber-900/30" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="font-bold text-base text-amber-100">დომინო — პარამეტრები</h1>
              <p className="text-xs text-amber-200/60">{diffLabels[difficulty]} ბოტი</p>
            </div>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-8">
          <div className="text-6xl">🎲</div>
          <div className="text-center space-y-3">
            <h2 className="font-bold text-lg text-amber-100">სამიზნე ქულა</h2>
            <div className="flex gap-2 flex-wrap justify-center">
              {TARGET_SCORE_OPTIONS.map(t => (
                <Button key={t}
                  variant={config.targetScore === t ? 'default' : 'outline'}
                  size="sm"
                  className={config.targetScore === t
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'border-amber-700 text-amber-200 hover:bg-amber-800/50'}
                  onClick={() => setConfig(c => ({ ...c, targetScore: t }))}
                >{t}</Button>
              ))}
            </div>
          </div>
          <Button className="px-10 py-3 bg-emerald-700 hover:bg-emerald-600 text-white text-base font-bold rounded-xl shadow-lg"
            onClick={startMatch}>
            🎲 თამაშის დაწყება
          </Button>
        </div>
      </div>
    );
  }

  if (!game) return null;

  const playState = getPlayState(game);
  const playable = getPlayableTiles(game.playerHand, playState);
  const canDrawFromMarket = playable.length === 0 && game.boneyard.length > 0 && game.currentTurn === 'player' && game.phase === 'playing';
  const canPass = playable.length === 0 && game.boneyard.length === 0 && game.currentTurn === 'player' && game.phase === 'playing';
  const isPlayerTurn = game.currentTurn === 'player' && game.phase === 'playing';

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-stone-900 overflow-hidden select-none">
      {/* Header */}
      <div className="flex-shrink-0 bg-stone-900/95 backdrop-blur-sm border-b border-amber-900/30">
        <div className="flex items-center gap-2 px-3 py-2">
          <Button variant="ghost" size="icon" className="text-amber-200 hover:bg-amber-900/30 w-9 h-9" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-sm text-amber-100 truncate">დომინო</h1>
            <p className="text-[10px] text-amber-200/50">
              {diffLabels[difficulty]} • R{game.roundNumber} • მიზანი: {game.matchConfig.targetScore}
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="text-center px-2 py-1 rounded-lg bg-emerald-900/30">
              <div className="text-[9px] text-emerald-300/70">შენ</div>
              <div className="font-bold text-emerald-400 text-sm">{game.playerMatchScore}</div>
            </div>
            <Trophy className="w-3.5 h-3.5 text-yellow-500" />
            <div className="text-center px-2 py-1 rounded-lg bg-red-900/30">
              <div className="text-[9px] text-red-300/70">ბოტი</div>
              <div className="font-bold text-red-400 text-sm">{game.botMatchScore}</div>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="text-amber-200 hover:bg-amber-900/30 w-9 h-9" onClick={restartMatch}>
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Bot hand */}
      <div className="flex-shrink-0 flex justify-center items-center gap-0.5 px-3 py-1.5 bg-stone-800/50">
        {game.botHand.map((_, i) => (
          <DominoTileView key={`bh_${i}`} tile={{ left: 0, right: 0, id: '' }} faceDown size="sm" />
        ))}
        <span className="text-[10px] text-amber-200/40 ml-1.5 font-medium">{game.botHand.length}</span>
      </div>

      {/* TABLE */}
      <div className="flex-1 mx-2 my-1 relative overflow-hidden">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-amber-800 via-amber-900 to-amber-950 p-[5px] shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
          <div className="w-full h-full rounded-[14px] bg-gradient-to-b from-amber-700 via-amber-800 to-amber-900 p-[3px]">
            <div className="w-full h-full rounded-[12px] bg-gradient-to-br from-emerald-700 via-emerald-800 to-emerald-900 shadow-[inset_0_2px_12px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden relative">
              <div className="absolute inset-0 opacity-[0.03]" style={{
                backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)',
                backgroundSize: '6px 6px'
              }} />

              <div className="absolute top-2 left-3 z-10 flex items-center gap-1.5">
                <div className="w-7 h-10 rounded-md bg-gradient-to-br from-stone-700 to-stone-800 border border-stone-600/40 flex items-center justify-center shadow-md">
                  <span className="text-amber-200/70 text-[10px] font-bold">{game.boneyard.length}</span>
                </div>
                <span className="text-[9px] text-emerald-200/30">ბაზარი</span>
              </div>

              <DominoChainSnake
                chain={game.chain}
                lastPlayedId={game.lastPlayedTileId}
                topBranch={game.topBranch}
                bottomBranch={game.bottomBranch}
                spinnerIndex={game.spinnerIndex}
              />

              <div className="absolute bottom-2 left-2 right-2 text-center z-10">
                <span className={`text-xs font-medium px-4 py-1.5 rounded-full inline-block backdrop-blur-sm ${
                  game.phase !== 'playing'
                    ? 'bg-yellow-500/25 text-yellow-100 border border-yellow-500/30'
                    : isPlayerTurn
                      ? 'bg-emerald-500/25 text-emerald-100 border border-emerald-500/30'
                      : 'bg-stone-500/25 text-stone-200 border border-stone-500/30'
                }`}>
                  {game.message}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls bar */}
      {(canDrawFromMarket || canPass || sideChoice || game.phase !== 'playing') && (
        <div className="flex-shrink-0 flex justify-center gap-2 px-3 py-2 bg-stone-800/50 flex-wrap">
          {canDrawFromMarket && (
            <Button size="sm" className="text-xs bg-amber-700 hover:bg-amber-600 text-white gap-1.5 h-10 px-4 rounded-xl shadow-md"
              onClick={handleDraw}>
              <ShoppingCart className="w-4 h-4" />
              ბაზარი ({game.boneyard.length})
            </Button>
          )}
          {canPass && (
            <Button size="sm" variant="outline"
              className="text-xs border-red-700 text-red-300 hover:bg-red-900/40 h-10 px-4 rounded-xl"
              onClick={handlePass}>
              ❌ პასი
            </Button>
          )}
          {sideChoice && (
            <div className="flex gap-2 items-center flex-wrap justify-center">
              <span className="text-amber-200/60 text-xs">სად დადო?</span>
              {sideChoice.sides.map(side => (
                <Button key={side} size="sm" className="text-xs bg-blue-700 hover:bg-blue-600 text-white h-10 px-3 rounded-xl"
                  onClick={() => handleSideSelect(side)}>
                  {sideLabels[side]}
                </Button>
              ))}
              <Button size="sm" variant="ghost" className="text-xs text-amber-200/50 h-10" onClick={() => setSideChoice(null)}>
                გაუქმება
              </Button>
            </div>
          )}
          {game.phase === 'roundEnd' && (
            <Button size="sm" className="bg-yellow-600 hover:bg-yellow-500 text-white h-10 px-6 rounded-xl font-bold shadow-md"
              onClick={nextRound}>შემდეგი რაუნდი ➡</Button>
          )}
          {game.phase === 'matchEnd' && (
            <Button size="sm" className="bg-yellow-600 hover:bg-yellow-500 text-white gap-1.5 h-10 px-6 rounded-xl font-bold shadow-md"
              onClick={restartMatch}>
              <RotateCcw className="w-4 h-4" />ახალი მატჩი
            </Button>
          )}
        </div>
      )}

      {/* Player hand */}
      <div className="flex-shrink-0 bg-gradient-to-t from-amber-950 via-amber-900 to-amber-800 border-t-2 border-amber-600/40 px-2 pb-4 pt-3"
        style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
        <div className="flex justify-center gap-1.5 flex-wrap">
          {game.playerHand.map(t => {
            const isPlay = playable.some(p => p.id === t.id) && isPlayerTurn;
            return (
              <DominoTileView
                key={t.id}
                tile={t}
                size="md"
                highlight={isPlay}
                onClick={isPlay ? () => handleTileClick(t) : undefined}
                disabled={!isPlay && game.phase === 'playing'}
              />
            );
          })}
        </div>
        {isPlayerTurn && playable.length > 0 && (
          <div className="text-center mt-1.5">
            <span className="text-[10px] text-amber-200/40">აირჩიე ქვა ({playable.length} შესაძლებელი)</span>
          </div>
        )}
      </div>
    </div>
  );
});

export default DominoBotGame;
