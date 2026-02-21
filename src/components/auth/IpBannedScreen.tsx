import { useState, useEffect } from 'react';
import { Ban, Clock, AlertTriangle, Globe } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow, differenceInSeconds } from 'date-fns';
import { ka } from 'date-fns/locale';

interface IpBannedScreenProps {
  ipBanInfo: {
    is_banned: boolean;
    ban_id: string | null;
    reason: string | null;
    banned_until: string | null;
    banned_at: string | null;
  };
  clientIp: string | null;
}

export const IpBannedScreen = ({ ipBanInfo, clientIp }: IpBannedScreenProps) => {
  const [remainingTime, setRemainingTime] = useState<string>('');
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

  useEffect(() => {
    if (!ipBanInfo.banned_until) return;

    const updateRemainingTime = () => {
      const expiresAt = new Date(ipBanInfo.banned_until!);
      const now = new Date();
      const seconds = differenceInSeconds(expiresAt, now);
      
      if (seconds <= 0) {
        setRemainingTime('ვადა გასულია');
        setRemainingSeconds(0);
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
  }, [ipBanInfo.banned_until]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-950/50 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-red-500/50 shadow-2xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
            <Globe className="w-10 h-10 text-red-500" />
          </div>
          <CardTitle className="text-2xl text-red-500">
            თქვენი IP დაბლოკილია
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="text-center">
            <Badge variant="destructive" className="text-sm">
              IP მისამართი დაბლოკილია
            </Badge>
            {clientIp && (
              <p className="text-xs text-muted-foreground mt-2 font-mono">
                {clientIp}
              </p>
            )}
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm text-muted-foreground mb-1">მიზეზი:</h4>
                <p className="text-foreground">{ipBanInfo.reason || 'მიზეზი მითითებული არ არის'}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {ipBanInfo.banned_at && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">დაიბლოკა:</span>
                <span>{format(new Date(ipBanInfo.banned_at), 'dd MMMM yyyy, HH:mm', { locale: ka })}</span>
              </div>
            )}
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">დასრულდება:</span>
              <span>
                {ipBanInfo.banned_until 
                  ? format(new Date(ipBanInfo.banned_until), 'dd MMMM yyyy, HH:mm', { locale: ka })
                  : 'სამუდამოდ'
                }
              </span>
            </div>
          </div>

          {ipBanInfo.banned_until && remainingSeconds > 0 && (
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

          {!ipBanInfo.banned_until && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-center">
              <p className="text-lg font-bold text-red-500">
                სამუდამო ბლოკი
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                თქვენი IP მისამართი სამუდამოდ დაიბლოკა
              </p>
            </div>
          )}

          <div className="pt-2">
            <p className="text-xs text-center text-muted-foreground">
              თუ გგონიათ რომ შეცდომით დაიბლოკეთ, დაუკავშირდით ადმინისტრაციას
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
