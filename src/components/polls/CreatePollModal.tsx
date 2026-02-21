import { useState } from 'react';
import { X, Plus, GripVertical, Trash2, Settings2, Clock, Eye, MessageSquare, Users, Lock, Globe, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { createPendingApproval } from '@/hooks/useModerationQueue';
import { motion, AnimatePresence, Reorder } from 'framer-motion';

interface CreatePollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface PollOption {
  id: string;
  text: string;
}

const CreatePollModal = ({ isOpen, onClose, onSuccess }: CreatePollModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [title, setTitle] = useState('');
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
  const [allowChangeVote, setAllowChangeVote] = useState(false);
  const [allowUserOptions, setAllowUserOptions] = useState(false);
  const [duration, setDuration] = useState<string>('7d');
  const [showResultsMode, setShowResultsMode] = useState<string>('after_vote');
  const [allowComments, setAllowComments] = useState(true);
  const [visibility, setVisibility] = useState<string>('everyone');

  if (!isOpen) return null;

  const handleAddOption = () => {
    if (options.length < 10) {
      setOptions([...options, { id: Date.now().toString(), text: '' }]);
    }
  };

  const handleRemoveOption = (id: string) => {
    if (options.length > 2) {
      setOptions(options.filter(o => o.id !== id));
    }
  };

  const handleOptionChange = (id: string, text: string) => {
    setOptions(options.map(o => o.id === id ? { ...o, text } : o));
  };

  const calculateExpiresAt = (dur: string): string | null => {
    if (dur === 'never') return null;
    
    const now = new Date();
    switch (dur) {
      case '1h': return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
      case '24h': return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
      case '7d': return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      case '30d': return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      default: return null;
    }
  };

  const handleSubmit = async () => {
    if (!question.trim()) {
      toast({ title: 'კითხვა აუცილებელია', variant: 'destructive' });
      return;
    }

    const validOptions = options.filter(o => o.text.trim());
    if (validOptions.length < 2) {
      toast({ title: 'მინიმუმ 2 ვარიანტი საჭიროა', variant: 'destructive' });
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
          title: title.trim() || null,
          question: question.trim(),
          options: validOptions.map(o => o.text.trim()),
          is_anonymous: isAnonymous,
          allow_multiple_choice: allowMultipleChoice,
          allow_change_vote: allowChangeVote,
          allow_user_options: allowUserOptions,
          expires_at: calculateExpiresAt(duration),
          show_results_mode: showResultsMode,
          allow_comments: allowComments,
          visibility,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      // Create pending approval
      if (pollData) {
        await createPendingApproval({
          type: 'poll' as any,
          userId: user.id,
          contentId: pollData.id,
          contentData: {
            title: title.trim() || null,
            question: question.trim(),
            options: validOptions.map(o => o.text.trim())
          }
        });
      }

      toast({ 
        title: 'გამოკითხვა შეიქმნა!',
        description: 'ელოდება ადმინისტრატორის დადასტურებას'
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
    setTitle('');
    setQuestion('');
    setOptions([{ id: '1', text: '' }, { id: '2', text: '' }]);
    setShowSettings(false);
    setIsAnonymous(false);
    setAllowMultipleChoice(false);
    setAllowChangeVote(false);
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

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center">
      <motion.div 
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="w-full max-w-lg bg-card rounded-t-2xl sm:rounded-2xl max-h-[85vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-primary/10 to-accent/10 flex-shrink-0">
          <button onClick={handleClose} className="p-1 hover:bg-secondary rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
          <h2 className="font-semibold text-lg">ახალი გამოკითხვა</h2>
          <div className="w-6" />
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 min-h-0 p-4 space-y-4" style={{ WebkitOverflowScrolling: 'touch' }}>
          {/* Title (optional) */}
          <div>
            <Label className="text-sm text-muted-foreground mb-1.5 block">სათაური (არასავალდებულო)</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="მაგ: საზოგადოების აზრის კვლევა"
              className="bg-secondary/30"
            />
          </div>

          {/* Question */}
          <div>
            <Label className="text-sm text-muted-foreground mb-1.5 block">კითხვა *</Label>
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="რა არის თქვენი კითხვა?"
              className="bg-secondary/30 min-h-[80px] resize-none"
            />
          </div>

          {/* Options */}
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">პასუხის ვარიანტები *</Label>
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
                    className="flex items-center gap-2"
                  >
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex items-center gap-2 flex-1"
                    >
                      <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab active:cursor-grabbing flex-shrink-0" />
                      <div className="flex-1 relative">
                        <Input
                          value={option.text}
                          onChange={(e) => handleOptionChange(option.id, e.target.value)}
                          placeholder={`ვარიანტი ${index + 1}`}
                          className="bg-secondary/30 pr-10"
                        />
                        {options.length > 2 && (
                          <button
                            onClick={() => handleRemoveOption(option.id)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-destructive/20 rounded-full transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  </Reorder.Item>
                ))}
              </AnimatePresence>
            </Reorder.Group>

            {options.length < 10 && (
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
              <Button variant="ghost" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4" />
                  დამატებითი პარამეტრები
                </span>
                <motion.div
                  animate={{ rotate: showSettings ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  ▼
                </motion.div>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              {/* Anonymous Voting */}
              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">ანონიმური კენჭისყრა</p>
                    <p className="text-xs text-muted-foreground">ვინ მისცა ხმა არ ჩანს</p>
                  </div>
                </div>
                <Switch checked={isAnonymous} onCheckedChange={setIsAnonymous} />
              </div>

              {/* Multiple Choice */}
              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">მრავალი არჩევანი</p>
                    <p className="text-xs text-muted-foreground">რამდენიმე ვარიანტის არჩევა</p>
                  </div>
                </div>
                <Switch checked={allowMultipleChoice} onCheckedChange={setAllowMultipleChoice} />
              </div>

              {/* Allow Change Vote */}
              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-muted-foreground" />
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
                  <Plus className="w-4 h-4 text-muted-foreground" />
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
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm font-medium">ხანგრძლივობა</p>
                </div>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1h">1 საათი</SelectItem>
                    <SelectItem value="24h">24 საათი</SelectItem>
                    <SelectItem value="7d">7 დღე</SelectItem>
                    <SelectItem value="30d">30 დღე</SelectItem>
                    <SelectItem value="never">უვადო</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Show Results Mode */}
              <div className="p-3 bg-secondary/30 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm font-medium">შედეგების ჩვენება</p>
                </div>
                <Select value={showResultsMode} onValueChange={setShowResultsMode}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediately">მაშინვე</SelectItem>
                    <SelectItem value="after_vote">ხმის მიცემის შემდეგ</SelectItem>
                    <SelectItem value="after_end">გამოკითხვის დასრულების შემდეგ</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Allow Comments */}
              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
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
                  <Globe className="w-4 h-4 text-muted-foreground" />
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
        </div>

        {/* Footer with submit button - always visible */}
        <div className="flex-shrink-0 p-4 border-t border-border bg-card">
          <Button
            onClick={handleSubmit}
            disabled={!question.trim() || options.filter(o => o.text.trim()).length < 2 || isSubmitting}
            className="w-full bg-primary hover:bg-primary/90"
          >
            {isSubmitting ? 'იტვირთება...' : 'შექმნა'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default CreatePollModal;
