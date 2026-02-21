import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Ban, User, Globe, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { endUserLiveStreams } from '@/hooks/useLiveStream';

interface BlockUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUserId: string;
  targetUsername: string;
  targetIp?: string;
  onBlocked?: () => void;
}

const REASON_TEMPLATES = [
  { label: 'რეკლამა', value: 'რეკლამა / პრომოცია' },
  { label: 'სპამი', value: 'სპამი / მასობრივი შეტყობინებები' },
  { label: 'შეურაცხყოფა', value: 'შეურაცხყოფა / უხეში ქცევა' },
  { label: 'თაღლითობა', value: 'თაღლითობა / მოტყუება' },
  { label: 'ყალბი ანგარიში', value: 'ყალბი / დუბლიკატი ანგარიში' },
  { label: 'შევიწროება', value: 'შევიწროება / ბულინგი' },
  { label: 'მავნე კონტენტი', value: 'მავნე ან არალეგალური კონტენტი' },
  { label: 'წესების დარღვევა', value: 'საიტის წესების დარღვევა' },
];

export const BlockUserModal = ({
  open,
  onOpenChange,
  targetUserId,
  targetUsername,
  targetIp,
  onBlocked
}: BlockUserModalProps) => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [blockType, setBlockType] = useState<'USER' | 'IP'>('USER');
  const [isPermanent, setIsPermanent] = useState(false);
  const [duration, setDuration] = useState('1');
  const [durationUnit, setDurationUnit] = useState<'minutes' | 'hours' | 'days'>('hours');
  const [reason, setReason] = useState('');
  const [customIp, setCustomIp] = useState(targetIp || '');
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleQuickReason = (value: string) => {
    setReason(value);
  };

  const calculateExpiresAt = (): string | null => {
    if (isPermanent) return null;
    
    const durationValue = parseInt(duration);
    if (isNaN(durationValue) || durationValue <= 0) return null;

    let milliseconds = durationValue * 60 * 1000; // minutes
    if (durationUnit === 'hours') milliseconds = durationValue * 60 * 60 * 1000;
    if (durationUnit === 'days') milliseconds = durationValue * 24 * 60 * 60 * 1000;

    // Limit moderators to 7 days max unless super_admin
    if (userRole === 'moderator' && milliseconds > 7 * 24 * 60 * 60 * 1000) {
      milliseconds = 7 * 24 * 60 * 60 * 1000;
      toast({ 
        title: 'შეზღუდვა', 
        description: 'მოდერატორებს მაქსიმუმ 7 დღით შეუძლიათ დაბლოკვა',
        variant: 'destructive'
      });
    }

    return new Date(Date.now() + milliseconds).toISOString();
  };

  const handleSubmit = async () => {
    if (!reason.trim() || reason.length < 5) {
      toast({ title: 'მიზეზი სავალდებულოა (მინ. 5 სიმბოლო)', variant: 'destructive' });
      return;
    }

    if (!isPermanent && (!duration || parseInt(duration) <= 0)) {
      toast({ title: 'მიუთითეთ ხანგრძლივობა', variant: 'destructive' });
      return;
    }

    if (blockType === 'IP' && !customIp.trim()) {
      toast({ title: 'მიუთითეთ IP მისამართი', variant: 'destructive' });
      return;
    }

    // Show confirmation for permanent bans
    if (isPermanent && !showConfirm) {
      setShowConfirm(true);
      return;
    }

    setLoading(true);

    try {
      const expiresAt = calculateExpiresAt();

      const banData: any = {
        banned_by: user?.id,
        reason: reason.trim(),
        banned_until: expiresAt,
        block_type: blockType,
        blocked_by_role: userRole,
        status: 'ACTIVE',
        metadata: {
          blocked_at_timestamp: Date.now(),
          target_username: targetUsername
        }
      };

      // Set appropriate fields based on block type
      if (blockType === 'USER') {
        banData.user_id = targetUserId;
      } else if (blockType === 'IP') {
        banData.user_id = targetUserId;
        banData.blocked_ip = customIp.trim();
      }

      // First, check if user already has a ban and update or remove it
      const { data: existingBan } = await supabase
        .from('site_bans')
        .select('id')
        .eq('user_id', targetUserId)
        .maybeSingle();

      let error;
      
      if (existingBan) {
        // Update existing ban instead of inserting new one
        const { error: updateError } = await supabase
          .from('site_bans')
          .update({
            banned_by: user?.id,
            reason: reason.trim(),
            banned_until: expiresAt,
            block_type: blockType,
            blocked_by_role: userRole,
            status: 'ACTIVE',
            blocked_ip: blockType === 'IP' ? customIp.trim() : null,
            removed_at: null,
            removed_by: null,
            metadata: {
              blocked_at_timestamp: Date.now(),
              target_username: targetUsername
            }
          })
          .eq('id', existingBan.id);
        error = updateError;
      } else {
        // Insert new ban
        const { error: insertError } = await supabase
          .from('site_bans')
          .insert(banData);
        error = insertError;
      }

      if (error) throw error;

      // Mark user as banned in profile
      if (blockType === 'USER') {
        await supabase
          .from('profiles')
          .update({ is_site_banned: true })
          .eq('user_id', targetUserId);
        
        // End any active live streams for this user
        await endUserLiveStreams(targetUserId);
      }

      toast({ 
        title: 'მომხმარებელი დაიბლოკა', 
        description: isPermanent ? 'სამუდამოდ' : `${duration} ${durationUnit === 'minutes' ? 'წუთით' : durationUnit === 'hours' ? 'საათით' : 'დღით'}`
      });

      onBlocked?.();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error blocking user:', error);
      toast({ title: 'შეცდომა', description: 'ბლოკირება ვერ მოხერხდა', variant: 'destructive' });
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  const resetForm = () => {
    setBlockType('USER');
    setIsPermanent(false);
    setDuration('1');
    setDurationUnit('hours');
    setReason('');
    setShowConfirm(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Ban className="w-5 h-5" />
            მომხმარებლის ბლოკირება
          </DialogTitle>
        </DialogHeader>

        {showConfirm ? (
          <div className="space-y-4">
            <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-900">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-red-800 dark:text-red-200">სამუდამო ბლოკი!</h4>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    ნამდვილად გინდა <strong>{targetUsername}</strong>-ის სამუდამოდ დაბლოკვა?
                    ეს მოქმედება შეიძლება მოგვიანებით გაუქმდეს Admin Panel-იდან.
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowConfirm(false)}>გაუქმება</Button>
              <Button variant="destructive" onClick={handleSubmit} disabled={loading}>
                {loading ? 'იბლოკება...' : 'დაბლოკვა'}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Target Info */}
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{targetUsername}</span>
                <Badge variant="secondary" className="text-xs">{targetUserId.slice(0, 8)}...</Badge>
              </div>
            </div>

            {/* Block Type */}
            <div className="space-y-3">
              <Label className="font-medium">ბლოკის ტიპი</Label>
              <RadioGroup value={blockType} onValueChange={(v) => setBlockType(v as 'USER' | 'IP')}>
                <div className="flex items-center space-x-2 p-2 rounded-lg hover:bg-muted cursor-pointer">
                  <RadioGroupItem value="USER" id="type-user" />
                  <Label htmlFor="type-user" className="flex items-center gap-2 cursor-pointer flex-1">
                    <User className="w-4 h-4 text-blue-500" />
                    <span>მომხმარებლის დაბლოკვა (საიტზე)</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-2 rounded-lg hover:bg-muted cursor-pointer">
                  <RadioGroupItem value="IP" id="type-ip" />
                  <Label htmlFor="type-ip" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Globe className="w-4 h-4 text-orange-500" />
                    <span>IP ბლოკი</span>
                  </Label>
                </div>
              </RadioGroup>

              {blockType === 'IP' && (
                <div className="space-y-2 pl-6">
                  <Label>IP მისამართი</Label>
                  <Input
                    value={customIp}
                    onChange={(e) => setCustomIp(e.target.value)}
                    placeholder="192.168.1.1"
                  />
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    IP ბლოკი შეიძლება შეეხოს სხვა მომხმარებლებსაც იგივე ქსელიდან
                  </p>
                </div>
              )}
            </div>

            {/* Duration */}
            <div className="space-y-3">
              <Label className="font-medium flex items-center gap-2">
                <Clock className="w-4 h-4" />
                ხანგრძლივობა
              </Label>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="permanent"
                  checked={isPermanent}
                  onCheckedChange={(checked) => setIsPermanent(checked === true)}
                />
                <Label htmlFor="permanent" className="cursor-pointer">სამუდამოდ</Label>
              </div>

              {!isPermanent && (
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    min="1"
                    className="w-24"
                  />
                  <Select value={durationUnit} onValueChange={(v: any) => setDurationUnit(v)}>
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minutes">წუთი</SelectItem>
                      <SelectItem value="hours">საათი</SelectItem>
                      <SelectItem value="days">დღე</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {userRole === 'moderator' && (
                <p className="text-xs text-muted-foreground">
                  მოდერატორებს მაქსიმუმ 7 დღით შეუძლიათ დაბლოკვა
                </p>
              )}
            </div>

            {/* Reason */}
            <div className="space-y-3">
              <Label className="font-medium">მიზეზი (სავალდებულო)</Label>
              
              <div className="flex flex-wrap gap-2">
                {REASON_TEMPLATES.map(template => (
                  <Button
                    key={template.value}
                    type="button"
                    variant={reason === template.value ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => handleQuickReason(template.value)}
                  >
                    {template.label}
                  </Button>
                ))}
              </div>

              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="ბლოკირების მიზეზი (მინ. 5 სიმბოლო)..."
                rows={3}
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>გაუქმება</Button>
              <Button 
                variant="destructive" 
                onClick={handleSubmit} 
                disabled={loading || reason.length < 5}
              >
                <Ban className="w-4 h-4 mr-2" />
                {loading ? 'იბლოკება...' : 'დაბლოკვა'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
