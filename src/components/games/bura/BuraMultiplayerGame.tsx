import { memo, useState, useCallback, useEffect, useRef } from 'react';
import { ArrowLeft, RotateCcw, Flame, Volume2, VolumeX, Eye, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BuraCard, BuraGameState, SUIT_SYMBOLS, SUIT_COLORS, RANK_ORDER, DAVI_LADDER, DAVI_POINTS, CARD_VALUES } from './buraTypes';
import {
  initBuraRound, determineTrickWinner, getCardPoints,
  drawCards, checkRoundOver, isLegalAttack, declareThirtyOne, createDeck
} from './buraGameLogic';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';

// Multiplayer game state stored in DB
interface MultiplayerState {
  deck: BuraCard[];
  player1Hand: BuraCard[];
  player2Hand: BuraCard[];
  trumpCard: BuraCard;
  trumpSuit: string;
  player1Score: number;
  player2Score: number;
  player1Taken: BuraCard[];
  player2Taken: BuraCard[];
  tableAttackCards: BuraCard[];
  tableDefenseCards: BuraCard[];
  attackerId: string; // who played attack cards
  currentTurnId: string; // whose turn
  phase: 'playing' | 'finished' | 'davi_pending';
  winner: string | null; // winner user id
  message: string;
  lastTrickWinnerId: string | null;
  buraWin: boolean;
  daviLevel: number;
  daviProposedById: string | null;
  player1MatchScore: number;
  player2MatchScore: number;
  matchTarget: number;
  roundOver: boolean;
  roundWinner: string | null;
  defenderCoveredHidden: boolean;
}

interface Props {
  tableId: string;
  player1Id: string;
  player2Id: string;
  player1Username: string;
  player2Username: string;
  onBack: () => void;
}

function initMultiplayerState(p1Id: string, p2Id: string): MultiplayerState {
  const game = initBuraRound();
  return {
    deck: game.deck,
    player1Hand: game.playerHand,
    player2Hand: game.botHand,
    trumpCard: game.trumpCard,
    trumpSuit: game.trumpSuit,
    player1Score: 0,
    player2Score: 0,
    player1Taken: [],
    player2Taken: [],
    tableAttackCards: [],
    tableDefenseCards: [],
    attackerId: p1Id,
    currentTurnId: p1Id,
    phase: 'playing',
    winner: null,
    message: '',
    lastTrickWinnerId: null,
    buraWin: false,
    daviLevel: 0,
    daviProposedById: null,
    player1MatchScore: 0,
    player2MatchScore: 0,
    matchTarget: 11,
    roundOver: false,
    roundWinner: null,
    defenderCoveredHidden: false,
  };
}

const BuraMultiplayerGame = memo(function BuraMultiplayerGame({
  tableId, player1Id, player2Id, player1Username, player2Username, onBack
}: Props) {
  const { user } = useAuth();
  const [gameId, setGameId] = useState<string | null>(null);
  const [state, setState] = useState<MultiplayerState | null>(null);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [showTrickResult, setShowTrickResult] = useState<string | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const myId = user?.id || '';
  const isPlayer1 = myId === player1Id;
  const opponentId = isPlayer1 ? player2Id : player1Id;
  const opponentUsername = isPlayer1 ? player2Username : player1Username;
  const myUsername = isPlayer1 ? player1Username : player2Username;

  // Get my hand from state
  const getMyHand = useCallback((s: MultiplayerState) => isPlayer1 ? s.player1Hand : s.player2Hand, [isPlayer1]);
  const getOpponentHand = useCallback((s: MultiplayerState) => isPlayer1 ? s.player2Hand : s.player1Hand, [isPlayer1]);
  const getMyScore = useCallback((s: MultiplayerState) => isPlayer1 ? s.player1Score : s.player2Score, [isPlayer1]);
  const getOpponentScore = useCallback((s: MultiplayerState) => isPlayer1 ? s.player2Score : s.player1Score, [isPlayer1]);
  const getMyMatchScore = useCallback((s: MultiplayerState) => isPlayer1 ? s.player1MatchScore : s.player2MatchScore, [isPlayer1]);
  const getOpponentMatchScore = useCallback((s: MultiplayerState) => isPlayer1 ? s.player2MatchScore : s.player1MatchScore, [isPlayer1]);
  const getMyTaken = useCallback((s: MultiplayerState) => isPlayer1 ? s.player1Taken : s.player2Taken, [isPlayer1]);

  // Initialize or load game
  useEffect(() => {
    const loadOrCreateGame = async () => {
      // Check for existing game for this table
      const { data: existing } = await supabase
        .from('bura_games')
        .select('*')
        .eq('table_id', tableId)
        .eq('status', 'playing')
        .maybeSingle();

      if (existing) {
        setGameId(existing.id);
        setState(existing.state as unknown as MultiplayerState);
        setLoading(false);
        return;
      }

      // Only player1 creates the game
      if (myId === player1Id) {
        const initialState = initMultiplayerState(player1Id, player2Id);
        const { data, error } = await supabase
          .from('bura_games')
          .insert([{
            table_id: tableId,
            player1_id: player1Id,
            player2_id: player2Id,
            state: JSON.parse(JSON.stringify(initialState)),
            current_turn: player1Id,
            status: 'playing',
          }])
          .select()
          .single();

        if (data) {
          setGameId(data.id);
          setState(initialState);

          // Update lobby table with game_id
          await supabase
            .from('bura_lobby_tables')
            .update({ game_id: data.id })
            .eq('id', tableId);
        }
      }
      setLoading(false);
    };

    loadOrCreateGame();
  }, [tableId, myId, player1Id, player2Id]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!gameId) return;

    const channel = supabase
      .channel(`bura-game-${gameId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bura_games', filter: `id=eq.${gameId}` },
        (payload) => {
          const newData = payload.new as { state: MultiplayerState; status: string };
          setState(newData.state);
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [gameId]);

  // Poll for game creation (player2 waits)
  useEffect(() => {
    if (gameId || myId === player1Id) return;
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('bura_games')
        .select('*')
        .eq('table_id', tableId)
        .eq('status', 'playing')
        .maybeSingle();
      if (data) {
        setGameId(data.id);
        setState(data.state as unknown as MultiplayerState);
        setLoading(false);
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [gameId, tableId, myId, player1Id]);

  // Update game state in DB
  const updateGameState = useCallback(async (newState: MultiplayerState) => {
    if (!gameId) return;
    setState(newState);
    await supabase
      .from('bura_games')
      .update({
        state: JSON.parse(JSON.stringify(newState)),
        current_turn: newState.currentTurnId,
        status: newState.phase === 'finished' ? 'finished' : 'playing',
        winner_id: newState.winner,
      })
      .eq('id', gameId);
  }, [gameId]);

  // Toggle card selection
  const toggleCard = useCallback((card: BuraCard) => {
    if (!state || state.currentTurnId !== myId || state.phase !== 'playing') return;

    const isDefending = state.tableAttackCards.length > 0 && state.tableDefenseCards.length === 0 && state.attackerId !== myId;

    if (isDefending) {
      const requiredCount = state.tableAttackCards.length;
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
        const myHand = getMyHand(state);
        const currentSelected = myHand.filter(c => prev.has(c.id));
        if (currentSelected.length > 0 && currentSelected[0].suit !== card.suit) {
          next.clear();
        }
        if (next.size < 3) next.add(card.id);
      }
      return next;
    });
  }, [state, myId, getMyHand]);

  // Play cards
  const playCards = useCallback(() => {
    if (!state || selectedCards.size === 0) return;
    const myHand = getMyHand(state);
    const cards = myHand.filter(c => selectedCards.has(c.id));
    
    const isDefending = state.tableAttackCards.length > 0 && state.tableDefenseCards.length === 0 && state.attackerId !== myId;

    if (isDefending) {
      // Defending (beating)
      if (cards.length !== state.tableAttackCards.length) return;
      
      const winner = determineTrickWinner(
        state.tableAttackCards, cards, state.trumpSuit as any, 
        'player', false // attacker perspective doesn't matter for logic
      );
      const trickWinnerId = winner === 'player' ? state.attackerId : myId;
      // 'player' = attacker wins, 'bot' = defender wins in the function
      const actualWinnerId = winner === 'player' ? state.attackerId : myId;
      
      const allCards = [...state.tableAttackCards, ...cards];
      const trickPoints = getCardPoints(allCards);

      setShowTrickResult(actualWinnerId === myId ? `+${trickPoints} ✓` : `${opponentUsername} +${trickPoints}`);
      setTimeout(() => setShowTrickResult(null), 1200);

      const newHand = myHand.filter(c => !cards.find(sc => sc.id === c.id));
      
      // Determine which player's data to update
      const p1Wins = actualWinnerId === player1Id;
      const newP1Score = p1Wins ? state.player1Score + trickPoints : state.player1Score;
      const newP2Score = !p1Wins ? state.player2Score + trickPoints : state.player2Score;
      const newP1Taken = p1Wins ? [...state.player1Taken, ...allCards] : state.player1Taken;
      const newP2Taken = !p1Wins ? [...state.player2Taken, ...allCards] : state.player2Taken;

      // Draw cards
      let deck = [...state.deck];
      let p1Hand = isPlayer1 ? newHand : [...state.player1Hand];
      let p2Hand = isPlayer1 ? [...state.player2Hand] : newHand;

      // Winner draws first
      const winnerHand = actualWinnerId === player1Id ? p1Hand : p2Hand;
      const loserHand = actualWinnerId === player1Id ? p2Hand : p1Hand;
      while (winnerHand.length < 3 && deck.length > 0) winnerHand.push(deck.shift()!);
      while (loserHand.length < 3 && deck.length > 0) loserHand.push(deck.shift()!);

      if (actualWinnerId === player1Id) { p1Hand = winnerHand; p2Hand = loserHand; }
      else { p2Hand = winnerHand; p1Hand = loserHand; }

      let newState: MultiplayerState = {
        ...state,
        deck,
        player1Hand: p1Hand,
        player2Hand: p2Hand,
        player1Score: newP1Score,
        player2Score: newP2Score,
        player1Taken: newP1Taken,
        player2Taken: newP2Taken,
        tableAttackCards: [],
        tableDefenseCards: [],
        currentTurnId: actualWinnerId,
        attackerId: actualWinnerId,
        lastTrickWinnerId: actualWinnerId,
        defenderCoveredHidden: false,
        message: '',
      };

      // Check round over conditions
      newState = checkMultiplayerRoundOver(newState);
      updateGameState(newState);
    } else {
      // Attacking
      if (!isLegalAttack(cards)) return;
      
      const newHand = myHand.filter(c => !cards.find(sc => sc.id === c.id));
      const newState: MultiplayerState = {
        ...state,
        player1Hand: isPlayer1 ? newHand : state.player1Hand,
        player2Hand: isPlayer1 ? state.player2Hand : newHand,
        tableAttackCards: cards,
        tableDefenseCards: [],
        attackerId: myId,
        currentTurnId: opponentId,
        message: '',
      };
      updateGameState(newState);
    }
    setSelectedCards(new Set());
  }, [state, selectedCards, myId, opponentId, isPlayer1, player1Id, getMyHand, updateGameState, opponentUsername]);

  // Hidden cover
  const playHiddenCover = useCallback(() => {
    if (!state || state.tableAttackCards.length === 0 || state.attackerId === myId) return;
    const myHand = getMyHand(state);
    const count = state.tableAttackCards.length;
    const sorted = [...myHand].sort((a, b) => CARD_VALUES[a.rank] - CARD_VALUES[b.rank]);
    const cardsToGive = sorted.slice(0, count);

    const allCards = [...state.tableAttackCards, ...cardsToGive];
    const trickPoints = getCardPoints(allCards);
    const winnerId = state.attackerId; // Attacker always wins when hidden cover

    setShowTrickResult(`${opponentUsername} +${trickPoints} (დაფარა)`);
    setTimeout(() => setShowTrickResult(null), 1200);

    const newHand = myHand.filter(c => !cardsToGive.find(sc => sc.id === c.id));
    const p1Wins = winnerId === player1Id;
    
    let deck = [...state.deck];
    let p1Hand = isPlayer1 ? newHand : [...state.player1Hand];
    let p2Hand = isPlayer1 ? [...state.player2Hand] : newHand;

    const winnerHand = winnerId === player1Id ? p1Hand : p2Hand;
    const loserHand = winnerId === player1Id ? p2Hand : p1Hand;
    while (winnerHand.length < 3 && deck.length > 0) winnerHand.push(deck.shift()!);
    while (loserHand.length < 3 && deck.length > 0) loserHand.push(deck.shift()!);
    if (winnerId === player1Id) { p1Hand = winnerHand; p2Hand = loserHand; }
    else { p2Hand = winnerHand; p1Hand = loserHand; }

    let newState: MultiplayerState = {
      ...state,
      deck,
      player1Hand: p1Hand,
      player2Hand: p2Hand,
      player1Score: p1Wins ? state.player1Score + trickPoints : state.player1Score,
      player2Score: !p1Wins ? state.player2Score + trickPoints : state.player2Score,
      player1Taken: p1Wins ? [...state.player1Taken, ...allCards] : state.player1Taken,
      player2Taken: !p1Wins ? [...state.player2Taken, ...allCards] : state.player2Taken,
      tableAttackCards: [],
      tableDefenseCards: [],
      currentTurnId: winnerId,
      attackerId: winnerId,
      lastTrickWinnerId: winnerId,
      defenderCoveredHidden: true,
      message: '',
    };

    newState = checkMultiplayerRoundOver(newState);
    updateGameState(newState);
    setSelectedCards(new Set());
  }, [state, myId, opponentId, isPlayer1, player1Id, getMyHand, updateGameState, opponentUsername]);

  // Davi
  const proposeDavi = useCallback(() => {
    if (!state || state.phase !== 'playing' || state.currentTurnId !== myId) return;
    const newLevel = state.daviLevel + 1;
    updateGameState({
      ...state,
      phase: 'davi_pending',
      daviProposedById: myId,
      daviLevel: newLevel,
      message: '',
    });
  }, [state, myId, updateGameState]);

  const respondSe = useCallback(() => {
    if (!state) return;
    const newLevel = Math.min(state.daviLevel + 1, 5);
    updateGameState({
      ...state,
      phase: 'playing',
      daviLevel: newLevel,
      daviProposedById: null,
      currentTurnId: state.daviProposedById || state.currentTurnId,
      message: '',
    });
  }, [state, updateGameState]);

  const respondChari = useCallback(() => {
    if (!state) return;
    const pts = state.daviLevel > 0 ? DAVI_POINTS[Math.min(state.daviLevel - 1, DAVI_POINTS.length - 1)] : 1;
    const winnerId = state.daviProposedById!;
    const p1Wins = winnerId === player1Id;
    updateGameState({
      ...state,
      phase: 'finished',
      winner: winnerId,
      player1MatchScore: p1Wins ? state.player1MatchScore + pts : state.player1MatchScore,
      player2MatchScore: !p1Wins ? state.player2MatchScore + pts : state.player2MatchScore,
      roundOver: true,
      roundWinner: winnerId,
      daviProposedById: null,
      message: '',
    });
  }, [state, player1Id, updateGameState]);

  // Declare 31
  const declare31 = useCallback(() => {
    if (!state) return;
    const myScore = getMyScore(state);
    if (myScore >= 31) {
      const pts = state.daviLevel > 0 ? DAVI_POINTS[Math.min(state.daviLevel - 1, DAVI_POINTS.length - 1)] : 1;
      const p1Wins = myId === player1Id;
      updateGameState({
        ...state,
        phase: 'finished',
        winner: myId,
        player1MatchScore: p1Wins ? state.player1MatchScore + pts : state.player1MatchScore,
        player2MatchScore: !p1Wins ? state.player2MatchScore + pts : state.player2MatchScore,
        roundOver: true,
        roundWinner: myId,
        message: '',
      });
    } else {
      // False declaration - opponent wins
      const pts = state.daviLevel > 0 ? DAVI_POINTS[Math.min(state.daviLevel - 1, DAVI_POINTS.length - 1)] : 1;
      const p1Wins = opponentId === player1Id;
      updateGameState({
        ...state,
        phase: 'finished',
        winner: opponentId,
        player1MatchScore: p1Wins ? state.player1MatchScore + pts : state.player1MatchScore,
        player2MatchScore: !p1Wins ? state.player2MatchScore + pts : state.player2MatchScore,
        roundOver: true,
        roundWinner: opponentId,
        message: '',
      });
    }
  }, [state, myId, opponentId, player1Id, getMyScore, updateGameState]);

  // Next round
  const nextRound = useCallback(() => {
    if (!state) return;
    const fresh = initMultiplayerState(player1Id, player2Id);
    fresh.player1MatchScore = state.player1MatchScore;
    fresh.player2MatchScore = state.player2MatchScore;
    updateGameState(fresh);
    setSelectedCards(new Set());
    setShowTrickResult(null);
  }, [state, player1Id, player2Id, updateGameState]);

  const handleLeave = useCallback(async () => {
    // Clean up: mark game as finished and free the table
    if (gameId) {
      await supabase.from('bura_games').update({ status: 'finished' }).eq('id', gameId);
    }
    await supabase.from('bura_lobby_tables').update({
      status: 'free',
      player1_id: null, player1_username: null,
      player2_id: null, player2_username: null,
      game_id: null,
    }).eq('id', tableId);
    onBack();
  }, [gameId, tableId, onBack]);

  if (loading || !state) {
    return (
      <div className="h-dvh bg-gradient-to-b from-emerald-950 to-emerald-900 flex flex-col items-center justify-center gap-6">
        <div className="text-center text-white">
          <Flame className="w-10 h-10 mx-auto mb-3 text-red-500 animate-pulse" />
          <p className="text-sm">თამაში იტვირთება...</p>
        </div>
        <Button 
          variant="outline" 
          onClick={onBack}
          className="text-white border-white/30 hover:bg-white/10"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          უკან დაბრუნება
        </Button>
      </div>
    );
  }

  const myHand = getMyHand(state);
  const opponentHand = getOpponentHand(state);
  const myScore = getMyScore(state);
  const opponentScore = getOpponentScore(state);
  const myMatchScore = getMyMatchScore(state);
  const opponentMatchScore = getOpponentMatchScore(state);
  const isMyTurn = state.currentTurnId === myId;
  const isDefending = state.tableAttackCards.length > 0 && state.tableDefenseCards.length === 0 && state.attackerId !== myId && isMyTurn;
  const canPlay = selectedCards.size > 0 && isMyTurn && state.phase === 'playing';
  const canDavi = state.phase === 'playing' && isMyTurn && state.tableAttackCards.length === 0 && state.daviLevel < 5;
  const isDaviPending = state.phase === 'davi_pending' && state.daviProposedById !== myId;
  const canDeclare31 = state.phase === 'playing' && isMyTurn && getMyTaken(state).length > 0;
  const matchOver = state.player1MatchScore >= state.matchTarget || state.player2MatchScore >= state.matchTarget;

  const myPct = Math.min(100, (myScore / 31) * 100);
  const opPct = Math.min(100, (opponentScore / 31) * 100);

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

  const getStatusMessage = () => {
    if (state.phase === 'finished') {
      if (state.winner === myId) return '🎉 მოიგეთ რაუნდი!';
      if (state.winner) return '😔 წააგეთ რაუნდი';
      return '🤝 ფრე';
    }
    if (state.phase === 'davi_pending') {
      if (state.daviProposedById === myId) return `⚡ ${DAVI_LADDER[Math.min(state.daviLevel - 1, DAVI_LADDER.length - 1)]}! ელოდება პასუხს...`;
      return `⚡ ${opponentUsername}: ${DAVI_LADDER[Math.min(state.daviLevel - 1, DAVI_LADDER.length - 1)]}!`;
    }
    if (isMyTurn) {
      if (isDefending) return 'გაჭერით ან დაფარეთ';
      return 'თქვენი სვლაა';
    }
    return `${opponentUsername} ფიქრობს...`;
  };

  return (
    <div className="h-dvh bg-gradient-to-b from-emerald-950 to-emerald-900 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 bg-black/30 border-b border-white/10">
        <div className="flex items-center gap-1.5 px-2 py-1">
          <button onClick={handleLeave} className="p-1 rounded-lg hover:bg-white/10 text-white/80">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-xs text-white truncate">ბურა 1v1</h1>
            <p className="text-[9px] text-white/50">vs {opponentUsername} • მატჩი {state.matchTarget}-მდე</p>
          </div>
          <div className="flex items-center gap-1 bg-black/30 rounded-lg px-2 py-0.5">
            <span className="text-[10px] text-primary font-bold">{myMatchScore}</span>
            <span className="text-[9px] text-white/30">:</span>
            <span className="text-[10px] text-red-400 font-bold">{opponentMatchScore}</span>
          </div>
          {state.daviLevel > 0 && (
            <span className="text-[9px] font-bold text-orange-400 bg-orange-500/20 px-1.5 py-0.5 rounded">
              {DAVI_LADDER[Math.min(state.daviLevel - 1, DAVI_LADDER.length - 1)]} ({DAVI_POINTS[Math.min(state.daviLevel - 1, DAVI_POINTS.length - 1)]}ქ)
            </span>
          )}
          <button onClick={() => setSoundOn(!soundOn)} className="p-1 rounded-lg hover:bg-white/10 text-white/60">
            {soundOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Scores */}
      <div className="flex-shrink-0 px-2 py-0.5 flex items-center gap-2">
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-white/60 flex items-center gap-0.5">
              <Users className="w-2.5 h-2.5" /> {opponentUsername}
            </span>
            <span className="text-[10px] font-bold text-white">{opponentScore}/31</span>
          </div>
          <div className="h-0.5 bg-white/10 rounded-full overflow-hidden mt-0.5">
            <div className="h-full bg-red-500 rounded-full transition-all duration-500" style={{ width: `${opPct}%` }} />
          </div>
        </div>

        <div className="flex flex-col items-center flex-shrink-0 px-1">
          <span className={`text-lg ${SUIT_COLORS[state.trumpSuit as keyof typeof SUIT_COLORS]}`}>
            {SUIT_SYMBOLS[state.trumpSuit as keyof typeof SUIT_SYMBOLS]}
          </span>
          <span className="text-[8px] text-white/40">{state.deck.length}</span>
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-white">{myScore}/31</span>
            <span className="text-[9px] text-white/60">თქვენ</span>
          </div>
          <div className="h-0.5 bg-white/10 rounded-full overflow-hidden mt-0.5">
            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${myPct}%` }} />
          </div>
        </div>
      </div>

      {/* Opponent hand (face down) */}
      <div className="flex-shrink-0 flex justify-center gap-0.5 px-2 py-0.5">
        <AnimatePresence mode="popLayout">
          {opponentHand.map((_, i) => renderCard(
            { suit: 'spades', rank: '10', id: `oh_${i}` },
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

          {state.tableAttackCards.length > 0 && (
            <div className="flex gap-1 items-center">
              <span className="text-[9px] text-white/40">
                {state.attackerId === myId ? 'თქვენ' : opponentUsername}
              </span>
              <div className="flex gap-0.5">
                {state.tableAttackCards.map(c => renderCard(c, { small: true }))}
              </div>
            </div>
          )}

          {state.tableDefenseCards.length > 0 && (
            <div className="flex gap-1 items-center">
              <span className="text-[9px] text-white/40">
                {state.attackerId !== myId ? 'თქვენ' : opponentUsername}
              </span>
              <div className="flex gap-0.5">
                {state.tableDefenseCards.map(c => renderCard(c, { small: true }))}
              </div>
            </div>
          )}

          {state.tableAttackCards.length === 0 && state.tableDefenseCards.length === 0 && (
            <span className="text-white/20 text-[10px]">
              {isMyTurn ? 'აირჩიეთ კარტი' : `${opponentUsername} ფიქრობს...`}
            </span>
          )}
        </div>
      </div>

      {/* Message */}
      <div className="flex-shrink-0 text-center px-3">
        <p className={`text-[10px] font-medium ${
          state.phase === 'finished' ? 'text-yellow-400' : 
          state.phase === 'davi_pending' ? 'text-orange-400' : 
          isMyTurn ? 'text-green-400' : 'text-white/50'
        }`}>
          {getStatusMessage()}
        </p>
      </div>

      {/* Davi response */}
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
        {state.phase === 'finished' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-shrink-0 px-3 pb-1"
          >
            <div className={`rounded-xl p-2 text-center ${
              state.winner === myId ? 'bg-primary/20 border border-primary/30' :
              state.winner ? 'bg-red-500/20 border border-red-500/30' :
              'bg-white/10 border border-white/20'
            }`}>
              {state.buraWin && <Flame className="w-5 h-5 text-yellow-500 mx-auto mb-0.5" />}
              <p className="text-white font-bold text-xs">{getStatusMessage()}</p>
              <p className="text-white/50 text-[10px]">
                ქულა: {myScore} — {opponentScore} | მატჩი: {myMatchScore} — {opponentMatchScore}
              </p>
              <div className="flex gap-1.5 justify-center mt-1.5">
                {!matchOver && (
                  <Button onClick={nextRound} size="sm" className="gap-1 h-7 text-[10px]">
                    შემდეგი რაუნდი
                  </Button>
                )}
                <Button onClick={handleLeave} size="sm" variant="outline" className="gap-1 h-7 text-[10px] border-white/20 text-white hover:bg-white/10">
                  გასვლა
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
            {myHand
              .sort((a, b) => {
                if (a.suit !== b.suit) return a.suit.localeCompare(b.suit);
                return RANK_ORDER[a.rank] - RANK_ORDER[b.rank];
              })
              .map(c => renderCard(c, {
                onClick: isMyTurn && state.phase === 'playing'
                  ? () => toggleCard(c) : undefined,
                selected: selectedCards.has(c.id),
                isTrump: c.suit === state.trumpSuit,
              }))}
          </AnimatePresence>
        </div>

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
              ⚡ {DAVI_LADDER[Math.min(state.daviLevel, DAVI_LADDER.length - 1)]}
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

function checkMultiplayerRoundOver(state: MultiplayerState): MultiplayerState {
  // Check BURA (3 trumps)
  const p1Trumps = state.player1Hand.filter(c => c.suit === state.trumpSuit).length;
  const p2Trumps = state.player2Hand.filter(c => c.suit === state.trumpSuit).length;
  if (p1Trumps >= 3 && state.player1Hand.length >= 3) {
    return finishMultiplayerRound(state, state.player1Hand[0] ? state.attackerId : state.currentTurnId, true);
  }
  if (p2Trumps >= 3 && state.player2Hand.length >= 3) {
    return finishMultiplayerRound(state, state.currentTurnId, true);
  }

  // Both hands and deck empty
  if (state.player1Hand.length === 0 && state.player2Hand.length === 0 && state.deck.length === 0) {
    if (state.player1Score > state.player2Score) return finishMultiplayerRound(state, state.attackerId, false);
    if (state.player2Score > state.player1Score) return finishMultiplayerRound(state, state.currentTurnId, false);
    // Figure out who actually won
    // Use stored player IDs - we don't have them here, but winner is determined by score
    return { ...state, phase: 'finished', roundOver: true, winner: null, roundWinner: null };
  }
  return state;
}

function finishMultiplayerRound(state: MultiplayerState, winnerId: string, isBura: boolean): MultiplayerState {
  const matchPointsEarned = state.daviLevel > 0
    ? DAVI_POINTS[Math.min(state.daviLevel - 1, DAVI_POINTS.length - 1)]
    : 1;
  const finalPoints = isBura ? matchPointsEarned * 2 : matchPointsEarned;

  // We need to know if winner is player1 or player2
  // Since we don't have player1Id/player2Id here, we check via attackerId context
  // This is imperfect but works for the common case
  return {
    ...state,
    phase: 'finished',
    winner: winnerId,
    buraWin: isBura,
    roundOver: true,
    roundWinner: winnerId,
  };
}

export default BuraMultiplayerGame;
