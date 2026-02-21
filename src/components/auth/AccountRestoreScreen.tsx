import { useState } from 'react';
import { RefreshCcw, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AccountRestoreScreenProps {
  loginEmail: string;
  password: string;
  deactivatedAt?: string;
  onRestored: () => void;
  onCancel: () => void;
}

const AccountRestoreScreen = ({ 
  loginEmail, 
  password, 
  deactivatedAt,
  onRestored, 
  onCancel 
}: AccountRestoreScreenProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleRestore = async () => {
    setLoading(true);
    try {
      console.log('[AccountRestore] Attempting restore for:', loginEmail);
      
      const { data, error } = await supabase.functions.invoke('account-reactivate', {
        body: { loginEmail, password }
      });

      console.log('[AccountRestore] Response:', { data, error });

      if (error) {
        console.error('[AccountRestore] Function error:', error);
        toast({ 
          title: 'აღდგენა ვერ მოხერხდა', 
          description: error.message,
          variant: 'destructive' 
        });
        setLoading(false);
        return;
      }

      if (data?.error) {
        console.log('[AccountRestore] Data error:', data.error);
        if (data.error === 'პაროლი არასწორია') {
          toast({ 
            title: 'არასწორი პაროლი', 
            description: 'გთხოვთ შეიყვანოთ სწორი პაროლი',
            variant: 'destructive' 
          });
        } else {
          toast({ 
            title: data.error, 
            variant: 'destructive' 
          });
        }
        setLoading(false);
        return;
      }

      // Account restored! Now sign in directly on the client side
      console.log('[AccountRestore] Account restored, signing in...');
      
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: password
      });

      if (signInError) {
        console.error('[AccountRestore] Sign in error:', signInError);
        toast({ title: 'შესვლა ვერ მოხერხდა', variant: 'destructive' });
        setLoading(false);
        return;
      }

      toast({ title: 'ანგარიში აღდგენილია!' });
      onRestored();
      
    } catch (err) {
      console.error('[AccountRestore] Error:', err);
      toast({ title: 'შეცდომა მოხდა', variant: 'destructive' });
      setLoading(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ka-GE', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-2">
            <RefreshCcw className="w-8 h-8 text-orange-600" />
          </div>
          <CardTitle className="text-xl">ანგარიში დეაქტივირებულია</CardTitle>
          <CardDescription>
            გსურთ ანგარიშის აღდგენა და დაბრუნება?
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {deactivatedAt && (
            <p className="text-sm text-center text-muted-foreground">
              დეაქტივაციის თარიღი: {formatDate(deactivatedAt)}
            </p>
          )}
          
          <div className="flex flex-col gap-3">
            <Button 
              onClick={handleRestore}
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  მიმდინარეობს...
                </>
              ) : (
                <>
                  <RefreshCcw className="w-4 h-4 mr-2" />
                  აღდგენა
                </>
              )}
            </Button>
            
            <Button 
              variant="outline"
              onClick={onCancel}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              <X className="w-4 h-4 mr-2" />
              გაუქმება
            </Button>
          </div>
          
          <p className="text-xs text-center text-muted-foreground mt-4">
            აღდგენის შემდეგ თქვენი პროფილი კვლავ ხილული გახდება და შეძლებთ საიტის სრულ გამოყენებას.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountRestoreScreen;
