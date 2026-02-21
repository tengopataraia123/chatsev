import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  HelpCircle,
  Plus,
  Search,
  Edit2,
  Trash2,
  Bot,
  BarChart3,
  Loader2,
  Check,
  X,
  RefreshCw
} from 'lucide-react';

interface WWWQuestion {
  id: string;
  question_text: string;
  correct_answers: string[];
  category: string;
  difficulty: string;
  language: string;
  synonyms: string[] | null;
  allow_partial_match: boolean;
  is_active: boolean;
  created_at: string;
}

interface BotProfile {
  id: string;
  display_name: string;
  profile_type: string;
  accuracy_easy_min: number;
  accuracy_easy_max: number;
  accuracy_medium_min: number;
  accuracy_medium_max: number;
  accuracy_hard_min: number;
  accuracy_hard_max: number;
  response_time_min: number;
  response_time_max: number;
  timeout_chance: number;
  is_active: boolean;
}

interface WWWModuleAdminProps {
  onBack: () => void;
}

export default function WWWModuleAdmin({ onBack }: WWWModuleAdminProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('questions');
  const [questions, setQuestions] = useState<WWWQuestion[]>([]);
  const [bots, setBots] = useState<BotProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  
  // Question form state
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<WWWQuestion | null>(null);
  
  interface QuestionFormState {
    question_text: string;
    correct_answers: string;
    category: string;
    difficulty: 'easy' | 'medium' | 'hard';
    synonyms: string;
    allow_partial_match: boolean;
  }
  
  const defaultFormState: QuestionFormState = {
    question_text: '',
    correct_answers: '',
    category: '',
    difficulty: 'medium',
    synonyms: '',
    allow_partial_match: false
  };
  
  const [questionForm, setQuestionForm] = useState<QuestionFormState>(defaultFormState);

  // Stats
  const [stats, setStats] = useState({
    totalQuestions: 0,
    activeQuestions: 0,
    easyCount: 0,
    mediumCount: 0,
    hardCount: 0,
    categories: [] as string[]
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchQuestions(), fetchBots()]);
    setLoading(false);
  };

  const fetchQuestions = async () => {
    const { data, error } = await supabase
      .from('www_questions')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setQuestions(data);
      calculateStats(data);
    }
  };

  const fetchBots = async () => {
    const { data, error } = await supabase
      .from('www_bot_profiles')
      .select('*')
      .order('display_name');

    if (!error && data) {
      setBots(data);
    }
  };

  const calculateStats = (data: WWWQuestion[]) => {
    const categories = [...new Set(data.map(q => q.category))];
    setStats({
      totalQuestions: data.length,
      activeQuestions: data.filter(q => q.is_active).length,
      easyCount: data.filter(q => q.difficulty === 'easy').length,
      mediumCount: data.filter(q => q.difficulty === 'medium').length,
      hardCount: data.filter(q => q.difficulty === 'hard').length,
      categories
    });
  };

  const handleSaveQuestion = async () => {
    const correctAnswersArray = questionForm.correct_answers
      .split(',')
      .map(a => a.trim())
      .filter(a => a);
    
    const synonymsArray = questionForm.synonyms
      ? questionForm.synonyms.split(',').map(s => s.trim()).filter(s => s)
      : null;

    const questionData = {
      question_text: questionForm.question_text,
      correct_answers: correctAnswersArray,
      category: questionForm.category,
      difficulty: questionForm.difficulty,
      synonyms: synonymsArray,
      allow_partial_match: questionForm.allow_partial_match,
      language: 'ka'
    };

    if (editingQuestion) {
      const { error } = await supabase
        .from('www_questions')
        .update(questionData)
        .eq('id', editingQuestion.id);

      if (error) {
        toast({ title: 'შეცდომა', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'კითხვა განახლდა' });
    } else {
      const { error } = await supabase
        .from('www_questions')
        .insert(questionData);

      if (error) {
        toast({ title: 'შეცდომა', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'კითხვა დაემატა' });
    }

    setIsQuestionDialogOpen(false);
    resetQuestionForm();
    fetchQuestions();
  };

  const handleEditQuestion = (question: WWWQuestion) => {
    setEditingQuestion(question);
    setQuestionForm({
      question_text: question.question_text,
      correct_answers: question.correct_answers.join(', '),
      category: question.category,
      difficulty: question.difficulty as 'easy' | 'medium' | 'hard',
      synonyms: question.synonyms?.join(', ') || '',
      allow_partial_match: question.allow_partial_match
    });
    setIsQuestionDialogOpen(true);
  };

  const handleDeleteQuestion = async (id: string) => {
    const { error } = await supabase
      .from('www_questions')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'შეცდომა', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'კითხვა წაიშალა' });
    fetchQuestions();
  };

  const toggleQuestionActive = async (id: string, isActive: boolean) => {
    await supabase.from('www_questions').update({ is_active: isActive }).eq('id', id);
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, is_active: isActive } : q));
  };

  const toggleBotActive = async (id: string, isActive: boolean) => {
    await supabase.from('www_bot_profiles').update({ is_active: isActive }).eq('id', id);
    setBots(prev => prev.map(b => b.id === id ? { ...b, is_active: isActive } : b));
    toast({ title: 'ბოტის სტატუსი განახლდა' });
  };

  const resetQuestionForm = () => {
    setEditingQuestion(null);
    setQuestionForm({
      question_text: '',
      correct_answers: '',
      category: '',
      difficulty: 'medium',
      synonyms: '',
      allow_partial_match: false
    });
  };

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.question_text.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || q.category === categoryFilter;
    const matchesDifficulty = difficultyFilter === 'all' || q.difficulty === difficultyFilter;
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'easy': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'medium': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'hard': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return '';
    }
  };

  const getProfileTypeColor = (type: string) => {
    switch (type) {
      case 'beginner': return 'bg-green-500/10 text-green-500';
      case 'average': return 'bg-blue-500/10 text-blue-500';
      case 'expert': return 'bg-purple-500/10 text-purple-500';
      case 'gambler': return 'bg-orange-500/10 text-orange-500';
      case 'analyst': return 'bg-cyan-500/10 text-cyan-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <HelpCircle className="h-6 w-6 text-primary" />
            რა? სად? როდის?
          </h2>
          <p className="text-sm text-muted-foreground">კითხვებისა და ბოტების მართვა</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-1" />
          განახლება
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">{stats.totalQuestions}</div>
            <div className="text-xs text-muted-foreground">სულ კითხვები</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-500">{stats.easyCount}</div>
            <div className="text-xs text-muted-foreground">მარტივი</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-500">{stats.mediumCount}</div>
            <div className="text-xs text-muted-foreground">საშუალო</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-500">{stats.hardCount}</div>
            <div className="text-xs text-muted-foreground">რთული</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="questions" className="gap-1">
            <HelpCircle className="h-4 w-4" />
            კითხვები
          </TabsTrigger>
          <TabsTrigger value="bots" className="gap-1">
            <Bot className="h-4 w-4" />
            ბოტები
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-1">
            <BarChart3 className="h-4 w-4" />
            სტატისტიკა
          </TabsTrigger>
        </TabsList>

        {/* Questions Tab */}
        <TabsContent value="questions" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ძებნა..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="კატეგორია" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ყველა</SelectItem>
                {stats.categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="სირთულე" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ყველა</SelectItem>
                <SelectItem value="easy">მარტივი</SelectItem>
                <SelectItem value="medium">საშუალო</SelectItem>
                <SelectItem value="hard">რთული</SelectItem>
              </SelectContent>
            </Select>
            <Dialog open={isQuestionDialogOpen} onOpenChange={(open) => {
              setIsQuestionDialogOpen(open);
              if (!open) resetQuestionForm();
            }}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1">
                  <Plus className="h-4 w-4" />
                  დამატება
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>
                    {editingQuestion ? 'კითხვის რედაქტირება' : 'ახალი კითხვა'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>კითხვა</Label>
                    <Textarea
                      value={questionForm.question_text}
                      onChange={(e) => setQuestionForm(prev => ({ ...prev, question_text: e.target.value }))}
                      placeholder="შეიყვანეთ კითხვა..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label>სწორი პასუხები (მძიმით გამოყოფილი)</Label>
                    <Input
                      value={questionForm.correct_answers}
                      onChange={(e) => setQuestionForm(prev => ({ ...prev, correct_answers: e.target.value }))}
                      placeholder="პასუხი 1, პასუხი 2, ..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>კატეგორია</Label>
                      <Input
                        value={questionForm.category}
                        onChange={(e) => setQuestionForm(prev => ({ ...prev, category: e.target.value }))}
                        placeholder="მაგ: ისტორია"
                      />
                    </div>
                    <div>
                      <Label>სირთულე</Label>
                      <Select
                        value={questionForm.difficulty}
                        onValueChange={(v) => setQuestionForm(prev => ({ ...prev, difficulty: v as 'easy' | 'medium' | 'hard' }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">მარტივი</SelectItem>
                          <SelectItem value="medium">საშუალო</SelectItem>
                          <SelectItem value="hard">რთული</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>სინონიმები (არასავალდებულო)</Label>
                    <Input
                      value={questionForm.synonyms}
                      onChange={(e) => setQuestionForm(prev => ({ ...prev, synonyms: e.target.value }))}
                      placeholder="სინონიმი 1, სინონიმი 2, ..."
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={questionForm.allow_partial_match}
                      onCheckedChange={(c) => setQuestionForm(prev => ({ ...prev, allow_partial_match: c }))}
                    />
                    <Label>ნაწილობრივი დამთხვევის დაშვება</Label>
                  </div>
                  <Button onClick={handleSaveQuestion} className="w-full">
                    {editingQuestion ? 'განახლება' : 'დამატება'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Questions List */}
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {filteredQuestions.map(question => (
                <Card key={question.id} className={!question.is_active ? 'opacity-50' : ''}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-2">{question.question_text}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          <Badge variant="outline" className={getDifficultyColor(question.difficulty)}>
                            {question.difficulty === 'easy' ? 'მარტივი' : question.difficulty === 'medium' ? 'საშუალო' : 'რთული'}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">{question.category}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          პასუხი: {question.correct_answers[0]}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Switch
                          checked={question.is_active}
                          onCheckedChange={(c) => toggleQuestionActive(question.id, c)}
                          className="scale-75"
                        />
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditQuestion(question)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteQuestion(question.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Bots Tab */}
        <TabsContent value="bots" className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {bots.map(bot => (
              <Card key={bot.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bot className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm">{bot.display_name}</h4>
                        <Badge className={`text-xs ${getProfileTypeColor(bot.profile_type)}`}>
                          {bot.profile_type}
                        </Badge>
                      </div>
                    </div>
                    <Switch
                      checked={bot.is_active}
                      onCheckedChange={(c) => toggleBotActive(bot.id, c)}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center p-2 rounded bg-muted">
                      <div className="text-green-500 font-medium">
                        {bot.accuracy_easy_min}-{bot.accuracy_easy_max}%
                      </div>
                      <div className="text-muted-foreground">Easy</div>
                    </div>
                    <div className="text-center p-2 rounded bg-muted">
                      <div className="text-yellow-500 font-medium">
                        {bot.accuracy_medium_min}-{bot.accuracy_medium_max}%
                      </div>
                      <div className="text-muted-foreground">Medium</div>
                    </div>
                    <div className="text-center p-2 rounded bg-muted">
                      <div className="text-red-500 font-medium">
                        {bot.accuracy_hard_min}-{bot.accuracy_hard_max}%
                      </div>
                      <div className="text-muted-foreground">Hard</div>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-2 pt-2 border-t">
                    <span>⏱ {(bot.response_time_min/1000).toFixed(0)}-{(bot.response_time_max/1000).toFixed(0)}წმ</span>
                    <span>⏸ Timeout: {(bot.timeout_chance*100).toFixed(0)}%</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Stats Tab */}
        <TabsContent value="stats" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">კატეგორიების განაწილება</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.categories.map(cat => {
                  const count = questions.filter(q => q.category === cat).length;
                  const percentage = Math.round((count / stats.totalQuestions) * 100);
                  return (
                    <div key={cat} className="flex items-center gap-2">
                      <span className="text-sm w-24 truncate">{cat}</span>
                      <div className="flex-1 bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-12 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">სირთულის განაწილება</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex-1 text-center p-4 rounded-lg bg-green-500/10">
                  <div className="text-3xl font-bold text-green-500">{stats.easyCount}</div>
                  <div className="text-sm text-green-500">მარტივი</div>
                  <div className="text-xs text-muted-foreground">
                    {Math.round((stats.easyCount / stats.totalQuestions) * 100)}%
                  </div>
                </div>
                <div className="flex-1 text-center p-4 rounded-lg bg-yellow-500/10">
                  <div className="text-3xl font-bold text-yellow-500">{stats.mediumCount}</div>
                  <div className="text-sm text-yellow-500">საშუალო</div>
                  <div className="text-xs text-muted-foreground">
                    {Math.round((stats.mediumCount / stats.totalQuestions) * 100)}%
                  </div>
                </div>
                <div className="flex-1 text-center p-4 rounded-lg bg-red-500/10">
                  <div className="text-3xl font-bold text-red-500">{stats.hardCount}</div>
                  <div className="text-sm text-red-500">რთული</div>
                  <div className="text-xs text-muted-foreground">
                    {Math.round((stats.hardCount / stats.totalQuestions) * 100)}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
