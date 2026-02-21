import { useState, useEffect } from 'react';
import { Check, Loader2, Lock, BarChart3, Star, User, Eye, EyeOff, Key, AlertTriangle, MapPin } from 'lucide-react';
import { Profile } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import CitySelect from '@/components/shared/CitySelect';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile | null;
  userRole: string | null;
  isOwnProfile: boolean;
  isSuperAdmin: boolean;
  postsCount: number;
  targetUserRole?: string | null;
  onSave: (data: {
    username: string;
    gender: string;
    birthday: string;
    city?: string;
    role?: string;
  }) => Promise<void>;
}

const ProfileEditModal = ({
  isOpen,
  onClose,
  profile,
  userRole,
  isOwnProfile,
  isSuperAdmin,
  postsCount,
  targetUserRole,
  onSave,
}: ProfileEditModalProps) => {
  const [username, setUsername] = useState(profile?.username || '');
  const [gender, setGender] = useState(profile?.gender || 'other');
  const [birthday, setBirthday] = useState((profile as any)?.birthday || '');
  const [city, setCity] = useState((profile as any)?.city || '');
  const [role, setRole] = useState(userRole || 'user');
  const [saving, setSaving] = useState(false);
  
  // Password management state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordLastChanged, setPasswordLastChanged] = useState<string | null>(null);
  
  const { toast } = useToast();

  // Check if target user is a super admin - we can't manage their password
  const isTargetSuperAdmin = targetUserRole === 'super_admin' || userRole === 'super_admin';
  
  // Can manage password only if: super admin, not own profile, target is not super admin
  const canManagePassword = isSuperAdmin && !isOwnProfile && !isTargetSuperAdmin;

  useEffect(() => {
    // Fetch password last changed info
    const fetchPasswordInfo = async () => {
      if (!profile?.user_id || !canManagePassword) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', profile.user_id)
        .single();
      
      if (data && (data as any).password_changed_at) {
        setPasswordLastChanged((data as any).password_changed_at);
      }
    };
    
    fetchPasswordInfo();
  }, [profile?.user_id, canManagePassword]);

  const getRoleLabel = (r: string | null) => {
    switch (r) {
      case 'super_admin': return 'სუპერ ადმინი';
      case 'admin': return 'ადმინისტრატორი';
      case 'moderator': return 'მოდერატორი';
      default: return 'მომხმარებელი';
    }
  };

  const getRoleBadgeColor = (r: string | null) => {
    switch (r) {
      case 'super_admin': return 'bg-red-500/20 text-red-500';
      case 'admin': return 'bg-amber-500/20 text-amber-500';
      case 'moderator': return 'bg-blue-500/20 text-blue-500';
      default: return 'bg-green-500/20 text-green-500';
    }
  };

  const getRank = (posts: number) => {
    if (posts >= 100) return { name: 'ლეგენდა', color: 'text-amber-500', bg: 'bg-amber-500/20', emoji: '👑' };
    if (posts >= 50) return { name: 'ექსპერტი', color: 'text-purple-500', bg: 'bg-purple-500/20', emoji: '💎' };
    if (posts >= 20) return { name: 'აქტიური', color: 'text-blue-500', bg: 'bg-blue-500/20', emoji: '⭐' };
    if (posts >= 5) return { name: 'მოწინავე', color: 'text-green-500', bg: 'bg-green-500/20', emoji: '🌟' };
    return { name: 'ახალბედა', color: 'text-gray-500', bg: 'bg-gray-500/20', emoji: '🔰' };
  };

  const rank = getRank(postsCount);

  const handleSave = async () => {
    if (!username.trim()) return;
    
    setSaving(true);
    try {
      await onSave({
        username: username.trim(),
        gender,
        birthday,
        city,
        role: isSuperAdmin && !isOwnProfile ? role : undefined,
      });
      onClose();
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!profile?.user_id || !canManagePassword) return;
    
    if (newPassword.length < 6) {
      toast({ title: 'პაროლი უნდა იყოს მინიმუმ 6 სიმბოლო', variant: 'destructive' });
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast({ title: 'პაროლები არ ემთხვევა', variant: 'destructive' });
      return;
    }
    
    setChangingPassword(true);
    try {
      // Call admin API to change user password
      const { error } = await supabase.functions.invoke('admin-change-password', {
        body: { 
          userId: profile.user_id, 
          newPassword 
        }
      });
      
      if (error) throw error;
      
      setPasswordLastChanged(new Date().toISOString());
      setNewPassword('');
      setConfirmPassword('');
      toast({ title: 'პაროლი წარმატებით შეიცვალა!' });
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast({ title: 'შეცდომა პაროლის შეცვლისას', variant: 'destructive' });
    } finally {
      setChangingPassword(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ka-GE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            პროფილის რედაქტირება
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Status Display */}
          <div className="bg-secondary/50 rounded-lg p-3 space-y-3">
            <div className="flex items-center gap-3">
              <Lock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">სტატუსი:</span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(userRole)}`}>
                {getRoleLabel(userRole)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">რეიტინგი:</span>
              <span className="font-medium">{postsCount}</span>
            </div>
            <div className="flex items-center gap-3">
              <Star className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">რანგი:</span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${rank.bg} ${rank.color}`}>
                {rank.emoji} {rank.name}
              </span>
            </div>
          </div>

          {/* Editable Fields */}
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">სახელი</label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="მომხმარებლის სახელი"
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-1 block">სქესი</label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">მამრობითი</SelectItem>
                <SelectItem value="female">მდედრობითი</SelectItem>
                <SelectItem value="other">სხვა</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-1 block">დაბადების თარიღი</label>
            <Input
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-1 block">ქალაქი</label>
            <CitySelect
              value={city}
              onChange={setCity}
              className="h-10"
            />
          </div>

          {/* Role Selection - Super Admin Only */}
          {isSuperAdmin && !isOwnProfile && (
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">როლი (სუპერ ადმინისთვის)</label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">მომხმარებელი</SelectItem>
                  <SelectItem value="moderator">მოდერატორი</SelectItem>
                  <SelectItem value="admin">ადმინისტრატორი</SelectItem>
                  <SelectItem value="super_admin">სუპერ ადმინი</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Password Management - Super Admin Only for Regular Users */}
          {canManagePassword && (
            <div className="border-t border-border pt-4 mt-4">
              <div className="flex items-center gap-2 mb-3">
                <Key className="w-4 h-4 text-primary" />
                <span className="font-medium">პაროლის მართვა</span>
              </div>
              
              {passwordLastChanged && (
                <div className="bg-secondary/50 rounded-lg p-3 mb-3">
                  <p className="text-xs text-muted-foreground">
                    პაროლი ბოლოს შეიცვალა: {formatDate(passwordLastChanged)}
                  </p>
                </div>
              )}
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">ახალი პაროლი</label>
                  <div className="relative">
                    <Input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="ახალი პაროლი"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">პაროლის დადასტურება</label>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="პაროლის დადასტურება"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                
                <Button 
                  onClick={handleChangePassword} 
                  disabled={changingPassword || !newPassword || !confirmPassword}
                  variant="outline"
                  className="w-full"
                >
                  {changingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      იცვლება...
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4 mr-2" />
                      პაროლის შეცვლა
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Warning for super admins viewing other super admins */}
          {isSuperAdmin && !isOwnProfile && isTargetSuperAdmin && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5" />
              <p className="text-xs text-amber-600">
                სხვა სუპერ ადმინის პაროლის შეცვლა შეუძლებელია უსაფრთხოების მიზნით.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            გაუქმება
          </Button>
          <Button onClick={handleSave} disabled={saving || !username.trim()}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ინახება...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                შენახვა
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileEditModal;
