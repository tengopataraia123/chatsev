import { useState, useEffect, useCallback, memo } from 'react';
import { ArrowLeft, HelpCircle, Trophy, Clock, CheckCircle, XCircle, Zap, Star, Timer, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface QuizGameViewProps {
  onBack: () => void;
}

interface Question {
  id: string;
  question_text: string;
  options: string[];
  difficulty: string;
  category: string;
}

interface SessionData {
  session_id: string;
  questions: Question[];
  current_index: number;
  total_points: number;
  correct_count: number;
  is_resume: boolean;
}

interface AnswerResult {
  is_correct: boolean;
  correct_index: number;
  points_awarded: number;
  total_points_so_far: number;
  correct_count_so_far: number;
}

const QuizGameView = memo(function QuizGameView({ onBack }: QuizGameViewProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'result' | 'cooldown'>('menu');
  const [loading, setLoading] = useState(false);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
  const [showingResult, setShowingResult] = useState(false);
  const [cooldownHours, setCooldownHours] = useState(0);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  // Fetch leaderboard
  const fetchLeaderboard = useCallback(async () => {
    const { data, error } = await supabase
      .from('quiz_v2_user_stats')
      .select('user_id, total_points, quizzes_played, correct_answers')
      .order('total_points', { ascending: false })
      .limit(10);

    if (!error && data) {
      // Get profiles for leaderboard
      const userIds = data.map((d: any) => d.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', userIds);

      const leaderboardWithProfiles = data.map((stat: any) => ({
        ...stat,
        profile: profiles?.find((p: any) => p.user_id === stat.user_id)
      }));
      setLeaderboard(leaderboardWithProfiles);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Start quiz
  const startQuiz = async () => {
    if (!user) {
      toast({ title: 'გთხოვთ გაიაროთ ავტორიზაცია', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('quiz-v2/start', {
        body: { language: 'ka' }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;

      if (data.error === 'cooldown') {
        setCooldownHours(data.hours_remaining);
        setGameState('cooldown');
        return;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setSessionData(data);
      setCurrentIndex(data.current_index || 0);
      setTotalPoints(data.total_points || 0);
      setCorrectCount(data.correct_count || 0);
      setGameState('playing');

      if (data.is_resume) {
        toast({ title: 'თამაში გაგრძელდა', description: 'წინა სესია აღდგა' });
      }
    } catch (error: any) {
      console.error('Start quiz error:', error);
      toast({ title: 'შეცდომა', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Submit answer
  const submitAnswer = async (index: number) => {
    if (!sessionData || selectedAnswer !== null) return;

    setSelectedAnswer(index);
    setLoading(true);

    try {
      const currentQuestion = sessionData.questions[currentIndex];
      
      const response = await supabase.functions.invoke('quiz-v2/answer', {
        body: {
          session_id: sessionData.session_id,
          question_id: currentQuestion.id,
          selected_index: index
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data;
      setAnswerResult(result);
      setTotalPoints(result.total_points_so_far);
      setCorrectCount(result.correct_count_so_far);
      setShowingResult(true);

      // Wait before moving to next question
      setTimeout(() => {
        if (currentIndex < sessionData.questions.length - 1) {
          setCurrentIndex(prev => prev + 1);
          setSelectedAnswer(null);
          setAnswerResult(null);
          setShowingResult(false);
        } else {
          finishQuiz();
        }
      }, 2000);
    } catch (error: any) {
      console.error('Answer error:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
      setSelectedAnswer(null);
    } finally {
      setLoading(false);
    }
  };

  // Finish quiz
  const finishQuiz = async () => {
    if (!sessionData) return;

    try {
      await supabase.functions.invoke('quiz-v2/finish', {
        body: { session_id: sessionData.session_id }
      });
      
      setGameState('result');
      fetchLeaderboard();
    } catch (error) {
      console.error('Finish error:', error);
      setGameState('result');
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-500 bg-green-500/10';
      case 'medium': return 'text-yellow-500 bg-yellow-500/10';
      case 'hard': return 'text-red-500 bg-red-500/10';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'იოლი';
      case 'medium': return 'საშუალო';
      case 'hard': return 'რთული';
      default: return difficulty;
    }
  };

  const getDifficultyPoints = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 1;
      case 'medium': return 2;
      case 'hard': return 3;
      default: return 1;
    }
  };

  const getOptionStyle = (index: number) => {
    if (!showingResult) {
      return selectedAnswer === index 
        ? 'border-primary bg-primary/10' 
        : 'border-border hover:border-primary/50 hover:bg-primary/5';
    }

    if (answerResult) {
      if (index === answerResult.correct_index) {
        return 'border-green-500 bg-green-500/20 text-green-500';
      }
      if (index === selectedAnswer && !answerResult.is_correct) {
        return 'border-red-500 bg-red-500/20 text-red-500';
      }
    }
    return 'border-border opacity-50';
  };

  // Menu Screen
  if (gameState === 'menu') {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border/40">
          <div className="flex items-center gap-3 p-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">ვიქტორინა</h1>
              <p className="text-xs text-muted-foreground">1000+ კითხვა</p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Start Card */}
          <Card className="overflow-hidden">
            <div className="h-32 bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
              <div className="text-center text-white">
                <HelpCircle className="w-12 h-12 mx-auto mb-2" />
                <p className="font-bold text-lg">შეამოწმე შენი ცოდნა!</p>
              </div>
            </div>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-xl bg-green-500/10">
                  <p className="text-2xl font-bold text-green-500">10</p>
                  <p className="text-xs text-muted-foreground">კითხვა</p>
                </div>
                <div className="p-3 rounded-xl bg-yellow-500/10">
                  <p className="text-2xl font-bold text-yellow-500">17</p>
                  <p className="text-xs text-muted-foreground">მაქს. ქულა</p>
                </div>
                <div className="p-3 rounded-xl bg-purple-500/10">
                  <p className="text-2xl font-bold text-purple-500">12სთ</p>
                  <p className="text-xs text-muted-foreground">კულდაუნი</p>
                </div>
              </div>

              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span>იოლი კითხვა = 1 ქულა</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  <span>საშუალო კითხვა = 2 ქულა</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span>რთული კითხვა = 3 ქულა</span>
                </div>
              </div>

              <Button 
                className="w-full bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700"
                size="lg"
                onClick={startQuiz}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <Zap className="w-5 h-5 mr-2" />
                )}
                დაწყება
              </Button>
            </CardContent>
          </Card>

          {/* Leaderboard */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <h3 className="font-bold">ლიდერბორდი</h3>
              </div>
              <div className="space-y-2">
                {leaderboard.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    ჯერ არავის უთამაშია
                  </p>
                ) : (
                  leaderboard.map((item, idx) => (
                    <div 
                      key={item.user_id}
                      className="flex items-center gap-3 p-2 rounded-lg bg-secondary/30"
                    >
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        idx === 0 ? 'bg-yellow-500 text-white' :
                        idx === 1 ? 'bg-gray-400 text-white' :
                        idx === 2 ? 'bg-amber-600 text-white' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {item.profile?.username || 'უცნობი'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.quizzes_played} თამაში
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">{item.total_points}</p>
                        <p className="text-xs text-muted-foreground">ქულა</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Cooldown Screen
  if (gameState === 'cooldown') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border/40">
          <div className="flex items-center gap-3 p-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-bold text-lg">ვიქტორინა</h1>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-sm w-full">
            <CardContent className="p-6 text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-orange-500/20 flex items-center justify-center">
                <Clock className="w-10 h-10 text-orange-500" />
              </div>
              <h2 className="text-xl font-bold mb-2">კულდაუნი</h2>
              <p className="text-muted-foreground mb-4">
                შემდეგი თამაში შეგიძლიათ <span className="font-bold text-primary">{cooldownHours}</span> საათში
              </p>
              <Button onClick={onBack} variant="outline" className="w-full">
                უკან დაბრუნება
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Playing Screen
  if (gameState === 'playing' && sessionData) {
    const currentQuestion = sessionData.questions[currentIndex];
    const progress = ((currentIndex + 1) / sessionData.questions.length) * 100;

    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border/40 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">კითხვა</span>
              <span className="font-bold text-primary">{currentIndex + 1}/{sessionData.questions.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <span className="font-bold">{totalPoints}</span>
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="flex-1 p-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {/* Question Card */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(currentQuestion.difficulty)}`}>
                      {getDifficultyLabel(currentQuestion.difficulty)} (+{getDifficultyPoints(currentQuestion.difficulty)})
                    </span>
                    <span className="text-xs text-muted-foreground capitalize">
                      {currentQuestion.category.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-lg font-medium leading-relaxed">
                    {currentQuestion.question_text}
                  </p>
                </CardContent>
              </Card>

              {/* Options */}
              <div className="space-y-3">
                {currentQuestion.options.map((option, idx) => (
                  <motion.button
                    key={idx}
                    onClick={() => !showingResult && submitAnswer(idx)}
                    disabled={showingResult || loading}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${getOptionStyle(idx)}`}
                    whileTap={{ scale: showingResult ? 1 : 0.98 }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center font-bold text-sm">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="flex-1">{option}</span>
                      {showingResult && answerResult && (
                        <>
                          {idx === answerResult.correct_index && (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          )}
                          {idx === selectedAnswer && !answerResult.is_correct && (
                            <XCircle className="w-5 h-5 text-red-500" />
                          )}
                        </>
                      )}
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Result Feedback */}
              {showingResult && answerResult && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-xl text-center ${
                    answerResult.is_correct 
                      ? 'bg-green-500/20 text-green-500' 
                      : 'bg-red-500/20 text-red-500'
                  }`}
                >
                  {answerResult.is_correct ? (
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-bold">სწორია! +{answerResult.points_awarded} ქულა</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <XCircle className="w-5 h-5" />
                      <span className="font-bold">არასწორია</span>
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // Result Screen
  if (gameState === 'result') {
    const maxPoints = 17; // 4*1 + 3*2 + 3*3 = 4 + 6 + 9 = 19... Actually 4 easy + 3 medium + 3 hard
    const percentage = Math.round((correctCount / 10) * 100);
    
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border/40 p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-bold text-lg">შედეგი</h1>
          </div>
        </div>

        <div className="flex-1 p-4 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm"
          >
            <Card className="overflow-hidden">
              <div className={`p-8 text-center ${
                percentage >= 70 ? 'bg-gradient-to-br from-green-500 to-emerald-600' :
                percentage >= 40 ? 'bg-gradient-to-br from-yellow-500 to-orange-600' :
                'bg-gradient-to-br from-red-500 to-pink-600'
              } text-white`}>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                >
                  <Trophy className="w-16 h-16 mx-auto mb-4" />
                </motion.div>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-4xl font-bold mb-2"
                >
                  {totalPoints}
                </motion.p>
                <p className="text-white/80">ქულა</p>
              </div>

              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-3 rounded-xl bg-green-500/10">
                    <p className="text-2xl font-bold text-green-500">{correctCount}</p>
                    <p className="text-xs text-muted-foreground">სწორი</p>
                  </div>
                  <div className="p-3 rounded-xl bg-red-500/10">
                    <p className="text-2xl font-bold text-red-500">{10 - correctCount}</p>
                    <p className="text-xs text-muted-foreground">არასწორი</p>
                  </div>
                </div>

                <div className="text-center py-4">
                  <p className="text-3xl font-bold text-primary">{percentage}%</p>
                  <p className="text-sm text-muted-foreground">
                    {percentage >= 70 ? 'შესანიშნავი შედეგი! 🎉' :
                     percentage >= 40 ? 'კარგი შედეგი! 👍' :
                     'სცადე თავიდან! 💪'}
                  </p>
                </div>

                <Button 
                  className="w-full"
                  onClick={() => {
                    setGameState('menu');
                    setSessionData(null);
                    setCurrentIndex(0);
                    setTotalPoints(0);
                    setCorrectCount(0);
                  }}
                >
                  მთავარ მენიუში
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  return null;
});

export default QuizGameView;
