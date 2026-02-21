import { useState, useEffect, useMemo } from 'react';
import { isMessagingForcedOpen } from '@/lib/adminExemptions';
import { ArrowLeft, User, Bell, Lock, Eye, Moon, Globe, HelpCircle, Shield, Users, MessageSquare, Sparkles, Type, Edit, EyeOff, Heart, Phone, BadgeCheck } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { supabase } from '@/integrations/supabase/client';
import UsernameStyleEditor from '@/components/username/UsernameStyleEditor';
import TextStyleEditor from '@/components/text/TextStyleEditor';
import ChangePasswordModal from '@/components/settings/ChangePasswordModal';
import VerificationRequestForm from '@/components/settings/VerificationRequestForm';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SettingsViewProps {
  onBack: () => void;
}

type VisibilityOption = 'everyone' | 'friends' | 'nobody';

type ThemeOption = 'dark' | 'light' | 'facebook' | 'yellow';

const THEME_LABELS: Record<ThemeOption, string> = {
  dark: 'მუქი',
  light: 'ნათელი',
  facebook: 'Facebook Style',
  yellow: 'Yellow',
};

const SettingsView = ({ onBack }: SettingsViewProps) => {
  const { t, language, setLanguage } = useLanguage();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { permission, requestPermission, isSupported } = usePushNotifications();
  const [notifications, setNotifications] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<ThemeOption>('dark');
  const [profileVisibility, setProfileVisibility] = useState<VisibilityOption>('everyone');
  const [messagePermission, setMessagePermission] = useState<VisibilityOption>('everyone');
  const [callsEnabled, setCallsEnabled] = useState(true);
  const [isInvisible, setIsInvisible] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [showStyleEditor, setShowStyleEditor] = useState(false);
  const [showTextStyleEditor, setShowTextStyleEditor] = useState(false);
  const [showUsernameEditor, setShowUsernameEditor] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentUsername, setCurrentUsername] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Load saved theme on mount - from Supabase first, then localStorage as fallback
  useEffect(() => {
    const loadTheme = async () => {
      if (user?.id) {
        const { data } = await supabase
          .from('profiles')
          .select('theme')
          .eq('user_id', user.id)
          .single();
        
        if (data?.theme) {
          setCurrentTheme(data.theme as ThemeOption);
          applyTheme(data.theme as ThemeOption);
          localStorage.setItem('app-theme', data.theme);
          return;
        }
      }
      
      // Fallback to localStorage
      const savedTheme = localStorage.getItem('app-theme') as ThemeOption;
      if (savedTheme) {
        setCurrentTheme(savedTheme);
        applyTheme(savedTheme);
      }
    };
    
    loadTheme();
  }, [user?.id]);

  const applyTheme = (theme: ThemeOption) => {
    const root = document.documentElement;
    // Remove all theme classes
    root.classList.remove('dark', 'theme-facebook', 'theme-yellow');
    
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'facebook') {
      root.classList.add('theme-facebook');
    } else if (theme === 'yellow') {
      root.classList.add('theme-yellow');
    }
    // 'light' is the default, no class needed
  };

  const handleThemeChange = async (theme: ThemeOption) => {
    setCurrentTheme(theme);
    applyTheme(theme);
    localStorage.setItem('app-theme', theme);
    
    // Save to Supabase
    if (user?.id) {
      await supabase
        .from('profiles')
        .update({ theme })
        .eq('user_id', user.id);
    }
    
    toast({ title: 'თემა შეიცვალა' });
  };

  useEffect(() => {
    setNotifications(permission === 'granted');
  }, [permission]);

  useEffect(() => {
    fetchPrivacySettings();
    fetchCurrentUsername();
    checkSuperAdminRole();
  }, [user?.id]);

  const checkSuperAdminRole = async () => {
    if (!user?.id) {
      setIsSuperAdmin(false);
      return;
    }
    
    // Direct query to user_roles table for super_admin check
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'super_admin')
      .maybeSingle();
    
    if (error) {
      console.error('Error checking super admin:', error);
      setIsSuperAdmin(false);
      return;
    }
    
    const isSuperAdminResult = !!data;
    console.log('Super admin check - user:', user.id, 'result:', isSuperAdminResult);
    setIsSuperAdmin(isSuperAdminResult);
  };

  const fetchCurrentUsername = async () => {
    if (!user?.id) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('username')
      .eq('user_id', user.id)
      .single();
    
    if (data) {
      setCurrentUsername(data.username);
      setNewUsername(data.username);
    }
  };

  const fetchPrivacySettings = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('privacy_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        setProfileVisibility(data.profile_visibility as VisibilityOption);
        setMessagePermission(data.message_permission as VisibilityOption);
        setIsInvisible(data.is_invisible || false);
        setCallsEnabled(data.calls_enabled !== false); // Default to true if null
      } else {
        // Create default settings if not exists
        await supabase
          .from('privacy_settings')
          .insert({ user_id: user.id });
      }
    } catch (error) {
      console.error('Error fetching privacy settings:', error);
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleInvisibleModeChange = async (value: boolean) => {
    if (!user?.id) return;
    
    setSavingSettings(true);
    try {
      const { error } = await supabase
        .from('privacy_settings')
        .upsert({ 
          user_id: user.id,
          is_invisible: value
        }, { onConflict: 'user_id' });
      
      if (error) throw error;
      
      setIsInvisible(value);
      // Personal message only - no public indication
      toast({ title: 'შენთვის შეინახა' });
    } catch (error) {
      console.error('Error updating invisible mode:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleCallsEnabledChange = async (value: boolean) => {
    if (!user?.id) return;
    
    setSavingSettings(true);
    try {
      const { error } = await supabase
        .from('privacy_settings')
        .upsert({ 
          user_id: user.id,
          calls_enabled: value
        }, { onConflict: 'user_id' });
      
      if (error) throw error;
      
      setCallsEnabled(value);
      toast({ title: value ? 'ზარები ჩართულია (მეგობრებისთვის)' : 'ზარები გამორთულია' });
    } catch (error) {
      console.error('Error updating calls setting:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveUsername = async () => {
    if (!user?.id || !newUsername.trim()) return;
    
    const trimmedUsername = newUsername.trim();
    
    if (trimmedUsername.length < 3) {
      toast({ title: 'მეტსახელი უნდა იყოს მინიმუმ 3 სიმბოლო', variant: 'destructive' });
      return;
    }
    
    // Validate username format - allow all Unicode letters (including Georgian), numbers, underscore, and spaces
    if (!/^[\p{L}\p{N}_\s]+$/u.test(trimmedUsername)) {
      toast({ title: 'მეტსახელი შეიძლება შეიცავდეს ასოებს, ციფრებს, _ და სივრცეებს', variant: 'destructive' });
      return;
    }
    
    // Validation: length 3-20
    if (trimmedUsername.length < 3 || trimmedUsername.length > 20) {
      toast({ title: 'მეტსახელი უნდა იყოს 3-20 სიმბოლო', variant: 'destructive' });
      return;
    }

    setSavingUsername(true);
    try {
      // Check if username is already taken
      const { data: existing } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('username', trimmedUsername)
        .neq('user_id', user.id)
        .maybeSingle();
      
      if (existing) {
        toast({ title: 'ეს მეტსახელი უკვე დაკავებულია', variant: 'destructive' });
        return;
      }
      
      // Generate new login email based on username
      const generateLoginEmail = (username: string): string => {
        if (/^[a-zA-Z0-9_]+$/.test(username)) {
          return username.toLowerCase() + '@metanetwork.local';
        } else {
          const encoded = btoa(unescape(encodeURIComponent(username.toLowerCase())));
          return encoded.replace(/\+/g, '_').replace(/\//g, '_').replace(/=/g, '_') + '@metanetwork.local';
        }
      };
      
      const newLoginEmail = generateLoginEmail(trimmedUsername);
      
      // CRITICAL: Use admin API via edge function to update auth email without confirmation
      console.log('[UsernameChange] Updating auth email to:', newLoginEmail);
      const { data: authResult, error: authError } = await supabase.functions.invoke('update-auth-email', {
        body: { newEmail: newLoginEmail }
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
          user_id: user.id,
          old_username: currentUsername,
          new_username: trimmedUsername,
        });
      }
      
      // Update username and login_email in profiles
      const { error } = await supabase
        .from('profiles')
        .update({ 
          username: trimmedUsername,
          login_email: newLoginEmail
        })
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      setCurrentUsername(trimmedUsername);
      setShowUsernameEditor(false);
      toast({ 
        title: 'მეტსახელი შეიცვალა!', 
        description: 'ახლა მხოლოდ ახალი მეტსახელით შეძლებთ შესვლას'
      });
    } catch (error) {
      console.error('Error updating username:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    } finally {
      setSavingUsername(false);
    }
  };

  const isMessagingForced = useMemo(() => user?.id ? isMessagingForcedOpen(user.id) : false, [user?.id]);
  
  const updatePrivacySetting = async (field: 'profile_visibility' | 'message_permission', value: VisibilityOption) => {
    if (!user?.id) return;
    // Block message_permission changes for forced-open users
    if (field === 'message_permission' && isMessagingForced) return;
    
    setSavingSettings(true);
    try {
      const { error } = await supabase
        .from('privacy_settings')
        .upsert({ 
          user_id: user.id,
          [field]: value
        }, { onConflict: 'user_id' });
      
      if (error) throw error;
      
      if (field === 'profile_visibility') {
        setProfileVisibility(value);
      } else {
        setMessagePermission(value);
      }
      
      toast({ title: 'პარამეტრები შეინახა' });
    } catch (error) {
      console.error('Error updating privacy setting:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    } finally {
      setSavingSettings(false);
    }
  };

  const getVisibilityLabel = (value: VisibilityOption) => {
    switch (value) {
      case 'everyone': return 'ყველას';
      case 'friends': return 'მხოლოდ მეგობრებს';
      case 'nobody': return 'არავის';
    }
  };

  const settingsSections = [
    {
      title: 'ანგარიში',
      items: [
        { icon: User, label: 'პროფილის ინფორმაცია', action: 'profile-info' },
        { icon: Edit, label: 'მეტსახელის შეცვლა', action: 'change-username', value: currentUsername },
        { icon: Lock, label: 'პაროლის შეცვლა', action: 'change-password' },
        { icon: Sparkles, label: 'მეტსახელის გაფორმება', action: 'username-style' },
        { icon: Type, label: 'ტექსტის გაფორმება', action: 'text-style' },
        { icon: Heart, label: 'ურთიერთობის შეთავაზებები', action: 'relationship-requests' },
      ]
    },
    {
      title: 'კონფიდენციალურობა',
      items: [
        // Invisible mode only for super admins
        ...(isSuperAdmin ? [{
          icon: EyeOff, 
          label: 'უჩინარი რეჟიმი', 
          description: 'სხვა მომხმარებლებისთვის offline-ად გამოჩნდები',
          toggle: true,
          value: isInvisible,
          onChange: handleInvisibleModeChange
        }] : []),
        { 
          icon: Eye, 
          label: 'პროფილის ნახვა', 
          isSelect: true,
          selectValue: profileVisibility,
          onSelectChange: (value: VisibilityOption) => updatePrivacySetting('profile_visibility', value)
        },
        { 
          icon: MessageSquare, 
          label: 'შეტყობინებები', 
          isSelect: true,
          selectValue: isMessagingForced ? 'everyone' : messagePermission,
          onSelectChange: (value: VisibilityOption) => updatePrivacySetting('message_permission', value),
          disabled: isMessagingForced
        },
        { 
          icon: Phone, 
          label: 'აუდიო/ვიდეო ზარები', 
          description: 'ჩართვა = მეგობრები, გამორთვა = არავინ',
          toggle: true,
          value: callsEnabled,
          onChange: handleCallsEnabledChange
        },
      ]
    },
    {
      title: 'შეტყობინებები',
      items: [
        { 
          icon: Bell, 
          label: 'Push შეტყობინებები', 
          toggle: true, 
          value: notifications,
          onChange: async (value: boolean) => {
            if (value) {
              await requestPermission();
            } else {
              toast({ 
                title: 'ნოტიფიკაციების გამორთვა',
                description: 'გამორთეთ ბრაუზერის პარამეტრებში'
              });
            }
          }
        },
      ]
    },
    {
      title: 'დახმარება',
      items: [
        { icon: HelpCircle, label: 'დახმარება და მხარდაჭერა', action: 'help' },
      ]
    },
  ];

  const handleAction = (action: string) => {
    if (action === 'language') {
      const langs: ('ge' | 'en' | 'ru')[] = ['ge', 'en', 'ru'];
      const currentIndex = langs.indexOf(language);
      const nextIndex = (currentIndex + 1) % langs.length;
      setLanguage(langs[nextIndex]);
      toast({ title: 'ენა შეიცვალა' });
    } else if (action === 'username-style') {
      setShowStyleEditor(true);
    } else if (action === 'text-style') {
      setShowTextStyleEditor(true);
    } else if (action === 'change-username') {
      setNewUsername(currentUsername);
      setShowUsernameEditor(true);
    } else if (action === 'change-password') {
      setShowPasswordModal(true);
    } else if (action === 'relationship-requests') {
      // Navigate to relationship requests - handled externally
      toast({ title: 'გახსენით პარამეტრებში ან პროფილში' });
    } else {
      toast({ title: 'მალე დაემატება', description: action });
    }
  };

  // Account deletion removed - only super admins can delete users from admin panel

  return (
    <div className="flex flex-col h-full bg-background" style={{ height: '100dvh', maxHeight: '100dvh', overflow: 'hidden' }}>
      {/* Header */}
      <div className="flex-none bg-background/95 backdrop-blur-lg border-b border-border p-4 z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="text-xl font-bold">პარამეტრები</h2>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-6 pb-24" style={{ WebkitOverflowScrolling: 'touch' }}>
        {settingsSections.map((section, sectionIndex) => (
          // Skip empty sections
          section.items.length === 0 ? null : (
          <div key={sectionIndex}>
            <h3 className="text-sm font-medium text-muted-foreground mb-2 px-2">
              {section.title}
            </h3>
            <div className="bg-card rounded-xl overflow-hidden">
              {section.items.map((item, itemIndex) => (
                <div
                  key={itemIndex}
                  className={`flex items-center justify-between p-4 gap-2 ${
                    itemIndex !== section.items.length - 1 ? 'border-b border-border' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-5 h-5 text-foreground" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm whitespace-nowrap">{item.label}</span>
                      {'description' in item && item.description && (
                        <span className="text-xs text-muted-foreground max-w-[180px]">{item.description}</span>
                      )}
                    </div>
                  </div>
                  {'isThemeSelect' in item && item.isThemeSelect ? (
                    <Select
                      value={item.themeValue}
                      onValueChange={(value) => item.onThemeChange(value as ThemeOption)}
                    >
                      <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="აირჩიეთ თემა" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dark">{THEME_LABELS.dark}</SelectItem>
                        <SelectItem value="light">{THEME_LABELS.light}</SelectItem>
                        <SelectItem value="facebook">{THEME_LABELS.facebook}</SelectItem>
                        <SelectItem value="yellow">{THEME_LABELS.yellow}</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : 'isSelect' in item && item.isSelect ? (
                    <Select
                      value={item.selectValue}
                      onValueChange={item.onSelectChange}
                      disabled={savingSettings || loadingSettings || ('disabled' in item && item.disabled)}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="აირჩიეთ" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="everyone">ყველას</SelectItem>
                        <SelectItem value="friends">მეგობრებს</SelectItem>
                        <SelectItem value="nobody">არავის</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : 'toggle' in item && item.toggle ? (
                    <Switch
                      checked={item.value}
                      onCheckedChange={item.onChange}
                    />
                  ) : 'value' in item && item.value ? (
                    <button
                      onClick={() => handleAction(item.action || '')}
                      className="text-muted-foreground"
                    >
                      {item.value}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAction(item.action || '')}
                      className="text-muted-foreground"
                    >
                      →
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          )
        ))}

        {/* Verification Request */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2 px-2">
            ვერიფიკაცია
          </h3>
          <VerificationRequestForm />
        </div>

        {/* Account deletion removed - only super admins can delete users from admin panel */}

        <p className="text-center text-xs text-muted-foreground mt-8">
          ChatSev v1.0.0
        </p>
      </div>

      <UsernameStyleEditor 
        isOpen={showStyleEditor} 
        onClose={() => setShowStyleEditor(false)} 
      />
      <TextStyleEditor
        isOpen={showTextStyleEditor}
        onClose={() => setShowTextStyleEditor(false)}
      />
      
      {/* Username Change Dialog */}
      <Dialog open={showUsernameEditor} onOpenChange={setShowUsernameEditor}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              მეტსახელის შეცვლა
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">ახალი მეტსახელი</label>
              <Input
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="შეიყვანეთ მეტსახელი"
                maxLength={30}
              />
              <p className="text-xs text-muted-foreground">
                მინიმუმ 3 სიმბოლო, მაქსიმუმ 30
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowUsernameEditor(false)}
                className="flex-1"
              >
                გაუქმება
              </Button>
              <Button
                onClick={handleSaveUsername}
                disabled={savingUsername || newUsername.trim() === currentUsername}
                className="flex-1"
              >
                {savingUsername ? 'ინახება...' : 'შენახვა'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Password Modal */}
      <ChangePasswordModal 
        open={showPasswordModal} 
        onOpenChange={setShowPasswordModal} 
      />
    </div>
  );
};

export default SettingsView;