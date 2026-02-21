import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WWWQuestion {
  id: string;
  question_text: string;
  category: string;
  difficulty: string;
  correct_answers: string[];
  synonyms: string[];
  allow_partial_match: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
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

    // ==================== START GAME ====================
    if (action === 'start' && req.method === 'POST') {
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'Authentication required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body = await req.json();
      const language = body.language || 'ka';
      const totalRounds = body.total_rounds || 10;

      console.log(`[WWW] Starting game for user ${userId}`);

      // Check for active session
      const { data: activeSession } = await supabase
        .from('www_game_sessions')
        .select('id, current_round, total_rounds')
        .eq('host_user_id', userId)
        .eq('status', 'in_progress')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (activeSession) {
        // Resume existing session
        const { data: currentQuestion } = await supabase
          .from('www_questions')
          .select('id, question_text, category, difficulty')
          .eq('id', activeSession.id)
          .single();

        return new Response(
          JSON.stringify({
            session_id: activeSession.id,
            current_round: activeSession.current_round,
            total_rounds: activeSession.total_rounds,
            is_resume: true
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch random questions
      const { data: allQuestions, error: questionsError } = await supabase
        .from('www_questions')
        .select('id, question_text, category, difficulty, correct_answers, synonyms, allow_partial_match')
        .eq('language', language)
        .eq('is_active', true);

      if (questionsError || !allQuestions || allQuestions.length < totalRounds) {
        return new Response(
          JSON.stringify({ error: 'Not enough questions available' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Shuffle and select questions
      const shuffled = allQuestions.sort(() => Math.random() - 0.5);
      
      // Balance difficulty: 4 easy, 3 medium, 3 hard
      const easy = shuffled.filter(q => q.difficulty === 'easy').slice(0, 4);
      const medium = shuffled.filter(q => q.difficulty === 'medium').slice(0, 3);
      const hard = shuffled.filter(q => q.difficulty === 'hard').slice(0, 3);
      
      const selectedQuestions = [...easy, ...medium, ...hard];
      
      // If not enough balanced, fill with any
      if (selectedQuestions.length < totalRounds) {
        const remaining = shuffled
          .filter(q => !selectedQuestions.find(s => s.id === q.id))
          .slice(0, totalRounds - selectedQuestions.length);
        selectedQuestions.push(...remaining);
      }

      const firstQuestion = selectedQuestions[0];

      // Create session
      const { data: session, error: sessionError } = await supabase
        .from('www_game_sessions')
        .insert({
          host_user_id: userId,
          mode: 'single',
          status: 'in_progress',
          current_round: 1,
          total_rounds: totalRounds,
          current_question_id: firstQuestion.id,
          round_started_at: new Date().toISOString(),
          language
        })
        .select('id')
        .single();

      if (sessionError) {
        console.error('[WWW] Session create error:', sessionError);
        return new Response(
          JSON.stringify({ error: 'Failed to create session' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create participant
      await supabase
        .from('www_game_participants')
        .insert({
          session_id: session.id,
          user_id: userId,
          score: 0,
          correct_answers: 0,
          wrong_answers: 0,
          is_host: true
        });

      // Store questions order in metadata (we'll track via round answers)
      const questionsOrder = selectedQuestions.map(q => q.id);

      console.log(`[WWW] Session ${session.id} created`);

      return new Response(
        JSON.stringify({
          session_id: session.id,
          current_round: 1,
          total_rounds: totalRounds,
          question: {
            id: firstQuestion.id,
            question_text: firstQuestion.question_text,
            category: firstQuestion.category,
            difficulty: firstQuestion.difficulty
          },
          questions_ids: questionsOrder,
          is_resume: false
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ==================== SUBMIT ANSWER ====================
    if (action === 'answer' && req.method === 'POST') {
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'Authentication required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body = await req.json();
      const { session_id, question_id, answer, response_time_ms } = body;

      if (!session_id || !question_id) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[WWW] Answer: session=${session_id}, question=${question_id}, answer="${answer}"`);

      // Get session
      const { data: session, error: sessionError } = await supabase
        .from('www_game_sessions')
        .select('*')
        .eq('id', session_id)
        .single();

      if (sessionError || !session) {
        return new Response(
          JSON.stringify({ error: 'Session not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (session.host_user_id !== userId) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get question
      const { data: question, error: questionError } = await supabase
        .from('www_questions')
        .select('*')
        .eq('id', question_id)
        .single();

      if (questionError || !question) {
        return new Response(
          JSON.stringify({ error: 'Question not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Normalize answer for comparison
      const normalizeText = (text: string) => {
        return text
          .toLowerCase()
          .trim()
          .replace(/[.,!?;:'"()-]/g, '')
          .replace(/\s+/g, ' ');
      };

      const userAnswer = normalizeText(answer || '');
      
      // Check if answer is correct
      let isCorrect = false;
      const allValidAnswers = [
        ...(question.correct_answers || []),
        ...(question.synonyms || [])
      ];

      for (const validAnswer of allValidAnswers) {
        const normalizedValid = normalizeText(validAnswer);
        
        if (userAnswer === normalizedValid) {
          isCorrect = true;
          break;
        }
        
        // Partial match if allowed
        if (question.allow_partial_match) {
          if (userAnswer.includes(normalizedValid) || normalizedValid.includes(userAnswer)) {
            if (userAnswer.length >= 3 && normalizedValid.length >= 3) {
              isCorrect = true;
              break;
            }
          }
        }
      }

      // Calculate points
      let pointsAwarded = 0;
      if (isCorrect) {
        const basePoints = question.difficulty === 'easy' ? 10 : 
                          question.difficulty === 'medium' ? 15 : 20;
        
        // Time bonus (max 50% extra for fast answers)
        const timeBonus = Math.max(0, Math.min(0.5, (30000 - (response_time_ms || 30000)) / 60000));
        pointsAwarded = Math.round(basePoints * (1 + timeBonus));
      }

      // Get participant
      const { data: participant } = await supabase
        .from('www_game_participants')
        .select('id, score, correct_answers, wrong_answers')
        .eq('session_id', session_id)
        .eq('user_id', userId)
        .single();

      if (participant) {
        // Save round answer
        await supabase
          .from('www_round_answers')
          .insert({
            session_id,
            participant_id: participant.id,
            question_id,
            round_number: session.current_round,
            answer_text: answer || '',
            is_correct: isCorrect,
            points_awarded: pointsAwarded,
            response_time_ms: response_time_ms || 0
          });

        // Update participant score
        await supabase
          .from('www_game_participants')
          .update({
            score: (participant.score || 0) + pointsAwarded,
            correct_answers: (participant.correct_answers || 0) + (isCorrect ? 1 : 0),
            wrong_answers: (participant.wrong_answers || 0) + (isCorrect ? 0 : 1)
          })
          .eq('id', participant.id);
      }

      console.log(`[WWW] Answer: correct=${isCorrect}, points=${pointsAwarded}`);

      return new Response(
        JSON.stringify({
          is_correct: isCorrect,
          correct_answer: question.correct_answers[0],
          points_awarded: pointsAwarded,
          total_score: (participant?.score || 0) + pointsAwarded
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ==================== NEXT QUESTION ====================
    if (action === 'next' && req.method === 'POST') {
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'Authentication required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body = await req.json();
      const { session_id, next_question_id } = body;

      // Get session
      const { data: session } = await supabase
        .from('www_game_sessions')
        .select('*')
        .eq('id', session_id)
        .eq('host_user_id', userId)
        .single();

      if (!session) {
        return new Response(
          JSON.stringify({ error: 'Session not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const newRound = session.current_round + 1;

      if (newRound > session.total_rounds) {
        return new Response(
          JSON.stringify({ error: 'Game completed', game_over: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get next question
      const { data: nextQuestion } = await supabase
        .from('www_questions')
        .select('id, question_text, category, difficulty')
        .eq('id', next_question_id)
        .single();

      if (!nextQuestion) {
        return new Response(
          JSON.stringify({ error: 'Question not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update session
      await supabase
        .from('www_game_sessions')
        .update({
          current_round: newRound,
          current_question_id: next_question_id,
          round_started_at: new Date().toISOString()
        })
        .eq('id', session_id);

      return new Response(
        JSON.stringify({
          current_round: newRound,
          question: nextQuestion
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ==================== FINISH GAME ====================
    if (action === 'finish' && req.method === 'POST') {
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'Authentication required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body = await req.json();
      const { session_id } = body;

      console.log(`[WWW] Finishing session ${session_id}`);

      // Get session and participant
      const { data: session } = await supabase
        .from('www_game_sessions')
        .select('*')
        .eq('id', session_id)
        .eq('host_user_id', userId)
        .single();

      if (!session) {
        return new Response(
          JSON.stringify({ error: 'Session not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: participant } = await supabase
        .from('www_game_participants')
        .select('*')
        .eq('session_id', session_id)
        .eq('user_id', userId)
        .single();

      // Update session status
      await supabase
        .from('www_game_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          winner_id: userId
        })
        .eq('id', session_id);

      // Update user stats
      const { data: existingStats } = await supabase
        .from('www_user_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (existingStats) {
        await supabase
          .from('www_user_stats')
          .update({
            total_games: existingStats.total_games + 1,
            games_won: existingStats.games_won + 1,
            total_points: existingStats.total_points + (participant?.score || 0),
            total_correct: existingStats.total_correct + (participant?.correct_answers || 0),
            total_wrong: existingStats.total_wrong + (participant?.wrong_answers || 0),
            last_played_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);
      } else {
        await supabase
          .from('www_user_stats')
          .insert({
            user_id: userId,
            total_games: 1,
            games_won: 1,
            total_points: participant?.score || 0,
            total_correct: participant?.correct_answers || 0,
            total_wrong: participant?.wrong_answers || 0,
            last_played_at: new Date().toISOString()
          });
      }

      // Update leaderboard
      const { data: existingLeaderboard } = await supabase
        .from('www_leaderboard')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (existingLeaderboard) {
        await supabase
          .from('www_leaderboard')
          .update({
            total_points: existingLeaderboard.total_points + (participant?.score || 0),
            games_played: existingLeaderboard.games_played + 1,
            games_won: existingLeaderboard.games_won + 1,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);
      } else {
        await supabase
          .from('www_leaderboard')
          .insert({
            user_id: userId,
            total_points: participant?.score || 0,
            games_played: 1,
            games_won: 1
          });
      }

      console.log(`[WWW] Game finished. Score: ${participant?.score}`);

      return new Response(
        JSON.stringify({
          final_score: participant?.score || 0,
          correct_answers: participant?.correct_answers || 0,
          wrong_answers: participant?.wrong_answers || 0
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ==================== GET LEADERBOARD ====================
    if (action === 'leaderboard' && req.method === 'GET') {
      const { data: leaderboard } = await supabase
        .from('www_leaderboard')
        .select('user_id, total_points, games_played, games_won')
        .order('total_points', { ascending: false })
        .limit(10);

      if (leaderboard && leaderboard.length > 0) {
        const userIds = leaderboard.map(l => l.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url')
          .in('user_id', userIds);

        const leaderboardWithProfiles = leaderboard.map(item => ({
          ...item,
          profile: profiles?.find(p => p.user_id === item.user_id)
        }));

        return new Response(
          JSON.stringify({ leaderboard: leaderboardWithProfiles }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ leaderboard: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[WWW] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
