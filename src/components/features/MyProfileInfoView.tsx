import { useState, useEffect } from 'react';
import { ArrowLeft, User, Check, Loader2, Lock, BarChart3, Star, MapPin, Cake, Calendar, Clock, Camera, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import CitySelect from '@/components/shared/CitySelect';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { ka } from 'date-fns/locale';
import { createPendingApproval } from '@/hooks/useModerationQueue';

interface MyProfileInfoViewProps {
  onBack: () => void;
}

const MyProfileInfoView = ({ onBack }: MyProfileInfoViewProps) => {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [postsCount, setPostsCount] = useState(0);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Form state
  const [username, setUsername] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('other');
  const [birthday, setBirthday] = useState('');
  const [city, setCity] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setAge(profile.age?.toString() || '');
      setGender(profile.gender || 'other');
      setBirthday((profile as any)?.birthday || '');
      setCity((profile as any)?.city || '');
      setAvatarUrl(profile.avatar_url);
    }
    fetchUserData();
  }, [profile]);

  const fetchUserData = async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      // Fetch posts count
      const { count } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      setPostsCount(count || 0);

      // Fetch user role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      
      setUserRole(roleData?.role || null);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'ფაილი ძალიან დიდია (მაქს. 10MB)', variant: 'destructive' });
      return;
    }

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('chat-images')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Create pending approval for avatar
      try {
        await createPendingApproval({
          type: 'avatar',
          userId: user.id,
          contentData: { avatar_url: urlData.publicUrl }
        });
      } catch (err) {
        console.error('Error creating pending approval:', err);
      }

      setAvatarUrl(urlData.publicUrl);
      toast({ title: 'ავატარი განახლდა!' });
      refreshProfile();
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id || !username.trim()) {
      toast({ title: 'სახელი აუცილებელია', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: username.trim(),
          age: parseInt(age) || 18,
          gender,
          birthday: birthday || null,
          city: city || null,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({ title: 'პროფილი შენახულია!' });
      refreshProfile();
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({ title: 'შეცდომა პროფილის შენახვისას', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const getRoleLabel = (role: string | null) => {
    switch (role) {
      case 'super_admin': return 'სუპერ ადმინი';
      case 'admin': return 'ადმინისტრატორი';
      case 'moderator': return 'მოდერატორი';
      default: return 'მომხმარებელი';
    }
  };

  const getRoleBadgeColor = (role: string | null) => {
    switch (role) {
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

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'არ არის მითითებული';
    try {
      return format(new Date(dateString), 'dd MMMM yyyy, HH:mm', { locale: ka });
    } catch {
      return 'არ არის მითითებული';
    }
  };

  const rank = getRank(postsCount);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold">პროფილის ინფორმაცია</h1>
          </div>
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
      </div>

      <div className="p-4 space-y-6 max-w-2xl mx-auto">
        {/* Avatar Section */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Avatar className="w-24 h-24 border-4 border-primary/20">
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback className="text-2xl bg-secondary">
                  {username?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <label className="absolute bottom-0 right-0 p-2 bg-primary rounded-full cursor-pointer hover:bg-primary/90 transition-colors">
                {uploadingAvatar ? (
                  <Loader2 className="w-4 h-4 text-primary-foreground animate-spin" />
                ) : (
                  <Camera className="w-4 h-4 text-primary-foreground" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={uploadingAvatar}
                />
              </label>
            </div>
            <p className="text-sm text-muted-foreground">დააჭირეთ ავატარის შესაცვლელად</p>
          </div>
        </div>

        {/* Status Display */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 bg-primary/5 border-b border-border">
            <h2 className="font-semibold flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              სტატუსი და რანგი
            </h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-3">
              <Lock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">სტატუსი:</span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(userRole)}`}>
                {getRoleLabel(userRole)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">პოსტები:</span>
              <span className="font-medium">{postsCount}</span>
            </div>
            <div className="flex items-center gap-3">
              <Star className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">რანგი:</span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${rank.bg} ${rank.color}`}>
                {rank.emoji} {rank.name}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">რეგისტრაცია:</span>
              <span className="text-sm">{formatDateTime(profile?.created_at ?? null)}</span>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">ბოლო ვიზიტი:</span>
              <span className="text-sm">{formatDateTime(profile?.last_seen ?? null)}</span>
            </div>
          </div>
        </div>

        {/* Editable Fields */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 bg-primary/5 border-b border-border">
            <h2 className="font-semibold flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              პერსონალური ინფორმაცია
            </h2>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">სახელი</label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="მომხმარებლის სახელი"
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">ასაკი</label>
              <Input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="ასაკი"
                min="13"
                max="120"
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">სქესი</label>
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
              <label className="text-sm text-muted-foreground mb-1.5 block">დაბადების თარიღი</label>
              <Input
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">ქალაქი</label>
              <CitySelect
                value={city}
                onChange={setCity}
                className="h-10"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyProfileInfoView;
