import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QuestionForClient {
  id: string;
  question_text: string;
  options: string[];
  difficulty: string;
  category: string;
}

interface SessionQuestion {
  id: string;
  question_text: string;
  options: string[];
  difficulty: string;
  category: string;
  correct_index: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    // Get action from path: /quiz-v2/start, /quiz-v2/answer, etc.
    const action = pathParts[1] || '';

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        userId = user.id;
      }
    }

    // ==================== START SESSION ====================
    if (action === 'start' && req.method === 'POST') {
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'Authentication required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body = await req.json();
      const language = body.language || 'ka';
      const category = body.category || null;

      console.log(`[QuizV2] Starting session for user ${userId}, language: ${language}`);

      // First check for active (incomplete) session
      const { data: activeSession, error: activeSessionError } = await supabase
        .from('quiz_v2_sessions')
        .select('id, questions_order, total_points, correct_count')
        .eq('user_id', userId)
        .eq('is_completed', false)
        .order('started_at', { ascending: false })
        .limit(1);

      if (activeSessionError) {
        console.error('[QuizV2] Active session check error:', activeSessionError);
      }

      // If there's an active session, resume it
      if (activeSession && activeSession.length > 0) {
        const session = activeSession[0];
        const questionsOrder = session.questions_order as Array<{id: string, shuffled_correct_index: number}>;
        
        console.log(`[QuizV2] Found active session ${session.id}, resuming...`);

        // Get answered question IDs
        const { data: answeredQuestions } = await supabase
          .from('quiz_v2_session_answers')
          .select('question_id')
          .eq('session_id', session.id);

        const answeredIds = new Set(answeredQuestions?.map(a => a.question_id) || []);
        const currentIndex = answeredIds.size;

        // Fetch questions data for the session
        const questionIds = questionsOrder.map(q => q.id);
        const { data: questionsData } = await supabase
          .from('quiz_v2_questions')
          .select('id, question_text, options, difficulty, category, correct_index')
          .in('id', questionIds);

        if (!questionsData) {
          return new Response(
            JSON.stringify({ error: 'Failed to fetch session questions' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Fisher-Yates shuffle for options
        const shuffleArray = <T>(arr: T[]): T[] => {
          const shuffled = [...arr];
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
          return shuffled;
        };

        // Rebuild questions in session order with stored shuffled options
        const questionsForClient = questionsOrder.map((qOrder: { id: string; shuffled_correct_index: number; shuffled_options?: string[] }) => {
          const q = questionsData.find(qd => qd.id === qOrder.id);
          if (!q) return null;
          
          // Use stored shuffled options if available, otherwise use original
          const options = qOrder.shuffled_options || q.options;
          
          return {
            id: q.id,
            question_text: q.question_text,
            options: options,
            difficulty: q.difficulty,
            category: q.category
          };
        }).filter(Boolean);

        return new Response(
          JSON.stringify({ 
            session_id: session.id, 
            questions: questionsForClient,
            current_index: currentIndex,
            total_points: session.total_points || 0,
            correct_count: session.correct_count || 0,
            is_resume: true
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check 12-hour cooldown (only for completed sessions)
      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
      
      const { data: recentSession, error: cooldownError } = await supabase
        .from('quiz_v2_sessions')
        .select('id, started_at')
        .eq('user_id', userId)
        .eq('is_completed', true)
        .gte('started_at', twelveHoursAgo)
        .order('started_at', { ascending: false })
        .limit(1);

      if (cooldownError) {
        console.error('[QuizV2] Cooldown check error:', cooldownError);
      }

      if (recentSession && recentSession.length > 0) {
        const lastPlayedAt = new Date(recentSession[0].started_at);
        const nextAvailableAt = new Date(lastPlayedAt.getTime() + 12 * 60 * 60 * 1000);
        const hoursRemaining = Math.ceil((nextAvailableAt.getTime() - Date.now()) / (1000 * 60 * 60));
        
        return new Response(
          JSON.stringify({ 
            error: 'cooldown', 
            message: `შემდეგი თამაში შეგიძლიათ ${hoursRemaining} საათში`,
            next_available_at: nextAvailableAt.toISOString(),
            hours_remaining: hoursRemaining
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch 10 random questions
      let query = supabase
        .from('quiz_v2_questions')
        .select('id, question_text, options, difficulty, category, correct_index')
        .eq('language', language)
        .eq('is_active', true);

      if (category) {
        query = query.eq('category', category);
      }

      const { data: allQuestions, error: questionsError } = await query;

      if (questionsError) {
        console.error('[QuizV2] Error fetching questions:', questionsError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch questions' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!allQuestions || allQuestions.length < 10) {
        return new Response(
          JSON.stringify({ error: 'Not enough questions available', available: allQuestions?.length || 0 }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Group questions by difficulty
      const easyQuestions = allQuestions.filter(q => q.difficulty === 'easy');
      const mediumQuestions = allQuestions.filter(q => q.difficulty === 'medium');
      const hardQuestions = allQuestions.filter(q => q.difficulty === 'hard');
      
      // Fisher-Yates shuffle for truly random distribution
      const shuffleArray = <T>(arr: T[]): T[] => {
        const shuffled = [...arr];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
      };
      
      const shuffledEasy = shuffleArray(easyQuestions);
      const shuffledMedium = shuffleArray(mediumQuestions);
      const shuffledHard = shuffleArray(hardQuestions);
      
      // Select: 4 easy, 3 medium, 3 hard - ordered by difficulty (easy first, then medium, then hard)
      interface SessionQuestion {
        id: string;
        question_text: string;
        options: string[];
        difficulty: string;
        category: string;
        correct_index: number;
      }

      const selectedQuestions: SessionQuestion[] = [
        ...shuffledEasy.slice(0, 4),
        ...shuffledMedium.slice(0, 3),
        ...shuffledHard.slice(0, 3)
      ] as SessionQuestion[];
      
      // Shuffle options for each question and track new correct index + shuffled options
      const questionsWithShuffledOptions = selectedQuestions.map(q => {
        // Create array of indices [0, 1, 2, 3]
        const indices = q.options.map((_, i) => i);
        // Shuffle indices
        const shuffledIndices = shuffleArray(indices);
        // Create shuffled options array
        const shuffledOptions = shuffledIndices.map(i => q.options[i]);
        // Find where the correct answer ended up
        const newCorrectIndex = shuffledIndices.indexOf(q.correct_index);
        
        return {
          ...q,
          options: shuffledOptions,
          shuffled_correct_index: newCorrectIndex,
          shuffled_options: shuffledOptions
        };
      });
      
      // Store question IDs with their shuffled correct indices AND shuffled options
      const questionsOrder = questionsWithShuffledOptions.map(q => ({
        id: q.id,
        shuffled_correct_index: q.shuffled_correct_index,
        shuffled_options: q.shuffled_options
      }));

      // Create session
      const { data: session, error: sessionError } = await supabase
        .from('quiz_v2_sessions')
        .insert({
          user_id: userId,
          language,
          questions_order: questionsOrder
        })
        .select('id')
        .single();

      if (sessionError) {
        console.error('[QuizV2] Error creating session:', sessionError);
        return new Response(
          JSON.stringify({ error: 'Failed to create session' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Return questions with shuffled options (WITHOUT correct_index)
      const questionsForClient: QuestionForClient[] = questionsWithShuffledOptions.map(q => ({
        id: q.id,
        question_text: q.question_text,
        options: q.options,
        difficulty: q.difficulty,
        category: q.category
      }));

      console.log(`[QuizV2] Session ${session.id} created with ${questionsForClient.length} questions`);

      return new Response(
        JSON.stringify({ 
          session_id: session.id, 
          questions: questionsForClient,
          current_index: 0,
          total_points: 0,
          correct_count: 0,
          is_resume: false
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ==================== ANSWER QUESTION ====================
    if (action === 'answer' && req.method === 'POST') {
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'Authentication required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body = await req.json();
      const { session_id, question_id, selected_index } = body;

      if (!session_id || !question_id || selected_index === undefined) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[QuizV2] Answer: session=${session_id}, question=${question_id}, selected=${selected_index}`);

      // Verify session belongs to user and get questions_order with shuffled indices
      const { data: session, error: sessionError } = await supabase
        .from('quiz_v2_sessions')
        .select('id, user_id, is_completed, total_points, correct_count, questions_order')
        .eq('id', session_id)
        .single();

      if (sessionError || !session) {
        return new Response(
          JSON.stringify({ error: 'Session not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (session.user_id !== userId) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (session.is_completed) {
        return new Response(
          JSON.stringify({ error: 'Session already completed' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if already answered
      const { data: existingAnswer } = await supabase
        .from('quiz_v2_session_answers')
        .select('id')
        .eq('session_id', session_id)
        .eq('question_id', question_id)
        .single();

      if (existingAnswer) {
        return new Response(
          JSON.stringify({ error: 'Question already answered' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get question difficulty for points calculation
      const { data: question, error: questionError } = await supabase
        .from('quiz_v2_questions')
        .select('id, difficulty')
        .eq('id', question_id)
        .single();

      if (questionError || !question) {
        return new Response(
          JSON.stringify({ error: 'Question not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get the shuffled correct index from session's questions_order
      const questionsOrder = session.questions_order as Array<{id: string, shuffled_correct_index: number}>;
      const questionData = questionsOrder.find(q => q.id === question_id);
      
      if (!questionData) {
        return new Response(
          JSON.stringify({ error: 'Question not in session' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const shuffledCorrectIndex = questionData.shuffled_correct_index;

      // Calculate points using shuffled correct index
      const isCorrect = selected_index === shuffledCorrectIndex;
      let pointsAwarded = 0;
      
      if (isCorrect) {
        switch (question.difficulty) {
          case 'easy': pointsAwarded = 1; break;
          case 'medium': pointsAwarded = 2; break;
          case 'hard': pointsAwarded = 3; break;
          default: pointsAwarded = 1;
        }
      }

      // Save answer
      const { error: answerError } = await supabase
        .from('quiz_v2_session_answers')
        .insert({
          session_id,
          question_id,
          selected_index,
          is_correct: isCorrect,
          points_awarded: pointsAwarded
        });

      if (answerError) {
        console.error('[QuizV2] Error saving answer:', answerError);
        return new Response(
          JSON.stringify({ error: 'Failed to save answer' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update session totals
      const newTotalPoints = (session.total_points || 0) + pointsAwarded;
      const newCorrectCount = (session.correct_count || 0) + (isCorrect ? 1 : 0);

      await supabase
        .from('quiz_v2_sessions')
        .update({
          total_points: newTotalPoints,
          correct_count: newCorrectCount
        })
        .eq('id', session_id);

      console.log(`[QuizV2] Answer recorded: correct=${isCorrect}, points=${pointsAwarded}, total=${newTotalPoints}`);

      return new Response(
        JSON.stringify({
          is_correct: isCorrect,
          correct_index: shuffledCorrectIndex,
          points_awarded: pointsAwarded,
          total_points_so_far: newTotalPoints,
          correct_count_so_far: newCorrectCount
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ==================== FINISH SESSION ====================
    if (action === 'finish' && req.method === 'POST') {
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'Authentication required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body = await req.json();
      const { session_id } = body;

      if (!session_id) {
        return new Response(
          JSON.stringify({ error: 'Missing session_id' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[QuizV2] Finishing session ${session_id}`);

      // Get session
      const { data: session, error: sessionError } = await supabase
        .from('quiz_v2_sessions')
        .select('*')
        .eq('id', session_id)
        .single();

      if (sessionError || !session) {
        return new Response(
          JSON.stringify({ error: 'Session not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (session.user_id !== userId) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Mark session as completed
      await supabase
        .from('quiz_v2_sessions')
        .update({
          is_completed: true,
          finished_at: new Date().toISOString()
        })
        .eq('id', session_id);

      // Update user stats
      const { data: existingStats } = await supabase
        .from('quiz_v2_user_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      const accuracy = session.correct_count > 0 ? (session.correct_count / 10) * 100 : 0;

      if (existingStats) {
        const newTotalPoints = existingStats.total_points + session.total_points;
        const newQuizzesPlayed = existingStats.quizzes_played + 1;
        const newCorrectAnswers = existingStats.correct_answers + session.correct_count;
        const newTotalAnswers = existingStats.total_answers + 10;

        await supabase
          .from('quiz_v2_user_stats')
          .update({
            total_points: newTotalPoints,
            quizzes_played: newQuizzesPlayed,
            correct_answers: newCorrectAnswers,
            total_answers: newTotalAnswers,
            last_played_at: new Date().toISOString()
          })
          .eq('user_id', userId);
      } else {
        await supabase
          .from('quiz_v2_user_stats')
          .insert({
            user_id: userId,
            total_points: session.total_points,
            quizzes_played: 1,
            correct_answers: session.correct_count,
            total_answers: 10,
            last_played_at: new Date().toISOString()
          });
      }

      console.log(`[QuizV2] Session completed: points=${session.total_points}, correct=${session.correct_count}`);

      return new Response(
        JSON.stringify({
          total_points: session.total_points,
          correct_count: session.correct_count,
          accuracy: Math.round(accuracy)
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ==================== LEADERBOARD ====================
    if (action === 'leaderboard' && req.method === 'GET') {
      const range = url.searchParams.get('range') || 'all';
      const limit = parseInt(url.searchParams.get('limit') || '50');

      console.log(`[QuizV2] Fetching leaderboard, range: ${range}, limit: ${limit}`);

      let query = supabase
        .from('quiz_v2_user_stats')
        .select('user_id, total_points, quizzes_played, correct_answers, total_answers, last_played_at')
        .order('total_points', { ascending: false })
        .limit(limit);

      if (range === '7d') {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('last_played_at', sevenDaysAgo);
      } else if (range === '30d') {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('last_played_at', thirtyDaysAgo);
      }

      const { data: stats, error: statsError } = await query;

      if (statsError) {
        console.error('[QuizV2] Error fetching leaderboard:', statsError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch leaderboard' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch user profiles
      const userIds = stats?.map(s => s.user_id) || [];
      
      let profiles: Record<string, { username: string; avatar_url: string | null }> = {};
      
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url')
          .in('user_id', userIds);

        if (profilesData) {
          profiles = profilesData.reduce((acc, p) => {
            acc[p.user_id] = { username: p.username, avatar_url: p.avatar_url };
            return acc;
          }, {} as Record<string, { username: string; avatar_url: string | null }>);
        }
      }

      const leaderboard = stats?.map((s, index) => ({
        rank: index + 1,
        user_id: s.user_id,
        username: profiles[s.user_id]?.username || 'Unknown',
        avatar_url: profiles[s.user_id]?.avatar_url,
        total_points: s.total_points,
        quizzes_played: s.quizzes_played,
        accuracy: s.total_answers > 0 ? Math.round((s.correct_answers / s.total_answers) * 100) : 0,
        last_played_at: s.last_played_at
      })) || [];

      return new Response(
        JSON.stringify({ leaderboard }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ==================== CHECK COOLDOWN ====================
    if (action === 'cooldown' && req.method === 'GET') {
      if (!userId) {
        return new Response(
          JSON.stringify({ can_play: false, error: 'Authentication required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
      
      const { data: recentSession } = await supabase
        .from('quiz_v2_sessions')
        .select('started_at')
        .eq('user_id', userId)
        .eq('is_completed', true)
        .gte('started_at', twelveHoursAgo)
        .order('started_at', { ascending: false })
        .limit(1);

      if (recentSession && recentSession.length > 0) {
        const lastPlayedAt = new Date(recentSession[0].started_at);
        const nextAvailableAt = new Date(lastPlayedAt.getTime() + 12 * 60 * 60 * 1000);
        const hoursRemaining = Math.ceil((nextAvailableAt.getTime() - Date.now()) / (1000 * 60 * 60));
        
        return new Response(
          JSON.stringify({ 
            can_play: false, 
            next_available_at: nextAvailableAt.toISOString(),
            hours_remaining: hoursRemaining
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ can_play: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Unknown action' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[QuizV2] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
