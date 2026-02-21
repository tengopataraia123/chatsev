import { useState, useRef } from 'react';
import { X, Plus, GripVertical, Trash2, Settings2, Clock, Eye, MessageSquare, Users, Lock, Globe, User, Image, Smile, ChevronDown, ChevronUp, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { createPendingApproval } from '@/hooks/useModerationQueue';
import { sendFriendContentNotification } from '@/hooks/useFriendNotifications';
import { motion, AnimatePresence, Reorder } from 'framer-motion';

interface CreatePollModalFBProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  contextType?: 'feed' | 'group' | 'profile';
  contextId?: string;
}

interface PollOption {
  id: string;
  text: string;
  emoji?: string;
  imageUrl?: string;
}

const MAX_QUESTION_LENGTH = 200;
const MIN_QUESTION_LENGTH = 5;
const MAX_OPTION_LENGTH = 60;
const MAX_OPTIONS = 12;
const MIN_OPTIONS = 2;

const CreatePollModalFB = ({ isOpen, onClose, onSuccess, contextType = 'feed', contextId }: CreatePollModalFBProps) => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  
  const isAdmin = ['super_admin', 'admin'].includes(userRole || '');
  
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<PollOption[]>([
    { id: '1', text: '' },
    { id: '2', text: '' }
  ]);
  const [showSettings, setShowSettings] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Settings
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [allowMultipleChoice, setAllowMultipleChoice] = useState(false);
  const [maxSelections, setMaxSelections] = useState(3);
  const [allowChangeVote, setAllowChangeVote] = useState(true);
  const [allowUserOptions, setAllowUserOptions] = useState(false);
  const [duration, setDuration] = useState<string>('7d');
  const [showResultsMode, setShowResultsMode] = useState<string>('after_vote');
  const [allowComments, setAllowComments] = useState(true);
  const [visibility, setVisibility] = useState<string>('everyone');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingOptionId, setUploadingOptionId] = useState<string | null>(null);

  if (!isOpen) return null;

  // Only admins can create polls
  if (!isAdmin) {
    return null;
  }

  const handleAddOption = () => {
    if (options.length < MAX_OPTIONS) {
      setOptions([...options, { id: Date.now().toString(), text: '' }]);
    }
  };

  const handleRemoveOption = (id: string) => {
    if (options.length > MIN_OPTIONS) {
      setOptions(options.filter(o => o.id !== id));
    }
  };

  const handleOptionChange = (id: string, text: string) => {
    if (text.length <= MAX_OPTION_LENGTH) {
      setOptions(options.map(o => o.id === id ? { ...o, text } : o));
    }
  };

  const handleOptionImageUpload = async (id: string, file: File) => {
    if (!user) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'სურათი ძალიან დიდია (მაქს 2MB)', variant: 'destructive' });
      return;
    }

    setUploadingOptionId(id);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `poll-options/${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('chat-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('chat-images')
        .getPublicUrl(fileName);

      setOptions(options.map(o => o.id === id ? { ...o, imageUrl: urlData.publicUrl } : o));
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: 'სურათის ატვირთვა ვერ მოხერხდა', variant: 'destructive' });
    } finally {
      setUploadingOptionId(null);
    }
  };

  const removeOptionImage = (id: string) => {
    setOptions(options.map(o => o.id === id ? { ...o, imageUrl: undefined } : o));
  };

  const calculateExpiresAt = (dur: string): string | null => {
    if (dur === 'never') return null;
    
    const now = new Date();
    switch (dur) {
      case '1d': return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
      case '3d': return new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
      case '7d': return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      case '14d': return new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();
      case '30d': return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      default: return null;
    }
  };

  const handleSubmit = async () => {
    if (question.trim().length < MIN_QUESTION_LENGTH) {
      toast({ title: `კითხვა მინიმუმ ${MIN_QUESTION_LENGTH} სიმბოლო უნდა იყოს`, variant: 'destructive' });
      return;
    }

    const validOptions = options.filter(o => o.text.trim());
    if (validOptions.length < MIN_OPTIONS) {
      toast({ title: `მინიმუმ ${MIN_OPTIONS} ვარიანტი საჭიროა`, variant: 'destructive' });
      return;
    }

    if (!user) {
      toast({ title: 'გთხოვთ შედით სისტემაში', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: pollData, error } = await supabase
        .from('polls')
        .insert({
          user_id: user.id,
          question: question.trim(),
          options: validOptions.map(o => o.text.trim()),
          is_anonymous: isAnonymous,
          allow_multiple_choice: allowMultipleChoice,
          max_selections: allowMultipleChoice ? maxSelections : 1,
          allow_change_vote: allowChangeVote,
          allow_user_options: allowUserOptions,
          expires_at: calculateExpiresAt(duration),
          show_results_mode: showResultsMode,
          allow_comments: allowComments,
          visibility,
          context_type: contextType,
          context_id: contextId,
          status: 'approved'
        })
        .select()
        .single();

      if (error) throw error;

      // Send notifications to friends about new poll
      if (pollData) {
        sendFriendContentNotification(user.id, 'poll', pollData.id);
      }

      toast({ 
        title: 'გამოკითხვა შეიქმნა!',
        description: 'გამოკითხვა გამოქვეყნდა Feed-ში'
      });

      resetForm();
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error creating poll:', error);
      toast({ title: 'შეცდომა', description: 'გამოკითხვის შექმნა ვერ მოხერხდა', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setQuestion('');
    setOptions([{ id: '1', text: '' }, { id: '2', text: '' }]);
    setShowSettings(false);
    setIsAnonymous(false);
    setAllowMultipleChoice(false);
    setMaxSelections(3);
    setAllowChangeVote(true);
    setAllowUserOptions(false);
    setDuration('7d');
    setShowResultsMode('after_vote');
    setAllowComments(true);
    setVisibility('everyone');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const questionCharCount = question.length;
  const isQuestionValid = questionCharCount >= MIN_QUESTION_LENGTH && questionCharCount <= MAX_QUESTION_LENGTH;
  const validOptionsCount = options.filter(o => o.text.trim()).length;
  const canSubmit = isQuestionValid && validOptionsCount >= MIN_OPTIONS;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center">
      <motion.div 
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="w-full max-w-lg bg-card rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-primary/10 to-accent/10">
          <button onClick={handleClose} className="p-1 hover:bg-secondary rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-lg">გამოკითხვის შექმნა</h2>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            size="sm"
            className="bg-primary hover:bg-primary/90"
          >
            {isSubmitting ? 'იტვირთება...' : 'შექმნა'}
          </Button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-70px)] p-4 space-y-4">
          {/* Question */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-sm text-muted-foreground">კითხვა *</Label>
              <span className={`text-xs ${isQuestionValid ? 'text-muted-foreground' : 'text-destructive'}`}>
                {questionCharCount}/{MAX_QUESTION_LENGTH}
              </span>
            </div>
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value.slice(0, MAX_QUESTION_LENGTH))}
              placeholder="დასვით თქვენი კითხვა..."
              className="bg-secondary/30 min-h-[80px] resize-none text-base"
            />
            {questionCharCount > 0 && questionCharCount < MIN_QUESTION_LENGTH && (
              <p className="text-xs text-destructive mt-1">მინიმუმ {MIN_QUESTION_LENGTH} სიმბოლო</p>
            )}
          </div>

          {/* Options */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm text-muted-foreground">პასუხის ვარიანტები *</Label>
              <Badge variant="outline" className="text-xs">
                {validOptionsCount}/{MAX_OPTIONS}
              </Badge>
            </div>
            <Reorder.Group 
              axis="y" 
              values={options} 
              onReorder={setOptions}
              className="space-y-2"
            >
              <AnimatePresence>
                {options.map((option, index) => (
                  <Reorder.Item
                    key={option.id}
                    value={option}
                    className="touch-none"
                  >
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex items-start gap-2 bg-secondary/20 rounded-lg p-2"
                    >
                      <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab active:cursor-grabbing flex-shrink-0 mt-2.5" />
                      <div className="flex-1 space-y-2">
                        <div className="relative">
                          <Input
                            value={option.text}
                            onChange={(e) => handleOptionChange(option.id, e.target.value)}
                            placeholder={`ვარიანტი ${index + 1}`}
                            className="bg-background pr-16"
                          />
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                            <span className="text-[10px] text-muted-foreground">
                              {option.text.length}/{MAX_OPTION_LENGTH}
                            </span>
                            {options.length > MIN_OPTIONS && (
                              <button
                                onClick={() => handleRemoveOption(option.id)}
                                className="p-1 hover:bg-destructive/20 rounded-full transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-destructive" />
                              </button>
                            )}
                          </div>
                        </div>
                        {/* Option image */}
                        {option.imageUrl && (
                          <div className="relative inline-block">
                            <img 
                              src={option.imageUrl} 
                              alt="" 
                              className="max-h-20 rounded-lg object-cover" 
                            />
                            <button
                              onClick={() => removeOptionImage(option.id)}
                              className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </Reorder.Item>
                ))}
              </AnimatePresence>
            </Reorder.Group>

            {options.length < MAX_OPTIONS && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddOption}
                className="mt-2 w-full border-dashed"
              >
                <Plus className="w-4 h-4 mr-1" />
                ვარიანტის დამატება
              </Button>
            )}
          </div>

          {/* Settings Collapsible */}
          <Collapsible open={showSettings} onOpenChange={setShowSettings}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between hover:bg-secondary/50">
                <span className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4" />
                  დამატებითი პარამეტრები
                </span>
                {showSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-3">
              {/* Multiple Choice */}
              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">მრავალი არჩევანი</p>
                    <p className="text-xs text-muted-foreground">რამდენიმე ვარიანტის არჩევა</p>
                  </div>
                </div>
                <Switch checked={allowMultipleChoice} onCheckedChange={setAllowMultipleChoice} />
              </div>

              {/* Max Selections (only if multiple choice) */}
              {allowMultipleChoice && (
                <div className="p-3 bg-secondary/30 rounded-lg space-y-2">
                  <Label className="text-sm">მაქსიმუმ არჩევანი</Label>
                  <Select value={maxSelections.toString()} onValueChange={(v) => setMaxSelections(parseInt(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2, 3, 4, 5].map(n => (
                        <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Anonymous Voting */}
              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">ანონიმური კენჭისყრა</p>
                    <p className="text-xs text-muted-foreground">ვინ მისცა ხმა არ ჩანს</p>
                  </div>
                </div>
                <Switch checked={isAnonymous} onCheckedChange={setIsAnonymous} />
              </div>

              {/* Allow Change Vote */}
              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">ხმის შეცვლა</p>
                    <p className="text-xs text-muted-foreground">ხმის მიცემის შემდეგ შეცვლა</p>
                  </div>
                </div>
                <Switch checked={allowChangeVote} onCheckedChange={setAllowChangeVote} />
              </div>

              {/* Allow User Options */}
              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">მომხმარებლის ვარიანტები</p>
                    <p className="text-xs text-muted-foreground">სხვებს შეუძლიათ ვარიანტების დამატება</p>
                  </div>
                </div>
                <Switch checked={allowUserOptions} onCheckedChange={setAllowUserOptions} />
              </div>

              {/* Duration */}
              <div className="p-3 bg-secondary/30 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <p className="text-sm font-medium">ხანგრძლივობა</p>
                </div>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1d">1 დღე</SelectItem>
                    <SelectItem value="3d">3 დღე</SelectItem>
                    <SelectItem value="7d">7 დღე</SelectItem>
                    <SelectItem value="14d">14 დღე</SelectItem>
                    <SelectItem value="30d">30 დღე</SelectItem>
                    <SelectItem value="never">უვადო</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Show Results Mode */}
              <div className="p-3 bg-secondary/30 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary" />
                  <p className="text-sm font-medium">შედეგების ჩვენება</p>
                </div>
                <Select value={showResultsMode} onValueChange={setShowResultsMode}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediately">მაშინვე</SelectItem>
                    <SelectItem value="after_vote">ხმის მიცემის შემდეგ</SelectItem>
                    <SelectItem value="after_end">დასრულების შემდეგ</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Allow Comments */}
              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">კომენტარები</p>
                    <p className="text-xs text-muted-foreground">გამოკითხვაზე კომენტარები</p>
                  </div>
                </div>
                <Switch checked={allowComments} onCheckedChange={setAllowComments} />
              </div>

              {/* Visibility */}
              <div className="p-3 bg-secondary/30 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary" />
                  <p className="text-sm font-medium">ხილვადობა</p>
                </div>
                <Select value={visibility} onValueChange={setVisibility}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="everyone">
                      <span className="flex items-center gap-2">
                        <Globe className="w-4 h-4" /> ყველა
                      </span>
                    </SelectItem>
                    <SelectItem value="friends">
                      <span className="flex items-center gap-2">
                        <Users className="w-4 h-4" /> მეგობრები
                      </span>
                    </SelectItem>
                    <SelectItem value="only_me">
                      <span className="flex items-center gap-2">
                        <Lock className="w-4 h-4" /> მხოლოდ მე
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Preview */}
          <div className="p-3 bg-secondary/20 rounded-lg border border-dashed border-border">
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <Eye className="w-3 h-3" /> გადახედვა
            </p>
            <div className="bg-card rounded-lg p-3 border border-border">
              <p className="font-medium text-sm mb-2">{question || 'თქვენი კითხვა აქ გამოჩნდება'}</p>
              <div className="space-y-1.5">
                {options.filter(o => o.text.trim()).map((opt, i) => (
                  <div key={opt.id} className="flex items-center gap-2 text-xs p-2 bg-secondary/50 rounded">
                    <div className={`w-4 h-4 rounded-${allowMultipleChoice ? 'md' : 'full'} border border-muted-foreground/50`} />
                    <span>{opt.text}</span>
                  </div>
                ))}
                {validOptionsCount === 0 && (
                  <p className="text-xs text-muted-foreground italic">ვარიანტები აქ გამოჩნდება</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default CreatePollModalFB;
