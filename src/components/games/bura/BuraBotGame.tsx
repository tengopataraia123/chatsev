import { memo, useState, useCallback, useEffect, useRef } from 'react';
import { ArrowLeft, RotateCcw, Bot, Flame, Volume2, VolumeX, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BotDifficulty } from '../shared/types';
import { BuraGameState, BuraCard, SUIT_SYMBOLS, SUIT_COLORS, RANK_ORDER, DAVI_LADDER, DAVI_POINTS } from './buraTypes';
import {
  initBuraRound, determineTrickWinner, getCardPoints,
  drawCards, checkRoundOver, isLegalAttack, declareThirtyOne
} from './buraGameLogic';
import { getBuraBotCards, getBuraBotDelay, botRespondToDavi, botShouldProposeDavi, botShouldDeclare31 } from './BuraBotAI';
import { motion, AnimatePresence } from 'framer-motion';

const diffLabels: Record<BotDifficulty, string> = { easy: 'მარტივი', medium: 'საშუალო', hard: 'რთული' };

interface Props {
  difficulty: BotDifficulty;
  onBack: () => void;
}

const BuraBotGame = memo(function BuraBotGame({ difficulty, onBack }: Props) {
  const [game, setGame] = useState<BuraGameState>(() => initBuraRound());
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [showTrickResult, setShowTrickResult] = useState<string | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const botTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => { if (botTimerRef.current) clearTimeout(botTimerRef.current); };
  }, []);

  // Bot turn logic
  useEffect(() => {
    if (game.currentTurn !== 'bot' || game.phase !== 'playing') return;

    if (game.tablePlayerCards.length === 0 && game.tableBotCards.length === 0) {
      // Bot attacks
      botTimerRef.current = setTimeout(() => {
        setGame(prev => {
          const checked = checkRoundOver(prev);
          if (checked.phase === 'finished') return checked;

          // Bot checks if should declare 31
          if (botShouldDeclare31(difficulty, prev.botScore)) {
            return declareThirtyOne(prev, 'bot');
          }

          // Bot might propose დავი before attacking
          if (botShouldProposeDavi(difficulty, prev.botHand, prev.trumpSuit, prev.botScore, prev.playerScore, prev.daviLevel)) {
            return {
              ...prev,
              phase: 'davi_pending' as const,
              daviProposedBy: 'bot' as const,
              daviLevel: prev.daviLevel + 1,
              message: `⚡ ბოტი: ${DAVI_LADDER[Math.min(prev.daviLevel, DAVI_LADDER.length - 1)]}!`,
            };
          }

          const result = getBuraBotCards(difficulty, prev.botHand, [], prev.trumpSuit, true, prev.deck.length);
          return {
            ...prev,
            botHand: prev.botHand.filter(c => !result.cards.find(sc => sc.id === c.id)),
            tableBotCards: result.cards,
            message: `ბოტმა ${result.cards.length} კარტი დადო`,
            currentTurn: 'player' as const,
          };
        });
      }, getBuraBotDelay(difficulty));
    } else if (game.tablePlayerCards.length > 0 && game.tableBotCards.length === 0) {
      // Bot defends
      botTimerRef.current = setTimeout(() => {
        setGame(prev => {
          const result = getBuraBotCards(difficulty, prev.botHand, prev.tablePlayerCards, prev.trumpSuit, false, prev.deck.length);
          const newBotHand = prev.botHand.filter(c => !result.cards.find(sc => sc.id === c.id));
          
          const winner = determineTrickWinner(prev.tablePlayerCards, result.cards, prev.trumpSuit, 'player', result.hiddenCover);
          const allCards = [...prev.tablePlayerCards, ...result.cards];
          const trickPoints = getCardPoints(allCards);

          setShowTrickResult(
            result.hiddenCover 
              ? (winner === 'player' ? `+${trickPoints} ✓` : `ბოტმა დაფარა`)
              : (winner === 'player' ? `+${trickPoints} ✓` : `ბოტი +${trickPoints}`)
          );
          setTimeout(() => setShowTrickResult(null), 1000);

          let ns: BuraGameState = {
            ...prev,
            botHand: newBotHand,
            tableBotCards: [],
            tablePlayerCards: [],
            botCoveredHidden: result.hiddenCover,
            playerScore: winner === 'player' ? prev.playerScore + trickPoints : prev.playerScore,
            botScore: winner === 'bot' ? prev.botScore + trickPoints : prev.botScore,
            playerTaken: winner === 'player' ? [...prev.playerTaken, ...allCards] : prev.playerTaken,
            botTaken: winner === 'bot' ? [...prev.botTaken, ...allCards] : prev.botTaken,
            currentTurn: winner,
            lastTrickWinner: winner,
            message: winner === 'player' ? `+${trickPoints}` : `ბოტმა +${trickPoints}`,
          };
          ns = drawCards(ns);
          ns = checkRoundOver(ns);
          if (ns.phase === 'playing') {
            ns.message = winner === 'player' ? 'თქვენი სვლაა' : 'ბოტი ფიქრობს...';
          }
          return ns;
        });
      }, getBuraBotDelay(difficulty));
    }
  }, [game.currentTurn, game.phase, game.tablePlayerCards.length, game.tableBotCards.length, difficulty]);

  // Bot responding to player's დავი
  useEffect(() => {
    if (game.phase !== 'davi_pending' || game.daviProposedBy !== 'player') return;

    botTimerRef.current = setTimeout(() => {
      setGame(prev => {
        const response = botRespondToDavi(difficulty, prev.botHand, prev.trumpSuit, prev.botScore, prev.playerScore);
        if (response === 'chari') {
          // Bot folds — player wins round with current davi points
          const pts = prev.daviLevel > 0 ? DAVI_POINTS[Math.min(prev.daviLevel - 1, DAVI_POINTS.length - 1)] : 1;
          return {
            ...prev,
            phase: 'finished' as const,
            winner: 'player' as const,
            playerMatchScore: prev.playerMatchScore + pts,
            roundOver: true,
            roundWinner: 'player' as const,
            message: `🏳️ ბოტმა ჩარი! (+${pts} ქ.)`,
            daviProposedBy: null,
          };
        }
        // Bot accepts (Se) — next level
        const newLevel = Math.min(prev.daviLevel + 1, 5);
        return {
          ...prev,
          phase: 'playing' as const,
          daviLevel: newLevel,
          daviProposedBy: null,
          currentTurn: 'player' as const,
          message: `სე! ${DAVI_LADDER[Math.min(newLevel - 1, DAVI_LADDER.length - 1)]} (${DAVI_POINTS[Math.min(newLevel - 1, DAVI_POINTS.length - 1)]} ქ.)`,
        };
      });
    }, getBuraBotDelay(difficulty));
  }, [game.phase, game.daviProposedBy, difficulty]);

  // Player proposes დავი
  const proposeDavi = useCallback(() => {
    if (game.phase !== 'playing' || game.currentTurn !== 'player') return;
    setGame(prev => {
      const newLevel = prev.daviLevel + 1;
      return {
        ...prev,
        phase: 'davi_pending' as const,
        daviProposedBy: 'player' as const,
        daviLevel: newLevel,
        message: `⚡ ${DAVI_LADDER[Math.min(newLevel - 1, DAVI_LADDER.length - 1)]}! ელოდება პასუხს...`,
      };
    });
  }, [game.phase, game.currentTurn]);

  // Player responds to bot's დავი
  const respondSe = useCallback(() => {
    setGame(prev => {
      const newLevel = Math.min(prev.daviLevel + 1, 5);
      return {
        ...prev,
        phase: 'playing' as const,
        daviLevel: newLevel,
        daviProposedBy: null,
        currentTurn: 'bot' as const,
        message: `სე! ${DAVI_LADDER[Math.min(newLevel - 1, DAVI_LADDER.length - 1)]} (${DAVI_POINTS[Math.min(newLevel - 1, DAVI_POINTS.length - 1)]} ქ.)`,
      };
    });
  }, []);

  const respondChari = useCallback(() => {
    setGame(prev => {
      const pts = prev.daviLevel > 0 ? DAVI_POINTS[Math.min(prev.daviLevel - 1, DAVI_POINTS.length - 1)] : 1;
      return {
        ...prev,
        phase: 'finished' as const,
        winner: 'bot' as const,
        botMatchScore: prev.botMatchScore + pts,
        roundOver: true,
        roundWinner: 'bot' as const,
        message: `🏳️ ჩარი! ბოტმა მოიგო (+${pts} ქ.)`,
        daviProposedBy: null,
      };
    });
  }, []);

  // Player declares 31
  const declare31 = useCallback(() => {
    setGame(prev => declareThirtyOne(prev, 'player'));
  }, []);

  // Player plays hidden cover (gives cards face-down)
  const playHiddenCover = useCallback(() => {
    if (game.tableBotCards.length === 0 || game.tablePlayerCards.length > 0) return;
    const count = game.tableBotCards.length;
    // Give lowest value cards face-down
    const sorted = [...game.playerHand].sort((a, b) => CARD_VALUES_LOCAL[a.rank] - CARD_VALUES_LOCAL[b.rank]);
    const cardsToGive = sorted.slice(0, count);
    
    setGame(prev => {
      const winner = determineTrickWinner(prev.tableBotCards, cardsToGive, prev.trumpSuit, 'bot', true);
      const allCards = [...prev.tableBotCards, ...cardsToGive];
      const trickPoints = getCardPoints(allCards);

      setShowTrickResult(`ბოტი +${trickPoints} (დაფარა)`);
      setTimeout(() => setShowTrickResult(null), 1000);

      let ns: BuraGameState = {
        ...prev,
        playerHand: prev.playerHand.filter(c => !cardsToGive.find(sc => sc.id === c.id)),
        tablePlayerCards: [],
        tableBotCards: [],
        playerCoveredHidden: true,
        playerScore: winner === 'player' ? prev.playerScore + trickPoints : prev.playerScore,
        botScore: winner === 'bot' ? prev.botScore + trickPoints : prev.botScore,
        playerTaken: winner === 'player' ? [...prev.playerTaken, ...allCards] : prev.playerTaken,
        botTaken: winner === 'bot' ? [...prev.botTaken, ...allCards] : prev.botTaken,
        currentTurn: winner,
        lastTrickWinner: winner,
        message: `დაფარეთ — ბოტმა +${trickPoints}`,
      };
      ns = drawCards(ns);
      ns = checkRoundOver(ns);
      if (ns.phase === 'playing') {
        ns.message = winner === 'player' ? 'თქვენი სვლაა' : 'ბოტი ფიქრობს...';
      }
      return ns;
    });
    setSelectedCards(new Set());
  }, [game.tableBotCards, game.tablePlayerCards, game.playerHand]);

  const toggleCard = useCallback((card: BuraCard) => {
    if (game.currentTurn !== 'player' || game.phase !== 'playing') return;

    if (game.tableBotCards.length > 0 && game.tablePlayerCards.length === 0) {
      const requiredCount = game.tableBotCards.length;
      setSelectedCards(prev => {
        const next = new Set(prev);
        if (next.has(card.id)) {
          next.delete(card.id);
        } else {
          if (next.size >= requiredCount) next.clear();
          next.add(card.id);
        }
        return next;
      });
      return;
    }

    setSelectedCards(prev => {
      const next = new Set(prev);
      if (next.has(card.id)) {
        next.delete(card.id);
      } else {
        const currentSelected = game.playerHand.filter(c => prev.has(c.id));
        if (currentSelected.length > 0 && currentSelected[0].suit !== card.suit) {
          next.clear();
        }
        if (next.size < 3) next.add(card.id);
      }
      return next;
    });
  }, [game.currentTurn, game.phase, game.tableBotCards.length, game.tablePlayerCards.length, game.playerHand]);

  const playCards = useCallback(() => {
    if (selectedCards.size === 0) return;
    const cards = game.playerHand.filter(c => selectedCards.has(c.id));

    if (game.tableBotCards.length > 0 && game.tablePlayerCards.length === 0) {
      // Player is defending (beating)
      if (cards.length !== game.tableBotCards.length) return;
      setGame(prev => {
        const winner = determineTrickWinner(prev.tableBotCards, cards, prev.trumpSuit, 'bot', false);
        const allCards = [...prev.tableBotCards, ...cards];
        const trickPoints = getCardPoints(allCards);

        setShowTrickResult(winner === 'player' ? `+${trickPoints} ✓` : `ბოტი +${trickPoints}`);
        setTimeout(() => setShowTrickResult(null), 1000);

        let ns: BuraGameState = {
          ...prev,
          playerHand: prev.playerHand.filter(c => !cards.find(sc => sc.id === c.id)),
          tablePlayerCards: [],
          tableBotCards: [],
          playerScore: winner === 'player' ? prev.playerScore + trickPoints : prev.playerScore,
          botScore: winner === 'bot' ? prev.botScore + trickPoints : prev.botScore,
          playerTaken: winner === 'player' ? [...prev.playerTaken, ...allCards] : prev.playerTaken,
          botTaken: winner === 'bot' ? [...prev.botTaken, ...allCards] : prev.botTaken,
          currentTurn: winner,
          lastTrickWinner: winner,
          message: winner === 'player' ? `+${trickPoints}` : `ბოტმა +${trickPoints}`,
        };
        ns = drawCards(ns);
        ns = checkRoundOver(ns);
        if (ns.phase === 'playing') {
          ns.message = winner === 'player' ? 'თქვენი სვლაა' : 'ბოტი ფიქრობს...';
        }
        return ns;
      });
    } else if (game.tablePlayerCards.length === 0 && game.tableBotCards.length === 0) {
      // Player attacking
      if (!isLegalAttack(cards)) return;
      setGame(prev => {
        const checked = checkRoundOver(prev);
        if (checked.phase === 'finished') return checked;
        return {
          ...prev,
          playerHand: prev.playerHand.filter(c => !cards.find(sc => sc.id === c.id)),
          tablePlayerCards: cards,
          currentTurn: 'bot' as const,
          message: 'ბოტი ფიქრობს...',
        };
      });
    }
    setSelectedCards(new Set());
  }, [selectedCards, game]);

  const handleLeave = useCallback(() => {
    if (botTimerRef.current) clearTimeout(botTimerRef.current);
    onBack();
  }, [onBack]);

  const nextRound = useCallback(() => {
    if (botTimerRef.current) clearTimeout(botTimerRef.current);
    setGame(prev => initBuraRound({ 
      playerMatchScore: prev.playerMatchScore, 
      botMatchScore: prev.botMatchScore,
      matchTarget: prev.matchTarget 
    }));
    setSelectedCards(new Set());
    setShowTrickResult(null);
  }, []);

  const restartMatch = useCallback(() => {
    if (botTimerRef.current) clearTimeout(botTimerRef.current);
    setGame(initBuraRound());
    setSelectedCards(new Set());
    setShowTrickResult(null);
  }, []);

  // Render card
  const renderCard = (card: BuraCard, opts: { 
    onClick?: () => void; 
    faceDown?: boolean; 
    selected?: boolean;
    isTrump?: boolean;
    small?: boolean;
  } = {}) => {
    const { onClick, faceDown, selected, isTrump, small } = opts;
    const w = small ? 'w-9 h-[50px]' : 'w-10 h-[56px]';

    return (
      <motion.button
        key={card.id}
        layout
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1, y: selected ? -10 : 0 }}
        exit={{ scale: 0.5, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        onClick={onClick}
        disabled={!onClick}
        className={`relative ${w} rounded-md border-2 flex flex-col items-center justify-center font-bold
          ${faceDown 
            ? 'bg-gradient-to-br from-blue-700 to-blue-900 border-blue-600' 
            : `bg-card ${selected ? 'border-primary ring-1 ring-primary/50' : 'border-border/60'} ${onClick ? 'active:scale-95' : ''}`
          }
          ${isTrump && !faceDown ? 'ring-1 ring-yellow-500/40' : ''}
          ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
      >
        {faceDown ? (
          <span className="text-blue-400 text-sm">🂠</span>
        ) : (
          <>
            <span className={`text-[9px] leading-none ${card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-600' : 'text-gray-900'}`}>{card.rank}</span>
            <span className={`text-sm leading-none ${card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-600' : 'text-gray-900'}`}>{SUIT_SYMBOLS[card.suit]}</span>
          </>
        )}
      </motion.button>
    );
  };

  const canPlay = selectedCards.size > 0 && game.currentTurn === 'player' && game.phase === 'playing';
  const isDefending = game.tableBotCards.length > 0 && game.tablePlayerCards.length === 0 && game.currentTurn === 'player' && game.phase === 'playing';
  const canDavi = game.phase === 'playing' && game.currentTurn === 'player' 
    && game.tablePlayerCards.length === 0 && game.tableBotCards.length === 0
    && game.daviLevel < 5;
  const isDaviPending = game.phase === 'davi_pending' && game.daviProposedBy === 'bot';
  const canDeclare31 = game.phase === 'playing' && game.currentTurn === 'player' && game.playerTaken.length > 0;
  const matchOver = game.playerMatchScore >= game.matchTarget || game.botMatchScore >= game.matchTarget;

  const playerPct = Math.min(100, (game.playerScore / 31) * 100);
  const botPct = Math.min(100, (game.botScore / 31) * 100);

  return (
    <div className="h-dvh bg-gradient-to-b from-emerald-950 to-emerald-900 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 bg-black/30 border-b border-white/10">
        <div className="flex items-center gap-1.5 px-2 py-1">
          <button onClick={handleLeave} className="p-1 rounded-lg hover:bg-white/10 text-white/80">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-xs text-white truncate">ბურა (31)</h1>
            <p className="text-[9px] text-white/50">{diffLabels[difficulty]} • მატჩი {game.matchTarget}-მდე</p>
          </div>
          {/* Match score */}
          <div className="flex items-center gap-1 bg-black/30 rounded-lg px-2 py-0.5">
            <span className="text-[10px] text-primary font-bold">{game.playerMatchScore}</span>
            <span className="text-[9px] text-white/30">:</span>
            <span className="text-[10px] text-red-400 font-bold">{game.botMatchScore}</span>
          </div>
          {game.daviLevel > 0 && (
            <span className="text-[9px] font-bold text-orange-400 bg-orange-500/20 px-1.5 py-0.5 rounded">
              {DAVI_LADDER[Math.min(game.daviLevel - 1, DAVI_LADDER.length - 1)]} ({DAVI_POINTS[Math.min(game.daviLevel - 1, DAVI_POINTS.length - 1)]}ქ)
            </span>
          )}
          <button onClick={() => setSoundOn(!soundOn)} className="p-1 rounded-lg hover:bg-white/10 text-white/60">
            {soundOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Scores (card points this round) */}
      <div className="flex-shrink-0 px-2 py-0.5 flex items-center gap-2">
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-white/60 flex items-center gap-0.5">
              <Bot className="w-2.5 h-2.5" /> ბოტი
            </span>
            <span className="text-[10px] font-bold text-white">{game.botScore}/31</span>
          </div>
          <div className="h-0.5 bg-white/10 rounded-full overflow-hidden mt-0.5">
            <div className="h-full bg-red-500 rounded-full transition-all duration-500" style={{ width: `${botPct}%` }} />
          </div>
        </div>

        <div className="flex flex-col items-center flex-shrink-0 px-1">
          <span className={`text-lg ${SUIT_COLORS[game.trumpSuit]}`}>{SUIT_SYMBOLS[game.trumpSuit]}</span>
          <span className="text-[8px] text-white/40">{game.deck.length}</span>
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-white">{game.playerScore}/31</span>
            <span className="text-[9px] text-white/60">თქვენ</span>
          </div>
          <div className="h-0.5 bg-white/10 rounded-full overflow-hidden mt-0.5">
            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${playerPct}%` }} />
          </div>
        </div>
      </div>

      {/* Bot hand */}
      <div className="flex-shrink-0 flex justify-center gap-0.5 px-2 py-0.5">
        <AnimatePresence mode="popLayout">
          {game.botHand.map((_, i) => renderCard(
            { suit: 'spades', rank: '10', id: `bh_${i}` }, 
            { faceDown: true, small: true }
          ))}
        </AnimatePresence>
      </div>

      {/* Table */}
      <div className="flex-1 flex items-center justify-center px-2 relative">
        <div className="bg-emerald-800/50 rounded-xl border border-emerald-700/30 w-full max-w-sm min-h-[80px] flex flex-col items-center justify-center gap-1 p-2 relative">
          
          <AnimatePresence>
            {showTrickResult && (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center z-10 bg-black/40 rounded-xl"
              >
                <span className="text-xl font-bold text-white">{showTrickResult}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {game.tableBotCards.length > 0 && (
            <div className="flex gap-1 items-center">
              <span className="text-[9px] text-white/40">ბოტი</span>
              <div className="flex gap-0.5">
                {game.tableBotCards.map(c => renderCard(c, { small: true }))}
              </div>
            </div>
          )}

          {game.tablePlayerCards.length > 0 && (
            <div className="flex gap-1 items-center">
              <span className="text-[9px] text-white/40">თქვენ</span>
              <div className="flex gap-0.5">
                {game.tablePlayerCards.map(c => renderCard(c, { small: true }))}
              </div>
            </div>
          )}

          {game.tableBotCards.length === 0 && game.tablePlayerCards.length === 0 && (
            <span className="text-white/20 text-[10px]">
              {game.currentTurn === 'player' ? 'აირჩიეთ კარტი' : 'ბოტი ფიქრობს...'}
            </span>
          )}
        </div>
      </div>

      {/* Message */}
      <div className="flex-shrink-0 text-center px-3">
        <p className={`text-[10px] font-medium ${game.phase === 'finished' ? 'text-yellow-400' : game.phase === 'davi_pending' ? 'text-orange-400' : 'text-white/50'}`}>
          {game.message}
        </p>
      </div>

      {/* Davi response buttons (when bot proposes) */}
      <AnimatePresence>
        {isDaviPending && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex-shrink-0 flex gap-2 px-4 py-1 justify-center"
          >
            <Button onClick={respondSe} size="sm" className="gap-1 h-7 text-[10px] bg-green-600 hover:bg-green-700">
              ✓ სე
            </Button>
            <Button onClick={respondChari} size="sm" variant="destructive" className="gap-1 h-7 text-[10px]">
              ✗ ჩარი
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Over */}
      <AnimatePresence>
        {game.phase === 'finished' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-shrink-0 px-3 pb-1"
          >
            <div className={`rounded-xl p-2 text-center ${
              game.winner === 'player' ? 'bg-primary/20 border border-primary/30' : 
              game.winner === 'bot' ? 'bg-red-500/20 border border-red-500/30' :
              'bg-white/10 border border-white/20'
            }`}>
              {game.buraWin && <Flame className="w-5 h-5 text-yellow-500 mx-auto mb-0.5" />}
              <p className="text-white font-bold text-xs">{game.message}</p>
              <p className="text-white/50 text-[10px]">
                ქულა: {game.playerScore} — {game.botScore} | მატჩი: {game.playerMatchScore} — {game.botMatchScore}
              </p>
              <div className="flex gap-1.5 justify-center mt-1.5">
                {!matchOver && (
                  <Button onClick={nextRound} size="sm" className="gap-1 h-7 text-[10px]">
                    შემდეგი რაუნდი
                  </Button>
                )}
                <Button onClick={restartMatch} size="sm" variant="outline" className="gap-1 h-7 text-[10px] border-white/20 text-white hover:bg-white/10">
                  <RotateCcw className="w-3 h-3" /> ახალი მატჩი
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Player hand + controls */}
      <div className="flex-shrink-0 bg-black/20 border-t border-white/10 px-2 pt-1 pb-2">
        <div className="flex justify-center gap-0.5 mb-1">
          <AnimatePresence mode="popLayout">
            {game.playerHand
              .sort((a, b) => {
                if (a.suit !== b.suit) return a.suit.localeCompare(b.suit);
                return RANK_ORDER[a.rank] - RANK_ORDER[b.rank];
              })
              .map(c => renderCard(c, {
                onClick: game.currentTurn === 'player' && game.phase === 'playing' 
                  ? () => toggleCard(c) : undefined,
                selected: selectedCards.has(c.id),
                isTrump: c.suit === game.trumpSuit,
              }))}
          </AnimatePresence>
        </div>

        {/* Action buttons */}
        <div className="flex justify-center gap-1 flex-wrap">
          {canPlay && (
            <Button onClick={playCards} size="sm" className="h-7 text-[10px] px-3 gap-1">
              {isDefending ? 'გაჭრა' : 'დადება'} ({selectedCards.size})
            </Button>
          )}
          {isDefending && (
            <Button onClick={playHiddenCover} size="sm" variant="outline" className="h-7 text-[10px] px-3 gap-1 border-white/30 text-white/70 hover:bg-white/10">
              🂠 დაფარვა
            </Button>
          )}
          {canDavi && (
            <Button onClick={proposeDavi} size="sm" variant="outline" className="h-7 text-[10px] px-3 gap-1 border-orange-500/50 text-orange-400 hover:bg-orange-500/20">
              ⚡ {DAVI_LADDER[Math.min(game.daviLevel, DAVI_LADDER.length - 1)]}
            </Button>
          )}
          {canDeclare31 && (
            <Button onClick={declare31} size="sm" variant="outline" className="h-7 text-[10px] px-3 gap-1 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/20">
              <Eye className="w-3 h-3" /> 31?
            </Button>
          )}
        </div>
      </div>
    </div>
  );
});

// Local card values for sorting hidden cover cards
const CARD_VALUES_LOCAL: Record<string, number> = {
  '6': 0, '7': 0, '8': 0, '9': 0, '10': 10,
  'J': 2, 'Q': 3, 'K': 4, 'A': 11,
};

export default BuraBotGame;
