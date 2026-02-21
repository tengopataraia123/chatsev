import { useState, useEffect } from 'react';
import { X, Camera, ChevronRight, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { GroupCategory, GroupPrivacy } from './types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (groupId: string) => void;
}

const CreateGroupModal = ({ isOpen, onClose, onCreated }: CreateGroupModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<GroupCategory[]>([]);

  // Form state
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [privacyType, setPrivacyType] = useState<GroupPrivacy>('public');

  useEffect(() => {
    if (isOpen) {
      supabase.from('group_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
        .then(({ data }) => setCategories((data || []) as GroupCategory[]));
    }
  }, [isOpen]);

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50) + '-' + Math.random().toString(36).substring(2, 6);
  };

  const handleCreate = async () => {
    if (!user || !name.trim()) return;
    setLoading(true);

    try {
      const slug = generateSlug(name);
      
      const { data: group, error } = await supabase
        .from('groups')
        .insert({
          owner_user_id: user.id,
          category_id: categoryId,
          name: name.trim(),
          description: description.trim() || null,
          privacy_type: privacyType,
          group_slug: slug,
        })
        .select()
        .single();

      if (error) throw error;

      // Add owner as member
      await supabase.from('group_members').insert({
        group_id: group.id,
        user_id: user.id,
        role: 'owner',
        status: 'active',
      });

      toast({ title: 'ჯგუფი შეიქმნა! 🎉' });
      onCreated(group.id);
      onClose();
      resetForm();
    } catch (error: any) {
      console.error('Error creating group:', error);
      toast({ title: 'შეცდომა ჯგუფის შექმნისას', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setCategoryId(null);
    setName('');
    setDescription('');
    setPrivacyType('public');
  };

  const privacyOptions = [
    { value: 'public' as const, icon: Eye, label: 'საჯარო', desc: 'ყველას შეუძლია ნახოს და შემოუერთდეს' },
    { value: 'closed' as const, icon: Lock, label: 'დახურული', desc: 'ჯგუფი ჩანს, კონტენტი მხოლოდ წევრებისთვის' },
    { value: 'secret' as const, icon: EyeOff, label: 'საიდუმლო', desc: 'მხოლოდ მოწვევით, ძიებაში არ ჩანს' },
  ];

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-card w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90dvh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-card/95 backdrop-blur-lg border-b border-border p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            {step > 1 && (
              <button onClick={() => setStep(step - 1)} className="p-1">
                <ChevronRight className="w-5 h-5 rotate-180" />
              </button>
            )}
            <h2 className="text-lg font-semibold">ჯგუფის შექმნა</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="flex gap-1 px-4 pt-3">
          {[1, 2, 3].map(s => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${s <= step ? 'bg-primary' : 'bg-secondary'}`} />
          ))}
        </div>

        <div className="p-4 space-y-4">
          {/* Step 1: Category */}
          {step === 1 && (
            <div className="space-y-3">
              <h3 className="font-medium text-foreground">აირჩიე კატეგორია</h3>
              <div className="grid grid-cols-2 gap-2">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => { setCategoryId(cat.id); setStep(2); }}
                    className={`flex items-center gap-2 p-3 rounded-xl border transition-colors ${
                      categoryId === cat.id ? 'border-primary bg-primary/10' : 'border-border hover:bg-secondary'
                    }`}
                  >
                    <span className="text-xl">{cat.icon}</span>
                    <span className="text-sm font-medium">{cat.name_ka}</span>
                  </button>
                ))}
              </div>
              <Button
                onClick={() => setStep(2)}
                variant="ghost"
                className="w-full text-muted-foreground"
              >
                კატეგორიის გარეშე →
              </Button>
            </div>
          )}

          {/* Step 2: Basic Info */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">ჯგუფის სახელი *</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value.slice(0, 120))}
                  placeholder="მაგ: React Developers Georgia"
                  className="text-base"
                  autoFocus
                />
                <span className="text-xs text-muted-foreground mt-1">{name.length}/120</span>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">აღწერა</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="რა შინაარსისაა ეს ჯგუფი?"
                  className="min-h-[80px] text-base"
                />
              </div>
              <Button
                onClick={() => setStep(3)}
                disabled={!name.trim()}
                className="w-full"
              >
                შემდეგი
              </Button>
            </div>
          )}

          {/* Step 3: Privacy */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-medium text-foreground">კონფიდენციალურობა</h3>
              <div className="space-y-2">
                {privacyOptions.map(opt => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setPrivacyType(opt.value)}
                      className={`w-full flex items-start gap-3 p-4 rounded-xl border transition-colors text-left ${
                        privacyType === opt.value ? 'border-primary bg-primary/5' : 'border-border hover:bg-secondary'
                      }`}
                    >
                      <Icon className={`w-5 h-5 mt-0.5 ${privacyType === opt.value ? 'text-primary' : 'text-muted-foreground'}`} />
                      <div>
                        <p className="font-medium text-foreground">{opt.label}</p>
                        <p className="text-xs text-muted-foreground">{opt.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
              <Button
                onClick={handleCreate}
                disabled={loading || !name.trim()}
                className="w-full"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                ჯგუფის შექმნა
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default CreateGroupModal;
