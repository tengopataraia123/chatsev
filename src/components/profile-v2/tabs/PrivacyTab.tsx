import { useState, useEffect, useMemo } from 'react';
import { isMessagingForcedOpen } from '@/lib/adminExemptions';
import { Eye, MessageCircle, Phone, Shield, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { canViewPrivateMessages } from '@/utils/adminAccessUtils';

interface PrivacyTabProps {
  userId: string;
  isOwnProfile: boolean;
  isSuperAdmin?: boolean;
}

type VisibilityOption = 'everyone' | 'friends' | 'nobody';

const PrivacyTab = ({ userId, isOwnProfile, isSuperAdmin = false }: PrivacyTabProps) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const isMessagingForced = useMemo(() => isMessagingForcedOpen(userId), [userId]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Privacy settings state
  const [profileVisibility, setProfileVisibility] = useState<VisibilityOption>('everyone');
  const [messagePermission, setMessagePermission] = useState<VisibilityOption>('everyone');
  const [callsEnabled, setCallsEnabled] = useState(true);
  const [isInvisible, setIsInvisible] = useState(false);

  // Check if current user can edit (own profile or super admin)
  const canEdit = isOwnProfile || isSuperAdmin;
  
  // Invisible mode is ONLY for CHEGE and Pikaso specifically (and only on own profile)
  const canUseInvisibleMode = isOwnProfile && canViewPrivateMessages(profile?.username);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('privacy_settings')
          .select('profile_visibility, message_permission, calls_enabled, is_invisible')
          .eq('user_id', userId)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setProfileVisibility((data.profile_visibility as VisibilityOption) || 'everyone');
          setMessagePermission((data.message_permission as VisibilityOption) || 'everyone');
          setCallsEnabled(data.calls_enabled !== false);
          setIsInvisible(data.is_invisible || false);
        }
      } catch (error) {
        console.error('Error loading privacy settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [userId]);

  const updateSetting = async (field: string, value: string | boolean) => {
    if (!canEdit) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('privacy_settings')
        .upsert({ 
          user_id: userId,
          [field]: value
        }, { onConflict: 'user_id' });

      if (error) throw error;

      toast({ title: 'პარამეტრები შეინახა' });
    } catch (error) {
      console.error('Error updating setting:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleProfileVisibilityChange = (value: VisibilityOption) => {
    setProfileVisibility(value);
    updateSetting('profile_visibility', value);
  };

  const handleMessagePermissionChange = (value: VisibilityOption) => {
    // Check if this user has forced-open messaging
    if (isMessagingForced) return;
    setMessagePermission(value);
    updateSetting('message_permission', value);
  };

  const handleCallsEnabledChange = (value: boolean) => {
    setCallsEnabled(value);
    updateSetting('calls_enabled', value);
  };

  const handleInvisibleChange = (value: boolean) => {
    setIsInvisible(value);
    updateSetting('is_invisible', value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Shield className="w-12 h-12 text-muted-foreground mb-3" />
        <p className="text-muted-foreground">
          კონფიდენციალურობის პარამეტრების ნახვა/რედაქტირება შეუძლებელია
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-lg">კონფიდენციალურობა</h3>
      </div>

      {/* Profile Visibility */}
      <Card className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Eye className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <Label className="text-sm font-medium">ვის შეუძლია ნახოს ჩემი პროფილი?</Label>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              აირჩიეთ ვინ შეძლებს თქვენი პროფილის ნახვას
            </p>
            <Select
              value={profileVisibility}
              onValueChange={handleProfileVisibilityChange}
              disabled={saving}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="აირჩიეთ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="everyone">ყველას</SelectItem>
                <SelectItem value="friends">მხოლოდ მეგობრებს</SelectItem>
                <SelectItem value="nobody">არავის</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Message Permission */}
      <Card className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
            <MessageCircle className="w-5 h-5 text-blue-500" />
          </div>
          <div className="flex-1 min-w-0">
            <Label className="text-sm font-medium">ვის შეუძლია მომწეროს?</Label>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              აირჩიეთ ვისგან გინდათ შეტყობინებების მიღება
            </p>
            <Select
              value={isMessagingForced ? 'everyone' : messagePermission}
              onValueChange={handleMessagePermissionChange}
              disabled={saving || isMessagingForced}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="აირჩიეთ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="everyone">ყველას</SelectItem>
                <SelectItem value="friends">მხოლოდ მეგობრებს</SelectItem>
                <SelectItem value="nobody">არავის</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Audio/Video Calls */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
              <Phone className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <Label className="text-sm font-medium">აუდიო/ვიდეო ზარები</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {callsEnabled ? 'მეგობრებს შეუძლიათ დარეკვა' : 'ზარები გამორთულია'}
              </p>
            </div>
          </div>
          <Switch
            checked={callsEnabled}
            onCheckedChange={handleCallsEnabledChange}
            disabled={saving}
          />
        </div>
      </Card>

      {/* Invisible Mode - Only for CHEGE and Pikaso */}
      {canUseInvisibleMode && (
        <Card className="p-4 border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <Label className="text-sm font-medium text-amber-500">უხილავი რეჟიმი</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  სხვები ვერ დაინახავენ თქვენს ონლაინ სტატუსს
                </p>
              </div>
            </div>
            <Switch
              checked={isInvisible}
              onCheckedChange={handleInvisibleChange}
              disabled={saving}
            />
          </div>
        </Card>
      )}

      {/* Info Notice */}
      <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
        <p className="flex items-start gap-2">
          <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            ადმინისტრატორებსა და მოდერატორებს შეუძლიათ პროფილის ნახვა და მიმოწერა 
            კონფიდენციალურობის პარამეტრების მიუხედავად.
          </span>
        </p>
      </div>
    </div>
  );
};

export default PrivacyTab;
