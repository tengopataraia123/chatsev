import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Users, Globe, Check, MapPin } from 'lucide-react';
import { z } from 'zod';
import { useLanguage } from '@/contexts/LanguageContext';
import { Language } from '@/lib/i18n';
import ThemeSwitcher from '@/components/layout/ThemeSwitcher';
// Note: Registration approvals are created by database trigger (auto_create_registration_approval)
import { motion, AnimatePresence } from 'framer-motion';
import { BanInfo } from '@/hooks/useSiteBan';
import TopGeCounter from '@/components/TopGeCounter';
import CitySelect from '@/components/shared/CitySelect';
import { differenceInYears } from 'date-fns';
import { cn } from '@/lib/utils';
import ModernDatePicker from './ModernDatePicker';
import FormField from './FormField';
import ChatSevLogo from '@/components/ui/ChatSevLogo';
import AccountRestoreScreen from './AccountRestoreScreen';

// Calculate age from birthday
const calculateAge = (birthday: Date): number => {
  return differenceInYears(new Date(), birthday);
};

const registerSchema = z.object({
  username: z.string()
    .min(3, 'მეტსახელი უნდა იყოს მინიმუმ 3 სიმბოლო')
    .max(20, 'მეტსახელი უნდა იყოს მაქსიმუმ 20 სიმბოლო'),
  password: z.string()
    .min(6, 'პაროლი უნდა იყოს მინიმუმ 6 სიმბოლო'),
  confirmPassword: z.string(),
  birthday: z.date({ required_error: 'აირჩიეთ დაბადების თარიღი' }),
  gender: z.enum(['male', 'female', 'other'], { required_error: 'აირჩიეთ სქესი' }),
  city: z.string().min(1, 'აირჩიეთ ქალაქი'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'პაროლები არ ემთხვევა',
  path: ['confirmPassword'],
}).refine((data) => calculateAge(data.birthday) >= 18, {
  message: 'ასაკი უნდა იყოს მინიმუმ 18 წელი',
  path: ['birthday'],
}).refine((data) => calculateAge(data.birthday) <= 120, {
  message: 'არასწორი დაბადების თარიღი',
  path: ['birthday'],
});

const loginSchema = z.object({
  username: z.string().min(1, 'შეიყვანეთ მეტსახელი'),
  password: z.string().min(1, 'შეიყვანეთ პაროლი'),
});

const authTexts = {
  ge: {
    login: 'შესვლა',
    register: 'რეგისტრაცია',
    loginDesc: 'შედით თქვენს ანგარიშზე',
    registerDesc: 'შექმენით ახალი ანგარიში',
    username: 'მეტსახელი',
    usernamePlaceholder: 'შეიყვანეთ მეტსახელი',
    password: 'პაროლი',
    passwordPlaceholder: 'შეიყვანეთ პაროლი',
    confirmPassword: 'გაიმეორეთ პაროლი',
    confirmPasswordPlaceholder: 'გაიმეორეთ პაროლი',
    gender: 'სქესი',
    male: 'მამრობითი',
    female: 'მდედრობითი',
    other: 'სხვა',
    loginBtn: 'შესვლა',
    registerBtn: 'რეგისტრაცია',
    loggingIn: 'შესვლა...',
    registering: 'რეგისტრაცია...',
    dob: 'დაბადების თარიღი',
    city: 'ქალაქი',
    rememberMe: 'დამახსოვრება',
  },
  en: {
    login: 'Login',
    register: 'Register',
    loginDesc: 'Sign in to your account',
    registerDesc: 'Create a new account',
    username: 'Username',
    usernamePlaceholder: 'Enter username',
    password: 'Password',
    passwordPlaceholder: 'Enter password',
    confirmPassword: 'Confirm Password',
    confirmPasswordPlaceholder: 'Confirm password',
    gender: 'Gender',
    male: 'Male',
    female: 'Female',
    other: 'Other',
    loginBtn: 'Login',
    registerBtn: 'Register',
    loggingIn: 'Logging in...',
    registering: 'Registering...',
    dob: 'Date of Birth',
    city: 'City',
    rememberMe: 'Remember me',
  },
  ru: {
    login: 'Вход',
    register: 'Регистрация',
    loginDesc: 'Войдите в свой аккаунт',
    registerDesc: 'Создайте новый аккаунт',
    username: 'Имя пользователя',
    usernamePlaceholder: 'Введите имя пользователя',
    password: 'Пароль',
    passwordPlaceholder: 'Введите пароль',
    confirmPassword: 'Подтвердите пароль',
    confirmPasswordPlaceholder: 'Подтвердите пароль',
    gender: 'Пол',
    male: 'Мужской',
    female: 'Женский',
    other: 'Другой',
    loginBtn: 'Войти',
    registerBtn: 'Зарегистрироваться',
    loggingIn: 'Вход...',
    registering: 'Регистрация...',
    dob: 'Дата рождения',
    city: 'Город',
    rememberMe: 'Запомнить',
  },
};

interface AuthPageRedesignProps {
  onBanDetected: (banInfo: BanInfo) => void;
}

export const AuthPageRedesign = ({ onBanDetected }: AuthPageRedesignProps) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [rememberMe, setRememberMe] = useState(false);
  
  // Deactivated account restore state
  const [showRestoreScreen, setShowRestoreScreen] = useState(false);
  const [deactivatedInfo, setDeactivatedInfo] = useState<{
    loginEmail: string;
    password: string;
    deactivatedAt?: string;
  } | null>(null);
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    gender: '',
    city: '',
  });
  const [birthday, setBirthday] = useState<Date | undefined>(undefined);

  const navigate = useNavigate();
  const { toast } = useToast();
  const { language, setLanguage } = useLanguage();
  const txt = authTexts[language];

  // Check for password change success message
  useEffect(() => {
    const passwordChangeSuccess = sessionStorage.getItem('passwordChangeSuccess');
    if (passwordChangeSuccess === 'true') {
      sessionStorage.removeItem('passwordChangeSuccess');
      toast({
        title: 'წარმატება!',
        description: 'პაროლი წარმატებით შეიცვალა. შედით თავიდან.',
      });
    }
  }, [toast]);

  // Helper: check ban/deactivation with timeout, navigate or handle
  const checkAndNavigate = useCallback(async (session: { user: { id: string } }) => {
    try {
      const profilePromise = supabase
        .from('profiles')
        .select('account_status, deactivated_at')
        .eq('user_id', session.user.id)
        .maybeSingle();
      
      const profileResult = await Promise.race([
        profilePromise,
        new Promise<{ data: null; error: null }>((resolve) => setTimeout(() => resolve({ data: null, error: null }), 3000))
      ]);

      if (profileResult?.data?.account_status === 'deactivated') {
        console.log('[Auth] Account deactivated, signing out');
        await supabase.auth.signOut({ scope: 'local' });
        return;
      }

      // Ban check with short timeout - don't block navigation
      try {
        const banResult = await Promise.race([
          supabase.rpc('get_user_site_ban', { _user_id: session.user.id }).then(res => res.data),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000))
        ]);
        
        if (banResult && Array.isArray(banResult) && banResult.length > 0 && banResult[0].is_banned) {
          await supabase.auth.signOut({ scope: 'local' });
          onBanDetected({
            is_banned: true,
            ban_id: banResult[0].ban_id,
            block_type: banResult[0].block_type,
            reason: banResult[0].reason,
            banned_until: banResult[0].banned_until,
            banned_at: banResult[0].banned_at
          });
          return;
        }
      } catch {
        // Ban check failed - don't block login
      }
    } catch (e) {
      console.warn('[Auth] Check failed, navigating anyway:', e);
    }
    // Always navigate on success - don't let checks block the user
    navigate('/');
  }, [navigate, onBanDetected]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setLoading(false);
        await checkAndNavigate(session);
      }
    });

    // Initial session check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        await checkAndNavigate(session);
      }
    });

    return () => subscription.unsubscribe();
  }, [checkAndNavigate]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const withTimeout = async <T,>(promiseOrBuilder: Promise<T> | PromiseLike<T>, timeoutMs: number = 8000): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs);
      Promise.resolve(promiseOrBuilder)
        .then((result) => { clearTimeout(timer); resolve(result); })
        .catch((error) => { clearTimeout(timer); reject(error); });
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      if (isLogin) {
        const validation = loginSchema.safeParse({
          username: formData.username,
          password: formData.password,
        });

        if (!validation.success) {
          const fieldErrors: Record<string, string> = {};
          validation.error.errors.forEach(err => {
            if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
          });
          setErrors(fieldErrors);
          setLoading(false);
          return;
        }

        const normalizedUsername = formData.username.trim().replace(/\s+/g, ' ');
        
        // Find user profile with account status
        let profileData: { login_email: string; username: string; account_status?: string; deactivated_at?: string } | null = null;
        try {
          const result = await withTimeout(
            supabase.from('profiles').select('login_email, username, account_status, deactivated_at').ilike('username', normalizedUsername).maybeSingle().then(res => res),
            5000
          );
          profileData = result.data;
          console.log('[Login] Profile lookup result:', profileData);
        } catch (e) {
          console.warn('[Login] Profile lookup timeout');
        }

        // Fallback lookups
        if (!profileData) {
          try {
            const noSpaceUsername = normalizedUsername.replace(/\s/g, '');
            const result = await withTimeout(
              supabase.from('profiles').select('login_email, username, account_status, deactivated_at').ilike('username', noSpaceUsername).maybeSingle().then(res => res),
              5000
            );
            if (result.data) profileData = result.data;
          } catch (e) {}
        }

        if (!profileData) {
          try {
            const noSpaceInput = normalizedUsername.replace(/\s/g, '').toLowerCase();
            const result = await withTimeout(supabase.from('profiles').select('login_email, username, account_status, deactivated_at').limit(1000).then(res => res), 5000);
            if (result.data) {
              const match = result.data.find(p => p.username.replace(/\s/g, '').toLowerCase() === noSpaceInput);
              if (match) profileData = match;
            }
          } catch (e) {}
        }

        const loginEmail = profileData?.login_email || `${normalizedUsername.toLowerCase().replace(/\s/g, '')}@metanetwork.local`;

        // CRITICAL: Use edge function to check account status (bypasses RLS)
        // This is needed because unauthenticated users may not be able to read account_status
        try {
          console.log('[Login] Checking account status via edge function for:', loginEmail);
          const { data: statusData, error: statusError } = await supabase.functions.invoke('check-account-status', {
            body: { loginEmail }
          });
          
          console.log('[Login] Account status check result:', statusData);
          
          if (!statusError && statusData?.isDeactivated) {
            console.log('[Login] Account is deactivated, showing restore screen');
            setDeactivatedInfo({
              loginEmail: loginEmail,
              password: formData.password,
              deactivatedAt: statusData.deactivatedAt
            });
            setShowRestoreScreen(true);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.warn('[Login] Account status check failed:', e);
          // If check fails, fall through to normal login and let onAuthStateChange handle it
        }

        // Account is active, proceed with normal sign-in
        let signInResult;
        try {
          signInResult = await withTimeout(
            supabase.auth.signInWithPassword({ email: loginEmail, password: formData.password }),
            8000
          );
        } catch (e: unknown) {
          const error = e as Error;
          if (error.message === 'TIMEOUT') {
            toast({ title: 'დაელოდეთ', description: 'სერვერი არ პასუხობს. გთხოვთ სცადეთ თავიდან.', variant: 'destructive' });
            setLoading(false);
            return;
          }
          throw e;
        }

        if (signInResult?.error) {
          if (signInResult.error.message.includes('Invalid login credentials')) {
            // Check if this was an old username that was changed
            try {
              const { data: historyData } = await supabase
                .from('username_history')
                .select('new_username')
                .ilike('old_username', normalizedUsername)
                .order('changed_at', { ascending: false })
                .limit(1)
                .maybeSingle();
              
              if (historyData?.new_username) {
                toast({ 
                  title: 'მეტსახელი შეცვლილია', 
                  description: `თქვენი მეტსახელი შეიცვალა. ახალი მეტსახელია: ${historyData.new_username}. შედით ახალი მეტსახელით.`, 
                  variant: 'destructive',
                  duration: 8000
                });
              } else {
                toast({ title: 'შეცდომა', description: 'არასწორი მეტსახელი ან პაროლი', variant: 'destructive' });
              }
            } catch {
              toast({ title: 'შეცდომა', description: 'არასწორი მეტსახელი ან პაროლი', variant: 'destructive' });
            }
          } else {
            toast({ title: 'შეცდომა', description: signInResult.error.message, variant: 'destructive' });
          }
          setLoading(false);
          return;
        }
        // Success - loading will be cleared by onAuthStateChange -> navigate
        // But set a safety timeout in case onAuthStateChange is slow
        setTimeout(() => setLoading(false), 5000);
      } else {
        // Registration
        const validation = registerSchema.safeParse({
          username: formData.username,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
          birthday: birthday,
          gender: formData.gender,
          city: formData.city,
        });

        if (!validation.success) {
          const fieldErrors: Record<string, string> = {};
          validation.error.errors.forEach(err => {
            if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
          });
          setErrors(fieldErrors);
          setLoading(false);
          return;
        }

        const normalizedUsername = formData.username.trim().replace(/\s+/g, ' ');
        
        // Check if username exists
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('id')
          .ilike('username', normalizedUsername)
          .maybeSingle();

        if (existingUser) {
          toast({ title: 'შეცდომა', description: 'ეს მეტსახელი უკვე დაკავებულია', variant: 'destructive' });
          setLoading(false);
          return;
        }

        const emailSafeUsername = btoa(unescape(encodeURIComponent(normalizedUsername.toLowerCase()))).replace(/[+/=]/g, '_');
        const internalEmail = `${emailSafeUsername}@metanetwork.local`;
        const age = calculateAge(birthday!);

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: internalEmail,
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              username: normalizedUsername,
              age: age,
              gender: formData.gender,
              city: formData.city,
              birthday: birthday!.toISOString(),
            }
          }
        });

        if (signUpError) {
          toast({ title: 'შეცდომა', description: signUpError.message, variant: 'destructive' });
        } else if (signUpData.user) {
          // Update profile with login_email
          await supabase.from('profiles').update({ login_email: internalEmail }).eq('user_id', signUpData.user.id);
          
          // Note: pending_approval is created automatically by database trigger
          // (on_profile_created_create_approval)
          
          toast({ title: 'წარმატება!', description: 'ანგარიში წარმატებით შეიქმნა!' });
        }
      }
    } catch (error) {
      console.error('[Auth] Error:', error);
      toast({ title: 'შეცდომა', description: 'დაფიქსირდა შეცდომა, გთხოვთ სცადეთ თავიდან', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Show restore screen for deactivated accounts
  if (showRestoreScreen && deactivatedInfo) {
    return (
      <AccountRestoreScreen
        loginEmail={deactivatedInfo.loginEmail}
        password={deactivatedInfo.password}
        deactivatedAt={deactivatedInfo.deactivatedAt}
        onRestored={() => {
          setShowRestoreScreen(false);
          setDeactivatedInfo(null);
          navigate('/');
        }}
        onCancel={() => {
          setShowRestoreScreen(false);
          setDeactivatedInfo(null);
          setFormData(prev => ({ ...prev, password: '' }));
        }}
      />
    );
  }

  // Show restore screen for deactivated accounts
  if (showRestoreScreen && deactivatedInfo) {
    return (
      <AccountRestoreScreen
        loginEmail={deactivatedInfo.loginEmail}
        password={deactivatedInfo.password}
        deactivatedAt={deactivatedInfo.deactivatedAt}
        onRestored={() => {
          setShowRestoreScreen(false);
          setDeactivatedInfo(null);
          navigate('/');
        }}
        onCancel={() => {
          setShowRestoreScreen(false);
          setDeactivatedInfo(null);
          setFormData(prev => ({ ...prev, password: '' }));
        }}
      />
    );
  }

  return (
    <div 
      className="h-dvh w-full bg-background overflow-y-auto overflow-x-hidden overscroll-contain"
      style={{ 
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <div className="flex flex-col py-4 px-4 pb-8">
        {/* Settings bar */}
        <div className="shrink-0 flex justify-center gap-3 pb-4">
          <Select value={language} onValueChange={(val) => setLanguage(val as Language)}>
            <SelectTrigger className="w-auto h-10 px-3 bg-card/80 border-border/50 rounded-xl text-sm">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent className="bg-card border-border rounded-xl z-[100]">
              <SelectItem value="ge">🇬🇪 ქართული</SelectItem>
              <SelectItem value="en">🇺🇸 English</SelectItem>
              <SelectItem value="ru">🇷🇺 Русский</SelectItem>
            </SelectContent>
          </Select>
          <div className="h-10 px-2 bg-card/80 border border-border/50 rounded-xl flex items-center">
            <ThemeSwitcher />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="py-6 text-center shrink-0">
            <motion.p
              className="text-base font-medium text-primary mb-3 leading-relaxed"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              კეთილი იყოს თქვენი მობრძანება
            </motion.p>
            
            <motion.div 
              className="flex items-center justify-center gap-3 mb-2 auth-logo-glow"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            >
              <ChatSevLogo size={48} showText textClassName="text-2xl" />
            </motion.div>
            
            <motion.p 
              className="text-sm text-muted-foreground leading-relaxed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {isLogin ? txt.loginDesc : txt.registerDesc}
            </motion.p>
          </div>

          {/* Form card */}
          <div className="w-full max-w-md mx-auto flex-1">
            <div className="bg-card/80 backdrop-blur-xl rounded-2xl p-5 border border-border/40 shadow-xl">
              {/* Tab switcher */}
              <div className="flex mb-6 bg-secondary/50 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => { setIsLogin(true); setErrors({}); }}
                  className={cn(
                    "flex-1 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                    isLogin 
                      ? 'bg-primary text-primary-foreground shadow-md' 
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {txt.login}
                </button>
                <button
                  type="button"
                  onClick={() => { setIsLogin(false); setErrors({}); }}
                  className={cn(
                    "flex-1 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                    !isLogin 
                      ? 'bg-primary text-primary-foreground shadow-md' 
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {txt.register}
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Username */}
                <FormField id="username" label={txt.username} error={errors.username}>
                  <Input
                    id="username"
                    type="text"
                    placeholder={txt.usernamePlaceholder}
                    value={formData.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    className="h-12 text-base bg-secondary/50 border-border/50 rounded-xl focus:ring-2 focus:ring-primary/30"
                    style={{ fontSize: '16px' }}
                  />
                </FormField>

                {/* Password */}
                <FormField id="password" label={txt.password} error={errors.password}>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder={txt.passwordPlaceholder}
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className="pr-12 h-12 text-base bg-secondary/50 border-border/50 rounded-xl focus:ring-2 focus:ring-primary/30"
                      style={{ fontSize: '16px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-secondary/50 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </FormField>

                {/* Registration fields */}
                <AnimatePresence mode="wait">
                  {!isLogin && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-4"
                    >
                      {/* Confirm Password */}
                      <FormField id="confirmPassword" label={txt.confirmPassword} error={errors.confirmPassword}>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder={txt.confirmPasswordPlaceholder}
                            value={formData.confirmPassword}
                            onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                            className="pr-12 h-12 text-base bg-secondary/50 border-border/50 rounded-xl focus:ring-2 focus:ring-primary/30"
                            style={{ fontSize: '16px' }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-secondary/50 transition-colors"
                          >
                            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </FormField>

                      {/* DOB and Gender row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField id="birthday" label={txt.dob} error={errors.birthday}>
                          <ModernDatePicker
                            value={birthday}
                            onChange={setBirthday}
                            minAge={18}
                            maxAge={100}
                            placeholder="აირჩიეთ თარიღი"
                          />
                        </FormField>

                        <FormField id="gender" label={txt.gender} error={errors.gender}>
                          <Select
                            value={formData.gender}
                            onValueChange={(value) => handleInputChange('gender', value)}
                          >
                            <SelectTrigger className="h-12 text-base bg-secondary/50 border-border/50 rounded-xl">
                              <div className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-muted-foreground" />
                                <SelectValue placeholder={txt.gender} />
                              </div>
                            </SelectTrigger>
                            <SelectContent className="bg-card border-border rounded-xl">
                              <SelectItem value="male">{txt.male}</SelectItem>
                              <SelectItem value="female">{txt.female}</SelectItem>
                              <SelectItem value="other">{txt.other}</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormField>
                      </div>

                      {/* City */}
                      <FormField id="city" label={txt.city} error={errors.city}>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none z-10" />
                          <div className="[&>button]:pl-10 [&>button]:h-12 [&>button]:rounded-xl [&>button]:bg-secondary/50 [&>button]:border-border/50">
                            <CitySelect
                              value={formData.city}
                              onChange={(value) => handleInputChange('city', value)}
                            />
                          </div>
                        </div>
                      </FormField>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Remember me - Login only */}
                {isLogin && (
                  <label className="flex items-center gap-3 cursor-pointer group py-1">
                    <div 
                      className={cn(
                        "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200",
                        rememberMe 
                          ? 'bg-primary border-primary' 
                          : 'border-muted-foreground/40 group-hover:border-primary/60'
                      )}
                      onClick={() => setRememberMe(!rememberMe)}
                    >
                      {rememberMe && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
                    </div>
                    <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                      {txt.rememberMe}
                    </span>
                  </label>
                )}

                {/* Submit button */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all text-primary-foreground rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] mt-2"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      {isLogin ? txt.loggingIn : txt.registering}
                    </span>
                  ) : (
                    isLogin ? txt.loginBtn : txt.registerBtn
                  )}
                </Button>


                {/* Social login - Login only */}
                {isLogin && (
                  <div className="mt-6 pt-6 border-t border-border/50">
                    <p className="text-center text-sm text-muted-foreground mb-4">
                      ან შედით სოციალური ქსელით
                    </p>
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { icon: <svg viewBox="0 0 24 24" className="w-5 h-5"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>, name: 'Google' },
                        { icon: <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#1877F2]" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>, name: 'Facebook' },
                        { icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/></svg>, name: 'TikTok' },
                        { icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>, name: 'Apple' },
                      ].map((social, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className="flex items-center justify-center h-12 rounded-xl bg-secondary/50 hover:bg-secondary border border-border/50 transition-all duration-200 hover:scale-105 active:scale-95"
                          onClick={() => toast({ title: `${social.name} ავტორიზაცია მალე დაემატება` })}
                        >
                          {social.icon}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </form>
            </div>

            {/* TOP.GE Counter - Always visible */}
            <div className="mt-6"><TopGeCounter /></div>
          </div>

          {/* Footer */}
          <div className="shrink-0 text-center py-6 mt-auto">
            <p className="text-sm text-muted-foreground">ChatSev © 2026</p>
            <p className="text-xs text-muted-foreground mt-1">ყველა უფლება დაცულია</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPageRedesign;
