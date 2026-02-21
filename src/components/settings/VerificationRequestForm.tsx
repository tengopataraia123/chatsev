import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { BadgeCheck, Clock, CheckCircle, XCircle, Loader2, Info } from 'lucide-react';
import { format } from 'date-fns';
import VerifiedBadge from '@/components/verified/VerifiedBadge';

interface VerificationRequest {
  id: string;
  status: string;
  requested_note: string | null;
  admin_note: string | null;
  created_at: string;
  decided_at: string | null;
}

const VerificationRequestForm = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [request, setRequest] = useState<VerificationRequest | null>(null);
  const [requestedNote, setRequestedNote] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [canRequestAgain, setCanRequestAgain] = useState(true);
  const [daysUntilCanRequest, setDaysUntilCanRequest] = useState(0);

  useEffect(() => {
    if (user) {
      fetchStatus();
    }
  }, [user]);

  const fetchStatus = async () => {
    if (!user) return;
    
    setLoading(true);
    
    // Check if already verified
    const { data: profileData } = await supabase
      .from('profiles')
      .select('is_verified')
      .eq('user_id', user.id)
      .single();
    
    setIsVerified(profileData?.is_verified || false);

    // Check for existing request
    const { data: requestData } = await supabase
      .from('verification_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    setRequest(requestData);

    // Check cooldown for rejected requests
    if (requestData?.status === 'rejected' && requestData.decided_at) {
      const rejectedDate = new Date(requestData.decided_at);
      const cooldownDays = 7;
      const cooldownEnd = new Date(rejectedDate.getTime() + cooldownDays * 24 * 60 * 60 * 1000);
      const now = new Date();
      
      if (now < cooldownEnd) {
        setCanRequestAgain(false);
        setDaysUntilCanRequest(Math.ceil((cooldownEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
      }
    }

    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!user || !requestedNote.trim()) {
      toast({ title: 'გთხოვთ მიუთითოთ მიზეზი', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('verification_requests')
        .insert({
          user_id: user.id,
          requested_note: requestedNote.trim(),
          status: 'pending'
        });

      if (error) throw error;

      toast({ title: 'მოთხოვნა გაიგზავნა' });
      setRequestedNote('');
      fetchStatus();
    } catch (error: any) {
      toast({ title: 'შეცდომა', description: error.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!request || request.status !== 'pending') return;

    try {
      const { error } = await supabase
        .from('verification_requests')
        .update({ status: 'canceled' })
        .eq('id', request.id);

      if (error) throw error;

      toast({ title: 'მოთხოვნა გაუქმდა' });
      fetchStatus();
    } catch (error: any) {
      toast({ title: 'შეცდომა', description: error.message, variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  // Already verified
  if (isVerified) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <VerifiedBadge size="md" showTooltip={false} />
            ვერიფიცირებული პროფილი
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 bg-emerald-500/10 rounded-lg">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
            <div>
              <p className="font-medium text-emerald-600 dark:text-emerald-400">
                თქვენი პროფილი დადასტურებულია
              </p>
              <p className="text-sm text-muted-foreground">
                ვერიფიკაციის ნიშანი გამოჩნდება თქვენი სახელის გვერდით
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Pending request
  if (request?.status === 'pending') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-500" />
            მოთხოვნა განხილვაზეა
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-yellow-500/10 rounded-lg">
            <p className="text-sm text-muted-foreground">
              თქვენი მოთხოვნა მიღებულია და განიხილება ადმინისტრაციის მიერ.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              გაგზავნილია: {format(new Date(request.created_at), 'dd/MM/yyyy HH:mm')}
            </p>
          </div>
          {request.requested_note && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-1">თქვენი შეტყობინება:</p>
              <p className="text-sm text-muted-foreground">{request.requested_note}</p>
            </div>
          )}
          <Button variant="outline" onClick={handleCancel} className="w-full">
            მოთხოვნის გაუქმება
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Rejected (with cooldown check)
  if (request?.status === 'rejected' && !canRequestAgain) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-500" />
            მოთხოვნა უარყოფილია
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-red-500/10 rounded-lg">
            <p className="font-medium text-red-600 dark:text-red-400">
              თქვენი მოთხოვნა უარყოფილია
            </p>
            {request.admin_note && (
              <p className="text-sm text-muted-foreground mt-2">
                მიზეზი: {request.admin_note}
              </p>
            )}
          </div>
          <p className="text-sm text-muted-foreground text-center">
            ხელახლა მოთხოვნის გაგზავნა შესაძლებელია {daysUntilCanRequest} დღეში
          </p>
        </CardContent>
      </Card>
    );
  }

  // Can request (new or rejected with cooldown passed)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BadgeCheck className="w-5 h-5 text-primary" />
          ვერიფიკაციის მოთხოვნა
        </CardTitle>
        <CardDescription>
          მოითხოვეთ პროფილის დადასტურება ოფიციალური ვერიფიკაციის ნიშნის მისაღებად
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-muted rounded-lg space-y-2">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 mt-0.5 text-muted-foreground" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">რას ნიშნავს ვერიფიკაცია?</p>
              <ul className="list-disc list-inside space-y-1">
                <li>ვერიფიცირებული პროფილები გამოირჩევიან სპეციალური ნიშნით</li>
                <li>ეს ადასტურებს თქვენი პროფილის ავთენტურობას</li>
                <li>მოთხოვნა განიხილება ადმინისტრაციის მიერ</li>
              </ul>
            </div>
          </div>
        </div>

        {request?.status === 'rejected' && (
          <div className="p-3 bg-red-500/10 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">
              წინა მოთხოვნა უარყოფილია: {request.admin_note || 'მიზეზი არ არის მითითებული'}
            </p>
          </div>
        )}

        <Textarea
          placeholder="მიუთითეთ რატომ გსურთ ვერიფიკაცია..."
          value={requestedNote}
          onChange={(e) => setRequestedNote(e.target.value)}
          maxLength={500}
          className="min-h-[100px]"
        />
        <p className="text-xs text-muted-foreground text-right">
          {requestedNote.length}/500
        </p>

        <Button 
          onClick={handleSubmit} 
          disabled={submitting || !requestedNote.trim()}
          className="w-full"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <BadgeCheck className="w-4 h-4 mr-2" />
          )}
          მოთხოვნის გაგზავნა
        </Button>
      </CardContent>
    </Card>
  );
};

export default VerificationRequestForm;
