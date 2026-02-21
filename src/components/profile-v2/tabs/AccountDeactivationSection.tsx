import { useState } from 'react';
import { Power, Eye, EyeOff, Loader2, AlertTriangle, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

const DEACTIVATION_REASONS = [
  { value: 'rest', label: 'დასვენება მინდა' },
  { value: 'personal', label: 'პირადი მიზეზი' },
  { value: 'other', label: 'სხვა' },
];

const AccountDeactivationSection = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);

  const resetModal = () => {
    setStep(1);
    setPassword('');
    setShowPassword(false);
    setReason('');
    setConfirmed(false);
    setLoading(false);
  };

  const handleOpenModal = () => {
    resetModal();
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetModal();
  };

  const handleNextStep = () => {
    if (!password) {
      toast({ title: 'პაროლი აუცილებელია', variant: 'destructive' });
      return;
    }
    if (!confirmed) {
      toast({ title: 'გთხოვთ დაადასტუროთ', variant: 'destructive' });
      return;
    }
    setStep(2);
  };

  const handleDeactivate = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      console.log('[Deactivate] Starting deactivation...');
      
      const { data, error } = await supabase.functions.invoke('account-deactivate', {
        body: { 
          password,
          reason: DEACTIVATION_REASONS.find(r => r.value === reason)?.label || reason
        }
      });

      console.log('[Deactivate] Response:', { data, error });

      if (error || data?.error) {
        toast({ 
          title: data?.error || 'დეაქტივაცია ვერ მოხერხდა', 
          variant: 'destructive' 
        });
        setLoading(false);
        return;
      }

      toast({ 
        title: 'ანგარიში დეაქტივირებულია',
        description: 'აღსადგენად უბრალოდ შედით თავიდან.'
      });

      handleCloseModal();
      
      // Sign out user locally and redirect
      console.log('[Deactivate] Signing out...');
      await signOut();
      
      // Force redirect to auth page
      setTimeout(() => {
        window.location.href = '/auth';
      }, 500);
      
    } catch (err) {
      console.error('[Deactivate] Error:', err);
      toast({ title: 'შეცდომა მოხდა', variant: 'destructive' });
      setLoading(false);
    }
  };

  return (
    <>
      {/* Deactivation Section Card */}
      <div className="p-4 rounded-xl bg-card border border-border space-y-3">
        <div className="flex items-center gap-2">
          <Power className="w-4 h-4 text-orange-500" />
          <span className="font-medium">ანგარიშის დეაქტივაცია (დროებითი)</span>
        </div>
        <p className="text-sm text-muted-foreground">
          დეაქტივაციის შემდეგ თქვენი პროფილი დამალული იქნება. დაბრუნება ნებისმიერ დროს შეგიძლიათ იგივე ლოგინით.
        </p>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleOpenModal}
          className="text-orange-600 border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/30"
        >
          დეაქტივაცია
        </Button>
      </div>

      {/* Deactivation Modal */}
      <Dialog open={showModal} onOpenChange={handleCloseModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="w-5 h-5" />
              ანგარიშის დეაქტივაცია
            </DialogTitle>
            <DialogDescription>
              {step === 1 
                ? 'დეაქტივაციის შემდეგ თქვენი პროფილი დამალული იქნება სხვებისთვის.'
                : 'დაადასტურეთ ანგარიშის დეაქტივაცია.'}
            </DialogDescription>
          </DialogHeader>

          {step === 1 ? (
            <div className="space-y-4">
              {/* Password Input */}
              <div className="space-y-2">
                <Label htmlFor="deactivate-password">პაროლი *</Label>
                <div className="relative">
                  <Input
                    id="deactivate-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="თქვენი პაროლი"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Reason Dropdown */}
              <div className="space-y-2">
                <Label htmlFor="deactivate-reason">მიზეზი (არჩევითი)</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="აირჩიეთ მიზეზი" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEACTIVATION_REASONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Confirmation Checkbox */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Checkbox
                  id="deactivate-confirm"
                  checked={confirmed}
                  onCheckedChange={(checked) => setConfirmed(checked === true)}
                  className="mt-0.5"
                />
                <Label 
                  htmlFor="deactivate-confirm" 
                  className="text-sm leading-relaxed cursor-pointer"
                >
                  ვადასტურებ, რომ პროფილი დამალული იქნება და გავითიშები სისტემიდან.
                </Label>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleCloseModal}
                >
                  გაუქმება
                </Button>
                <Button
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                  onClick={handleNextStep}
                  disabled={!password || !confirmed}
                >
                  შემდეგი
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Final Warning */}
              <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800">
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  დადასტურების შემდეგ ანგარიში დეაქტივირდება და სისტემიდან გამოხვალთ. 
                  აღსადგენად თავიდან შესვლა დაგჭირდებათ.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep(1)}
                  disabled={loading}
                >
                  უკან
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                  onClick={handleDeactivate}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      მიმდინარეობს...
                    </>
                  ) : (
                    'დაადასტურე დეაქტივაცია'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AccountDeactivationSection;
