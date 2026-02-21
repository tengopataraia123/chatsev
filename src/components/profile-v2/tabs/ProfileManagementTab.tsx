import { useState, useEffect } from 'react';
import { Edit, Sparkles, Type, Lock, Key, Loader2, Check, LogOut, User, Shield, Eye, EyeOff, Trash2, AlertTriangle, Bell, BellOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import UsernameStyleEditor from '@/components/username/UsernameStyleEditor';
import TextStyleEditor from '@/components/text/TextStyleEditor';
import { RoleManagement } from '@/components/admin/RoleManagement';
import { canChangeRole } from '@/utils/rootUtils';
import AccountDeactivationSection from './AccountDeactivationSection';
import DeleteConfirmDialog from '@/components/shared/DeleteConfirmDialog';
import { useNavigate } from 'react-router-dom';

interface ProfileManagementTabProps {
  viewedUserId?: string;
  isOwnProfile?: boolean;
}

const ProfileManagementTab = ({ viewedUserId, isOwnProfile = true }: ProfileManagementTabProps) => {
  const { user, isSuperAdmin, userRole, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Target user ID - use viewedUserId if provided, otherwise current user
  const targetUserId = viewedUserId || user?.id;
  
  // Can edit: own profile OR super admin viewing any profile
  const canEdit = isOwnProfile || isSuperAdmin;
  
  // Check role management permission - fetch target role later
  const [targetRole, setTargetRole] = useState<string | null>(null);
  
  // Username state
  const [currentUsername, setCurrentUsername] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [showUsernameEditor, setShowUsernameEditor] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Style editors
  const [showDisplayStyleEditor, setShowDisplayStyleEditor] = useState(false);
  const [showMessageStyleEditor, setShowMessageStyleEditor] = useState(false);
  
  // Password change
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  
  // Password recovery
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  
  // Password visibility toggles
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Delete user (super admin only)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingUser, setDeletingUser] = useState(false);

  // Push notifications - default to ON on native (auto-registered by FCMInitializer)
  const isNativePlatform = typeof (window as any)?.Capacitor !== 'undefined' && 
    (window as any)?.Capacitor?.isNativePlatform?.() === true;
  const [pushEnabled, setPushEnabled] = useState(true); // Default ON
  const [pushLoading, setPushLoading] = useState(true);

  useEffect(() => {
    fetchUsername();
    if (!isOwnProfile && targetUserId) {
      fetchTargetRole();
    }
    if (isOwnProfile && targetUserId) {
      fetchPushStatus();
    }
  }, [targetUserId, isOwnProfile]);

  const fetchPushStatus = async () => {
    if (!targetUserId) return;
    setPushLoading(true);
    try {
      const { data, error } = await supabase
        .from('push_tokens')
        .select('id')
        .eq('user_id', targetUserId)
        .limit(1);
      
      if (!error) {
        // If native and no token yet, auto-register (default ON behavior)
        if ((data?.length || 0) === 0 && isNativePlatform) {
          try {
            const { PushNotifications } = await import('@capacitor/push-notifications');
            const permResult = await PushNotifications.checkPermissions();
            if (permResult.receive === 'granted') {
              await PushNotifications.register();
              setPushEnabled(true);
            } else {
              // Try requesting permission silently
              const reqResult = await PushNotifications.requestPermissions();
              if (reqResult.receive === 'granted') {
                await PushNotifications.register();
                setPushEnabled(true);
              } else {
                setPushEnabled(false);
              }
            }
          } catch {
            // If Capacitor push fails, still show as enabled (FCMInitializer handles it)
            setPushEnabled(true);
          }
        } else {
          setPushEnabled((data?.length || 0) > 0);
        }
      }
    } catch (err) {
      console.error('Error checking push status:', err);
    } finally {
      setPushLoading(false);
    }
  };

  const handleTogglePush = async (enabled: boolean) => {
    if (!targetUserId) return;
    
    if (!enabled) {
      // Disable: remove all tokens for this user
      const { error } = await supabase
        .from('push_tokens')
        .delete()
        .eq('user_id', targetUserId);
      
      if (!error) {
        setPushEnabled(false);
        toast({ title: 'Push შეტყობინებები გამოირთო' });
      }
    } else {
      // Enable: try to register token via Capacitor (native)
      if (isNativePlatform) {
        try {
          const { PushNotifications } = await import('@capacitor/push-notifications');
          
          // Check current permission status first
          const checkResult = await PushNotifications.checkPermissions();
          
          if (checkResult.receive === 'granted') {
            // Already have permission, just register
            await PushNotifications.register();
            setPushEnabled(true);
            toast({ title: 'Push შეტყობინებები ჩაირთო! 🔔' });
          } else if (checkResult.receive === 'denied') {
            // Permission was permanently denied - tell user to go to settings
            toast({ 
              title: 'ნებართვა საჭიროა', 
              description: 'გახსენით ტელეფონის პარამეტრები → აპლიკაციები → ChatSev → შეტყობინებები და ჩართეთ', 
              variant: 'destructive' 
            });
          } else {
            // Permission not yet decided - request it
            const permResult = await PushNotifications.requestPermissions();
            if (permResult.receive === 'granted') {
              await PushNotifications.register();
              setPushEnabled(true);
              toast({ title: 'Push შეტყობინებები ჩაირთო! 🔔' });
            } else {
              toast({ 
                title: 'ნებართვა საჭიროა', 
                description: 'გახსენით ტელეფონის პარამეტრები → აპლიკაციები → ChatSev → შეტყობინებები და ჩართეთ', 
                variant: 'destructive' 
              });
            }
          }
        } catch (err) {
          console.error('Push registration error:', err);
          // Even if error, try setting enabled and let FCMInitializer handle it
          setPushEnabled(true);
          toast({ title: 'Push შეტყობინებები ჩაირთო! 🔔' });
        }
      } else {
        // Web: just toggle on as preference
        setPushEnabled(true);
        toast({ title: 'Push შეტყობინებები ჩაირთო! 🔔' });
        
        if ('Notification' in window) {
          try {
            await Notification.requestPermission();
          } catch (_) { /* ignore */ }
        }
      }
    }
  };

  const fetchTargetRole = async () => {
    if (!targetUserId) return;
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', targetUserId)
      .maybeSingle();
    setTargetRole(data?.role || 'user');
  };

  const fetchUsername = async () => {
    if (!targetUserId) return;
    
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('username')
      .eq('user_id', targetUserId)
      .single();
    
    if (data) {
      setCurrentUsername(data.username);
      setNewUsername(data.username);
    }
    setLoading(false);
  };

  const handleSaveUsername = async () => {
    if (!targetUserId || !newUsername.trim()) return;
    
    const trimmedUsername = newUsername.trim();
    
    // Validation: length 3-20
    if (trimmedUsername.length < 3 || trimmedUsername.length > 20) {
      toast({ title: 'მეტსახელი უნდა იყოს 3-20 სიმბოლო', variant: 'destructive' });
      return;
    }
    
    setSavingUsername(true);
    try {
      // Check if username is taken
      const { data: existing } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('username', trimmedUsername)
        .neq('user_id', targetUserId)
        .maybeSingle();
      
      if (existing) {
        toast({ title: 'ეს მეტსახელი უკვე დაკავებულია', variant: 'destructive' });
        return;
      }
      
      // Generate new login email
      const generateLoginEmail = (username: string): string => {
        if (/^[a-zA-Z0-9_]+$/.test(username)) {
          return username.toLowerCase() + '@metanetwork.local';
        } else {
          const encoded = btoa(unescape(encodeURIComponent(username.toLowerCase())));
          return encoded.replace(/\+/g, '_').replace(/\//g, '_').replace(/=/g, '_') + '@metanetwork.local';
        }
      };
      
      const newLoginEmail = generateLoginEmail(trimmedUsername);
      
      // Use admin API via edge function to update auth email without confirmation
      // This MUST succeed for login with new username to work
      console.log('[UsernameChange] Updating auth email to:', newLoginEmail, 'for user:', targetUserId);
      const { data: authResult, error: authError } = await supabase.functions.invoke('update-auth-email', {
        body: { newEmail: newLoginEmail, userId: isOwnProfile ? undefined : targetUserId }
      });
      
      if (authError || !authResult?.success) {
        console.error('[UsernameChange] CRITICAL: Failed to update auth email:', authError || authResult?.error);
        toast({ title: 'შეცდომა ავტორიზაციის განახლებისას', description: 'სცადეთ თავიდან', variant: 'destructive' });
        return;
      }
      console.log('[UsernameChange] Auth email updated successfully');
      
      // Log username change to history
      if (currentUsername && currentUsername !== trimmedUsername) {
        await supabase.from('username_history').insert({
          user_id: targetUserId,
          old_username: currentUsername,
          new_username: trimmedUsername,
        });
      }
      
      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({ 
          username: trimmedUsername,
          login_email: newLoginEmail
        })
        .eq('user_id', targetUserId);
      
      if (error) throw error;
      
      setCurrentUsername(trimmedUsername);
      setShowUsernameEditor(false);
      toast({ 
        title: 'მეტსახელი შეიცვალა!', 
        description: isOwnProfile ? 'ახლა მხოლოდ ახალი მეტსახელით შეძლებთ შესვლას' : 'მომხმარებლის მეტსახელი განახლდა'
      });
    } catch (error) {
      console.error('Error updating username:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    } finally {
      setSavingUsername(false);
    }
  };

  const handlePasswordChange = async () => {
    // Validation
    if (newPassword.length < 8) {
      toast({ title: 'პაროლი უნდა იყოს მინიმუმ 8 სიმბოლო', variant: 'destructive' });
      return;
    }

    if (!/\d/.test(newPassword)) {
      toast({ title: 'პაროლი უნდა შეიცავდეს მინიმუმ 1 ციფრს', variant: 'destructive' });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({ title: 'პაროლები არ ემთხვევა', variant: 'destructive' });
      return;
    }

    setChangingPassword(true);
    try {
      // If changing own password
      if (isOwnProfile && user?.id === targetUserId) {
        const { error } = await supabase.auth.updateUser({
          password: newPassword
        });

        if (error) throw error;

        // Update password_changed_at in profile
        await supabase
          .from('profiles')
          .update({ password_changed_at: new Date().toISOString() })
          .eq('user_id', user.id);

        toast({ 
          title: 'პაროლი შეიცვალა!', 
          description: 'გთხოვთ თავიდან შეხვიდეთ'
        });

        setShowPasswordModal(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowCurrentPassword(false);
        setShowNewPassword(false);
        setShowConfirmPassword(false);
        await signOut();
      } else if (isSuperAdmin && targetUserId) {
        // Super admin changing another user's password via edge function
        const { data, error } = await supabase.functions.invoke('admin-change-password', {
          body: { 
            userId: targetUserId,
            newPassword: newPassword
          }
        });

        if (error) throw error;

        toast({ 
          title: 'პაროლი შეიცვალა!', 
          description: 'მომხმარებლის პაროლი წარმატებით განახლდა'
        });

        setShowPasswordModal(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowCurrentPassword(false);
        setShowNewPassword(false);
        setShowConfirmPassword(false);
      }
    } catch (error) {
      console.error('Error changing password:', error);
      toast({ title: 'პაროლის შეცვლა ვერ მოხერხდა', variant: 'destructive' });
    } finally {
      setChangingPassword(false);
    }
  };

  const handlePasswordRecovery = () => {
    toast({ 
      title: 'პაროლის აღდგენა', 
      description: 'დაუკავშირდით ადმინისტრაციას პაროლის აღსადგენად'
    });
    setShowRecoveryModal(false);
  };

  // Handle delete user (super admin only)
  const handleDeleteUser = async () => {
    if (!user || !targetUserId || !isSuperAdmin || isOwnProfile) return;
    
    setDeletingUser(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-delete-user', {
        body: { targetUserId: targetUserId }
      });

      if (error) throw error;

      toast({
        title: 'მომხმარებელი წაიშალა',
        description: 'მომხმარებელი წარმატებით წაიშალა სისტემიდან',
      });

      // Navigate back to home
      navigate('/');
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: 'შეცდომა',
        description: 'მომხმარებლის წაშლა ვერ მოხერხდა',
        variant: 'destructive',
      });
    } finally {
      setDeletingUser(false);
      setShowDeleteDialog(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // If cannot edit - show read-only info
  if (!canEdit) {
    return (
      <div className="space-y-6">
        <h3 className="font-semibold">პროფილის ინფორმაცია</h3>

        {/* Username - Read only */}
        <div className="p-4 rounded-xl bg-card border border-border space-y-3">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            <span className="font-medium">მეტსახელი</span>
          </div>
          <div className="p-3 rounded-lg bg-muted text-foreground font-medium">
            {currentUsername}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h3 className="font-semibold">პროფილის მართვა</h3>
        {!isOwnProfile && isSuperAdmin && (
          <span className="flex items-center gap-1 text-xs bg-amber-500/20 text-amber-500 px-2 py-1 rounded-full">
            <Shield className="w-3 h-3" />
            ადმინ რეჟიმი
          </span>
        )}
      </div>

      {/* A) Username Change */}
      <div className="p-4 rounded-xl bg-card border border-border space-y-3">
        <div className="flex items-center gap-2">
          <Edit className="w-4 h-4 text-primary" />
          <span className="font-medium">მეტსახელის შეცვლა</span>
        </div>
        <p className="text-sm text-muted-foreground">
          მიმდინარე: <span className="text-foreground font-medium">{currentUsername}</span>
        </p>
        <Button variant="outline" size="sm" onClick={() => {
          setNewUsername(currentUsername);
          setShowUsernameEditor(true);
        }}>
          შეცვლა
        </Button>
      </div>

      {/* B) Display Name Style */}
      <div className="p-4 rounded-xl bg-card border border-border space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span className="font-medium">მეტსახელის გაფორმება</span>
        </div>
        <p className="text-sm text-muted-foreground">
          შრიფტი, ფერი, ზომა, Bold/Italic, გრადიენტი, ანიმაცია
        </p>
        <Button variant="outline" size="sm" onClick={() => setShowDisplayStyleEditor(true)}>
          რედაქტირება
        </Button>
      </div>

      {/* C) Message Style */}
      <div className="p-4 rounded-xl bg-card border border-border space-y-3">
        <div className="flex items-center gap-2">
          <Type className="w-4 h-4 text-blue-500" />
          <span className="font-medium">შეტყობინების გაფორმება</span>
        </div>
        <p className="text-sm text-muted-foreground">
          შეტყობინებების ტექსტის სტილი - ფერი, შრიფტი, ეფექტები
        </p>
        <Button variant="outline" size="sm" onClick={() => setShowMessageStyleEditor(true)}>
          რედაქტირება
        </Button>
      </div>

      {/* D) Password Change */}
      <div className="p-4 rounded-xl bg-card border border-border space-y-3">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-red-500" />
          <span className="font-medium">პაროლის შეცვლა</span>
        </div>
        <p className="text-sm text-muted-foreground">
          {isOwnProfile ? 'უსაფრთხო პაროლის განახლება' : 'მომხმარებლის პაროლის შეცვლა'}
        </p>
        <Button variant="outline" size="sm" onClick={() => setShowPasswordModal(true)}>
          შეცვლა
        </Button>
      </div>

      {/* E) Password Recovery - Only for own profile */}
      {isOwnProfile && (
        <div className="p-4 rounded-xl bg-card border border-border space-y-3">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-green-500" />
            <span className="font-medium">პაროლის აღდგენა</span>
          </div>
          <p className="text-sm text-muted-foreground">
            დაგავიწყდათ პაროლი?
          </p>
          <Button variant="outline" size="sm" onClick={() => setShowRecoveryModal(true)}>
            აღდგენა
          </Button>
        </div>
      )}

      {/* Push Notifications Toggle - Only for own profile */}
      {isOwnProfile && (
        <div className="p-4 rounded-xl bg-card border border-border space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {pushEnabled ? (
                <Bell className="w-4 h-4 text-primary" />
              ) : (
                <BellOff className="w-4 h-4 text-muted-foreground" />
              )}
              <span className="font-medium">Push შეტყობინებები</span>
            </div>
            <Switch
              checked={pushEnabled}
              onCheckedChange={handleTogglePush}
              disabled={pushLoading}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {pushEnabled 
              ? 'მიიღებთ შეტყობინებებს ახალი მესიჯების, ლაიქების და კომენტარების შესახებ'
              : 'Push შეტყობინებები გამორთულია'
            }
          </p>
        </div>
      )}

      {/* F) Account Deactivation - Only for own profile */}
      {isOwnProfile && <AccountDeactivationSection />}

      {/* G) Role Management - Only show if can change role */}
      {!isOwnProfile && targetUserId && canChangeRole(user?.id, userRole, targetUserId, targetRole) && (
        <RoleManagement 
          targetUserId={targetUserId}
          targetUsername={currentUsername}
        />
      )}

      {/* H) Delete User - Super Admin only, for other users */}
      {!isOwnProfile && isSuperAdmin && targetUserId && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <span className="font-medium text-destructive">მომხმარებლის წაშლა</span>
          </div>
          <p className="text-sm text-muted-foreground">
            სრულად წაშლის მომხმარებელს და მის ყველა მონაცემს სისტემიდან. ეს მოქმედება შეუქცევადია.
          </p>
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={() => setShowDeleteDialog(true)}
            disabled={deletingUser}
          >
            {deletingUser ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4 mr-2" />
            )}
            მომხმარებლის წაშლა
          </Button>
        </div>
      )}

      {/* Username Editor Dialog */}
      <Dialog open={showUsernameEditor} onOpenChange={setShowUsernameEditor}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>მეტსახელის შეცვლა</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>ახალი მეტსახელი</Label>
              <Input
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="ახალი მეტსახელი"
              />
            </div>
            <Button 
              onClick={handleSaveUsername} 
              disabled={savingUsername || newUsername === currentUsername}
              className="w-full"
            >
              {savingUsername ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              შენახვა
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Change Dialog */}
      <Dialog 
        open={showPasswordModal} 
        onOpenChange={(open) => {
          setShowPasswordModal(open);
          if (!open) {
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setShowCurrentPassword(false);
            setShowNewPassword(false);
            setShowConfirmPassword(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isOwnProfile ? 'პაროლის შეცვლა' : `პაროლის შეცვლა - ${currentUsername}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Old password - only for own profile */}
            {isOwnProfile && (
              <div className="space-y-2">
                <Label>ძველი პაროლი</Label>
                <div className="relative">
                  <Input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="მიმდინარე პაროლი"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>ახალი პაროლი</Label>
              <div className="relative">
                <Input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="მინ. 8 სიმბოლო, 1 ციფრი"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>გაიმეორე ახალი პაროლი</Label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="გაიმეორე პაროლი"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            {/* Forgot password link - only for own profile */}
            {isOwnProfile && (
              <button 
                onClick={() => {
                  setShowPasswordModal(false);
                  setShowRecoveryModal(true);
                }}
                className="text-sm text-primary hover:underline"
              >
                დაგავიწყდა პაროლი?
              </button>
            )}
            
            <Button 
              onClick={handlePasswordChange} 
              disabled={changingPassword || !newPassword || !confirmPassword}
              className="w-full"
            >
              {changingPassword ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : isOwnProfile ? (
                <LogOut className="w-4 h-4 mr-2" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              {isOwnProfile ? 'შეცვლა და გამოსვლა' : 'პაროლის შეცვლა'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Recovery Dialog */}
      <Dialog open={showRecoveryModal} onOpenChange={setShowRecoveryModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>პაროლის აღდგენა</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              პაროლის აღსადგენად გთხოვთ დაუკავშირდეთ საიტის ადმინისტრაციას.
            </p>
            <Button onClick={handlePasswordRecovery} className="w-full">
              გასაგებია
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Style Editors - pass targetUserId */}
      <UsernameStyleEditor
        isOpen={showDisplayStyleEditor}
        onClose={() => setShowDisplayStyleEditor(false)}
        targetUserId={targetUserId}
      />
      
      <TextStyleEditor
        isOpen={showMessageStyleEditor}
        onClose={() => setShowMessageStyleEditor(false)}
        targetUserId={targetUserId}
      />

      {/* Delete User Confirmation Dialog */}
      <DeleteConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDeleteUser}
        title="მომხმარებლის წაშლა"
        description={`დარწმუნებული ხართ რომ გსურთ ${currentUsername}-ის წაშლა? ეს მოქმედება წაშლის მომხმარებლის ყველა მონაცემს და შეუქცევადია.`}
        confirmText={deletingUser ? 'იშლება...' : 'წაშლა'}
        cancelText="გაუქმება"
      />
    </div>
  );
};

export default ProfileManagementTab;
