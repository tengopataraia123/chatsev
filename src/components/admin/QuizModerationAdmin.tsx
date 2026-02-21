import { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, X, Eye, Clock, HelpCircle, Trophy, AlertCircle, Search, Filter, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { logAdminAction } from '@/hooks/useAdminActionLog';
import { formatDistanceToNow } from 'date-fns';
import { ka } from 'date-fns/locale';

interface Quiz {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: string;
  total_points: number;
  created_at: string;
  profile?: {
    username: string;
    avatar_url: string | null;
  };
  questions_count?: number;
}

const QuizModerationAdmin = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewQuiz, setPreviewQuiz] = useState<Quiz | null>(null);
  const [previewQuestions, setPreviewQuestions] = useState<any[]>([]);
  const [rejectModal, setRejectModal] = useState<{ quiz: Quiz; reason: string } | null>(null);

  useEffect(() => {
    fetchQuizzes();
  }, [activeTab]);

  const fetchQuizzes = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('status', activeTab)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching quizzes:', error);
      setLoading(false);
      return;
    }

    // Get profiles and question counts
    const quizzesWithDetails = await Promise.all(
      (data || []).map(async (quiz) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('user_id', quiz.user_id)
          .single();

        const { count } = await supabase
          .from('quiz_questions')
          .select('id', { count: 'exact', head: true })
          .eq('quiz_id', quiz.id);

        return {
          ...quiz,
          profile,
          questions_count: count || 0
        };
      })
    );

    setQuizzes(quizzesWithDetails);
    setLoading(false);
  };

  const handlePreview = async (quiz: Quiz) => {
    setPreviewQuiz(quiz);
    
    const { data: questions } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quiz.id)
      .order('order_index', { ascending: true });

    setPreviewQuestions(questions || []);
  };

  const handleApprove = async (quiz: Quiz) => {
    try {
      await supabase
        .from('quizzes')
        .update({ status: 'approved' })
        .eq('id', quiz.id);

      // Log moderation action
      await supabase.from('quiz_moderation').insert({
        quiz_id: quiz.id,
        admin_id: user?.id,
        action: 'approve',
        reason: null
      });

      // Log admin action
      await logAdminAction({
        actionType: 'approve',
        actionCategory: 'content',
        targetUserId: quiz.user_id,
        targetContentId: quiz.id,
        targetContentType: 'quiz',
        description: `დამტკიცდა ვიქტორინა: ${quiz.title}`
      });

      // Notify author
      await supabase.from('notifications').insert({
        user_id: quiz.user_id,
        from_user_id: user?.id,
        type: 'quiz_approved',
        message: `თქვენი ვიქტორინა "${quiz.title}" დამტკიცდა`
      });

      toast({ title: 'ვიქტორინა დამტკიცდა' });
      fetchQuizzes();
    } catch (error) {
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;

    try {
      await supabase
        .from('quizzes')
        .update({ status: 'rejected' })
        .eq('id', rejectModal.quiz.id);

      // Log moderation action
      await supabase.from('quiz_moderation').insert({
        quiz_id: rejectModal.quiz.id,
        admin_id: user?.id,
        action: 'reject',
        reason: rejectModal.reason
      });

      // Log admin action
      await logAdminAction({
        actionType: 'reject',
        actionCategory: 'content',
        targetUserId: rejectModal.quiz.user_id,
        targetContentId: rejectModal.quiz.id,
        targetContentType: 'quiz',
        description: `უარყოფილია ვიქტორინა: ${rejectModal.quiz.title}`,
        metadata: { reason: rejectModal.reason }
      });

      // Notify author
      await supabase.from('notifications').insert({
        user_id: rejectModal.quiz.user_id,
        from_user_id: user?.id,
        type: 'quiz_rejected',
        message: `თქვენი ვიქტორინა "${rejectModal.quiz.title}" უარყოფილია. მიზეზი: ${rejectModal.reason}`
      });

      toast({ title: 'ვიქტორინა უარყოფილია' });
      setRejectModal(null);
      fetchQuizzes();
    } catch (error) {
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  const handleDelete = async (quiz: Quiz) => {
    try {
      await supabase.from('quizzes').delete().eq('id', quiz.id);

      await logAdminAction({
        actionType: 'delete',
        actionCategory: 'content',
        targetUserId: quiz.user_id,
        targetContentId: quiz.id,
        targetContentType: 'quiz',
        description: `წაიშალა ვიქტორინა: ${quiz.title}`
      });

      toast({ title: 'ვიქტორინა წაიშალა' });
      fetchQuizzes();
    } catch (error) {
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  const filteredQuizzes = quizzes.filter(q => 
    q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.profile?.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-500">მოლოდინში</Badge>;
      case 'approved':
        return <Badge variant="secondary" className="bg-green-500/20 text-green-500">დამტკიცებული</Badge>;
      case 'rejected':
        return <Badge variant="secondary" className="bg-destructive/20 text-destructive">უარყოფილი</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-purple-500" />
          ვიქტორინების მოდერაცია
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ძებნა სათაურით ან ავტორით..."
            className="pl-9"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="w-full">
            <TabsTrigger value="pending" className="flex-1">
              <Clock className="w-4 h-4 mr-1" />
              მოლოდინში
            </TabsTrigger>
            <TabsTrigger value="approved" className="flex-1">
              <Check className="w-4 h-4 mr-1" />
              დამტკიცებული
            </TabsTrigger>
            <TabsTrigger value="rejected" className="flex-1">
              <X className="w-4 h-4 mr-1" />
              უარყოფილი
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : filteredQuizzes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <HelpCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>ვიქტორინები არ მოიძებნა</p>
              </div>
            ) : (
              <ScrollArea className="h-[calc(100vh-350px)] min-h-[300px]">
              <div className="space-y-3">
                {filteredQuizzes.map(quiz => (
                  <div
                    key={quiz.id}
                    className="p-4 bg-secondary/30 rounded-xl border border-border"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar>
                        <AvatarImage src={quiz.profile?.avatar_url || undefined} />
                        <AvatarFallback className="bg-purple-500/20 text-purple-500">
                          {quiz.profile?.username?.[0]?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium truncate">{quiz.title}</p>
                          {getStatusBadge(quiz.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          @{quiz.profile?.username || 'უცნობი'} • {formatDistanceToNow(new Date(quiz.created_at), { locale: ka, addSuffix: true })}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <HelpCircle className="w-3 h-3" />
                            {quiz.questions_count} კითხვა
                          </span>
                          <span className="flex items-center gap-1">
                            <Trophy className="w-3 h-3" />
                            {quiz.total_points} ქულა
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handlePreview(quiz)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        
                        {activeTab === 'pending' && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-green-500 hover:text-green-600 hover:bg-green-500/10"
                              onClick={() => handleApprove(quiz)}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setRejectModal({ quiz, reason: '' })}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        )}

                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(quiz)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Preview Dialog */}
      <Dialog open={!!previewQuiz} onOpenChange={() => setPreviewQuiz(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewQuiz?.title}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {previewQuiz?.description && (
              <p className="text-muted-foreground">{previewQuiz.description}</p>
            )}
            
            <div className="space-y-3">
              {previewQuestions.map((q, index) => (
                <div key={q.id} className="p-4 bg-secondary/30 rounded-xl">
                  <p className="font-medium mb-2">
                    {index + 1}. {q.question}
                  </p>
                  <div className="space-y-1">
                    {Array.isArray(q.options) && q.options.map((opt: string, optIndex: number) => (
                      <div
                        key={optIndex}
                        className={`p-2 rounded-lg text-sm ${
                          optIndex === q.correct_answer
                            ? 'bg-green-500/20 text-green-500 border border-green-500/50'
                            : 'bg-secondary'
                        }`}
                      >
                        {String.fromCharCode(65 + optIndex)}. {opt}
                        {optIndex === q.correct_answer && ' ✓'}
                      </div>
                    ))}
                  </div>
                  {q.explanation && (
                    <p className="text-xs text-muted-foreground mt-2">
                      ახსნა: {q.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            {previewQuiz?.status === 'pending' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setRejectModal({ quiz: previewQuiz, reason: '' });
                    setPreviewQuiz(null);
                  }}
                >
                  უარყოფა
                </Button>
                <Button
                  onClick={() => {
                    handleApprove(previewQuiz);
                    setPreviewQuiz(null);
                  }}
                >
                  დამტკიცება
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectModal} onOpenChange={() => setRejectModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              ვიქტორინის უარყოფა
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              მიუთითეთ უარყოფის მიზეზი (აუცილებელი)
            </p>
            <Textarea
              value={rejectModal?.reason || ''}
              onChange={(e) => setRejectModal(prev => prev ? { ...prev, reason: e.target.value } : null)}
              placeholder="მიზეზი..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectModal(null)}>
              გაუქმება
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectModal?.reason.trim()}
            >
              უარყოფა
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default QuizModerationAdmin;
