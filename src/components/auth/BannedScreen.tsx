import { useState, useEffect } from 'react';
import { Ban, Clock, AlertTriangle, MessageCircle, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow, differenceInSeconds } from 'date-fns';
import { ka } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

interface BannedScreenProps {
  banInfo: {
    is_banned: boolean;
    ban_id: string;
    block_type: string;
    reason: string;
    banned_until: string | null;
    banned_at: string;
  };
  onSignOut: () => void;
}

export const BannedScreen = ({ banInfo, onSignOut }: BannedScreenProps) => {
  const [remainingTime, setRemainingTime] = useState<string>('');
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

  useEffect(() => {
    if (!banInfo.banned_until) return;

    const updateRemainingTime = () => {
      const expiresAt = new Date(banInfo.banned_until!);
      const now = new Date();
      const seconds = differenceInSeconds(expiresAt, now);
      
      if (seconds <= 0) {
        setRemainingTime('ვადა გასულია');
        setRemainingSeconds(0);
        // Reload page to check if ban expired
        setTimeout(() => window.location.reload(), 2000);
        return;
      }

      setRemainingSeconds(seconds);

      const days = Math.floor(seconds / (24 * 60 * 60));
      const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
      const minutes = Math.floor((seconds % (60 * 60)) / 60);
      const secs = seconds % 60;

      if (days > 0) {
        setRemainingTime(`${days} დღე ${hours} საათი ${minutes} წუთი`);
      } else if (hours > 0) {
        setRemainingTime(`${hours} საათი ${minutes} წუთი ${secs} წამი`);
      } else if (minutes > 0) {
        setRemainingTime(`${minutes} წუთი ${secs} წამი`);
      } else {
        setRemainingTime(`${secs} წამი`);
      }
    };

    updateRemainingTime();
    const interval = setInterval(updateRemainingTime, 1000);

    return () => clearInterval(interval);
  }, [banInfo.banned_until]);

  const getBlockTypeLabel = (type: string) => {
    switch (type) {
      case 'IP': return 'IP მისამართი';
      case 'NICKNAME': return 'მეტსახელი';
      default: return 'ანგარიში';
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    onSignOut();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-950/50 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-red-500/50 shadow-2xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
            <Ban className="w-10 h-10 text-red-500" />
          </div>
          <CardTitle className="text-2xl text-red-500">
            თქვენ დაბლოკილი ხართ
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Block Type */}
          <div className="text-center">
            <Badge variant="destructive" className="text-sm">
              {getBlockTypeLabel(banInfo.block_type)} დაბლოკილია
            </Badge>
          </div>

          {/* Reason */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm text-muted-foreground mb-1">მიზეზი:</h4>
                <p className="text-foreground">{banInfo.reason || 'მიზეზი მითითებული არ არის'}</p>
              </div>
            </div>
          </div>

          {/* Duration Info */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">დაიბლოკა:</span>
              <span>{format(new Date(banInfo.banned_at), 'dd MMMM yyyy, HH:mm', { locale: ka })}</span>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">დასრულდება:</span>
              <span>
                {banInfo.banned_until 
                  ? format(new Date(banInfo.banned_until), 'dd MMMM yyyy, HH:mm', { locale: ka })
                  : 'სამუდამოდ'
                }
              </span>
            </div>
          </div>

          {/* Countdown */}
          {banInfo.banned_until && remainingSeconds > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-red-500 animate-pulse" />
                <span className="text-sm text-muted-foreground">დარჩენილი დრო:</span>
              </div>
              <p className="text-2xl font-bold text-red-500 font-mono">
                {remainingTime}
              </p>
            </div>
          )}

          {/* Permanent Ban */}
          {!banInfo.banned_until && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-center">
              <p className="text-lg font-bold text-red-500">
                სამუდამო ბლოკი
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                თქვენი ანგარიში სამუდამოდ დაიბლოკა
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3 pt-2">
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 mr-2" />
              გასვლა
            </Button>
            
            <p className="text-xs text-center text-muted-foreground">
              თუ გგონიათ რომ შეცდომით დაიბლოკეთ, დაუკავშირდით ადმინისტრაციას
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
