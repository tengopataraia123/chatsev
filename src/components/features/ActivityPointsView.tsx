import { useEffect, useState } from 'react';
import { ArrowLeft, TrendingUp, Gift, Zap, Trophy, Crown, Sparkles, Coins, Lock, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useActivityPoints, POINT_VALUES, SPENDING_OPTIONS, getLevelProgress, getLevelFromPoints } from '@/hooks/useActivityPoints';
import { usePointsWallet } from '@/hooks/useGifts';
import { useVipStatus } from '@/hooks/useVipStatus';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ka } from 'date-fns/locale';
import { toast } from 'sonner';

interface ActivityPointsViewProps {
  onBack: () => void;
  onTabChange?: (tab: string) => void;
}

const VIP_PLANS = [
  { type: 'vip_bronze', label: 'Bronze VIP', emoji: '🥉', cost: 100, days: 7, color: 'from-amber-600 to-amber-400' },
  { type: 'vip_silver', label: 'Silver VIP', emoji: '🥈', cost: 250, days: 14, color: 'from-slate-400 to-slate-300' },
  { type: 'vip_gold', label: 'Gold VIP', emoji: '🥇', cost: 500, days: 30, color: 'from-yellow-500 to-amber-300' },
  { type: 'vip_diamond', label: 'Diamond VIP', emoji: '💎', cost: 1000, days: 60, color: 'from-cyan-400 to-blue-300' },
];

const ActivityPointsView = ({ onBack, onTabChange }: ActivityPointsViewProps) => {
  const { points, history, loading, fetchHistory } = useActivityPoints();
  const { wallet, refetch: refetchWallet } = usePointsWallet();
  const { user } = useAuth();
  const vipStatus = useVipStatus(user?.id);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const handlePurchaseVip = async (vipType: string) => {
    if (!user?.id) return;
    setPurchasing(vipType);
    try {
      const { data, error } = await (supabase.rpc as any)('purchase_vip_with_points', {
        p_user_id: user.id,
        p_vip_type: vipType,
      });
      if (error) throw error;
      const result = data as any;
      if (!result?.success) {
        if (result?.error === 'insufficient_points') {
          toast.error(`ქულები არ გყოფნით! საჭიროა ${result.cost}, გაქვთ ${result.balance}`);
        } else {
          toast.error('შეცდომა: ' + (result?.error || 'unknown'));
        }
        return;
      }
      toast.success(`${vipType.replace('vip_', '').toUpperCase()} VIP აქტივირებულია! 🎉`);
      refetchWallet();
    } catch (e: any) {
      toast.error('VIP შეძენა ვერ მოხერხდა');
    } finally {
      setPurchasing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const totalPoints = points?.total_points || 0;
  const level = getLevelFromPoints(totalPoints);
  const { progress, nextThreshold } = getLevelProgress(totalPoints, level);
  const balance = wallet.balance_points;

  return (
    <ScrollArea className="h-[calc(100vh-80px)]">
      <div className="p-4 space-y-4 max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-xl hover:bg-secondary/60 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">აქტივობის ქულები</h1>
        </div>

        {/* Main Stats */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground">შენი ბალანსი</p>
                <p className="text-4xl font-bold text-primary">{totalPoints}</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground">
                  <span className="text-2xl font-bold">{level}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">დონე</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>დონე {level}</span>
                <span>{totalPoints} / {nextThreshold}</span>
              </div>
              <Progress value={progress} className="h-2.5" />
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="p-2 rounded-lg bg-green-500/10 text-center">
                <p className="text-lg font-bold text-green-600">{points?.total_earned || 0}</p>
                <p className="text-[10px] text-muted-foreground">მოპოვებული</p>
              </div>
              <div className="p-2 rounded-lg bg-red-500/10 text-center">
                <p className="text-lg font-bold text-red-500">{points?.total_spent || 0}</p>
                <p className="text-[10px] text-muted-foreground">გახარჯული</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* VIP Status / Purchase */}
        <Card className="border-yellow-500/20 overflow-hidden">
          <CardHeader className="py-3 pb-2 bg-gradient-to-r from-yellow-500/10 to-amber-500/10">
            <CardTitle className="text-base flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-500" />
              VIP სტატუსი
              {vipStatus.isVip && (
                <Badge variant="secondary" className="text-[10px] bg-yellow-500/20 text-yellow-600">
                  აქტიური
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {vipStatus.isVip && vipStatus.expiresAt && (
              <div className="mb-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center gap-3">
                <Sparkles className="w-8 h-8 text-yellow-500" />
                <div>
                  <p className="font-semibold text-sm">{vipStatus.vipType?.replace('vip_', '').toUpperCase()} VIP</p>
                  <p className="text-xs text-muted-foreground">
                    ვადა: {formatDistanceToNow(new Date(vipStatus.expiresAt), { locale: ka, addSuffix: true })}
                  </p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              {VIP_PLANS.map((plan) => {
                const canAfford = balance >= plan.cost;
                const isActive = vipStatus.vipType === plan.type && vipStatus.isVip;
                return (
                  <button
                    key={plan.type}
                    onClick={() => canAfford && !isActive && handlePurchaseVip(plan.type)}
                    disabled={!canAfford || isActive || purchasing !== null}
                    className={`relative p-3 rounded-xl border-2 transition-all duration-200 text-center ${
                      isActive
                        ? 'border-yellow-500 bg-yellow-500/10'
                        : canAfford
                          ? 'border-border hover:border-primary/50 hover:bg-primary/5 cursor-pointer'
                          : 'border-border/50 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    {isActive && (
                      <div className="absolute top-1 right-1">
                        <Check className="w-4 h-4 text-yellow-600" />
                      </div>
                    )}
                    {!canAfford && !isActive && (
                      <div className="absolute top-1 right-1">
                        <Lock className="w-3 h-3 text-muted-foreground" />
                      </div>
                    )}
                    <span className="text-2xl block mb-1">{plan.emoji}</span>
                    <p className="text-xs font-bold">{plan.label}</p>
                    <p className="text-[10px] text-muted-foreground">{plan.days} დღე</p>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <Coins className="w-3 h-3 text-yellow-500" />
                      <span className="text-xs font-bold">{plan.cost}</span>
                    </div>
                    {purchasing === plan.type && (
                      <div className="absolute inset-0 bg-background/80 rounded-xl flex items-center justify-center">
                        <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Gift Categories - Spending */}
        <Card>
          <CardHeader className="py-3 pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Gift className="w-5 h-5 text-purple-500" />
              საჩუქრები — ქულების გახარჯვა
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-3">
              პროფილის გვერდიდან შეგიძლია სხვა მომხმარებელს საჩუქარი გაუგზავნო 🎁
            </p>
            <div className="space-y-2">
              {[
                { category: '👧 გოგონების', range: '5 – 100', color: 'from-pink-500/10 to-rose-500/10' },
                { category: '👦 ბიჭების', range: '5 – 60', color: 'from-blue-500/10 to-indigo-500/10' },
                { category: '⭐ ნეიტრალური', range: '5 – 100', color: 'from-yellow-500/10 to-amber-500/10' },
              ].map((cat) => (
                <div key={cat.category} className={`flex items-center justify-between p-3 rounded-lg bg-gradient-to-r ${cat.color}`}>
                  <span className="text-sm font-medium">{cat.category}</span>
                  <Badge variant="outline" className="text-[10px]">{cat.range} ქულა</Badge>
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {SPENDING_OPTIONS.map((opt) => (
                <div key={opt.id} className="flex flex-col items-center gap-1 p-2 rounded-lg bg-secondary/30 text-center">
                  <span className="text-xl">{opt.icon}</span>
                  <span className="text-[9px] leading-tight">{opt.label}</span>
                  <span className="text-[10px] font-bold text-red-500">-{opt.cost}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* How to Earn */}
        <Card>
          <CardHeader className="py-3 pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              როგორ მოვიპოვო ქულები
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {Object.entries(POINT_VALUES).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{val.icon}</span>
                    <span className="text-sm">{val.label}</span>
                  </div>
                  <Badge variant="secondary" className="font-bold text-green-600">+{val.points}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent History */}
        <Card>
          <CardHeader className="py-3 pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              ბოლო აქტივობა
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                ჯერ აქტივობა არ გაქვს — დაიწყე პოსტების დამატება! 🚀
              </p>
            ) : (
              <div className="divide-y divide-border max-h-[300px] overflow-y-auto">
                {history.slice(0, 30).map((item) => {
                  const config = POINT_VALUES[item.action];
                  return (
                    <div key={item.id} className="flex items-center justify-between px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{config?.icon || '⭐'}</span>
                        <div>
                          <p className="text-sm">{config?.label || item.action}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {formatDistanceToNow(new Date(item.created_at), { locale: ka, addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <span className={`text-sm font-bold ${item.points >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {item.points >= 0 ? '+' : ''}{item.points}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Level Guide */}
        <Card>
          <CardHeader className="py-3 pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              დონეები
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {[
                { lvl: 1, name: 'დამწყები', min: 0 },
                { lvl: 2, name: 'აქტიური', min: 50 },
                { lvl: 3, name: 'მონაწილე', min: 200 },
                { lvl: 4, name: 'გამოცდილი', min: 400 },
                { lvl: 5, name: 'პროფესიონალი', min: 700 },
                { lvl: 6, name: 'ექსპერტი', min: 1000 },
                { lvl: 7, name: 'მასტერი', min: 1500 },
                { lvl: 8, name: 'გრანდმასტერი', min: 2000 },
                { lvl: 9, name: 'ლეგენდა', min: 3000 },
                { lvl: 10, name: 'ჩემპიონი', min: 5000 },
              ].map((l) => (
                <div key={l.lvl} className={`flex items-center justify-between px-4 py-2.5 ${level === l.lvl ? 'bg-primary/10' : ''}`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${level >= l.lvl ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                      {l.lvl}
                    </span>
                    <span className={`text-sm ${level === l.lvl ? 'font-bold' : ''}`}>{l.name}</span>
                    {level === l.lvl && <Badge className="text-[10px] h-5">შენ</Badge>}
                  </div>
                  <span className="text-xs text-muted-foreground">{l.min}+ ქულა</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
};

export default ActivityPointsView;
