import { useState, useEffect } from 'react';
import { MapPin, Calendar as CalendarIcon, Clock, Heart, Loader2, Save, Shield, Cake } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import ModernDatePicker from '@/components/auth/ModernDatePicker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInYears } from 'date-fns';
import { ka } from 'date-fns/locale';

interface PersonalInfoTabProps {
  userId: string;
  isOwnProfile?: boolean;
}

const RELATIONSHIP_OPTIONS = [
  { value: 'single', label: 'სინგლი' },
  { value: 'in_relationship', label: 'ურთიერთობაშია' },
  { value: 'engaged', label: 'დანიშნულია' },
  { value: 'married', label: 'დაქორწინებულია' },
  { value: 'complicated', label: 'რთულია' },
  { value: 'prefer_not_say', label: 'არ სურს თქმა' },
];

const PRIVACY_OPTIONS = [
  { value: 'everyone', label: 'ყველას' },
  { value: 'friends', label: 'მხოლოდ მეგობრებს' },
  { value: 'nobody', label: 'არავის' },
];

const PersonalInfoTab = ({ userId, isOwnProfile = true }: PersonalInfoTabProps) => {
  const { isSuperAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [city, setCity] = useState('');
  const [birthday, setBirthday] = useState<Date | undefined>(undefined);
  
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [registeredAt, setRegisteredAt] = useState<string | null>(null);
  const [relationshipStatus, setRelationshipStatus] = useState('prefer_not_say');
  const [privacyLevel, setPrivacyLevel] = useState('friends');
  const { toast } = useToast();
  
  // Can edit: own profile OR super admin
  const canEdit = isOwnProfile || isSuperAdmin;

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    try {
      // Fetch profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('city, last_seen, created_at, birthday')
        .eq('user_id', userId)
        .single();

      if (profileError) throw profileError;

      setCity(profile?.city || '');
      setLastSeen(profile?.last_seen || null);
      setRegisteredAt(profile?.created_at || null);
      if (profile?.birthday) {
        setBirthday(new Date(profile.birthday + 'T00:00:00'));
      }

      // Fetch relationship status
      const { data: relationship, error: relError } = await supabase
        .from('relationship_statuses')
        .select('status, privacy_level')
        .eq('user_id', userId)
        .maybeSingle();

      if (!relError && relationship) {
        setRelationshipStatus(relationship.status || 'prefer_not_say');
        setPrivacyLevel(relationship.privacy_level || 'friends');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update city and birthday in profile
      const age = birthday ? differenceInYears(new Date(), birthday) : null;
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          city,
          birthday: birthday ? format(birthday, 'yyyy-MM-dd') : null,
          age,
        })
        .eq('user_id', userId);

      if (profileError) throw profileError;

      // Check if relationship status exists
      const { data: existingRel } = await supabase
        .from('relationship_statuses')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingRel) {
        // Update existing
        const { error: relError } = await supabase
          .from('relationship_statuses')
          .update({
            status: relationshipStatus as any,
            privacy_level: privacyLevel as any,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        if (relError) throw relError;
      } else {
        // Insert new
        const { error: relError } = await supabase
          .from('relationship_statuses')
          .insert({
            user_id: userId,
            status: relationshipStatus as any,
            privacy_level: privacyLevel as any,
          });

        if (relError) throw relError;
      }

      toast({ title: 'ინფორმაცია შეინახა!' });
    } catch (error) {
      console.error('Error saving:', error);
      toast({ title: 'შენახვა ვერ მოხერხდა', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return format(new Date(dateStr), 'd MMMM yyyy, HH:mm', { locale: ka });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const getRelationshipLabel = (value: string) => {
    return RELATIONSHIP_OPTIONS.find(opt => opt.value === value)?.label || value;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h3 className="font-semibold">პირადი ინფორმაცია</h3>
        {!isOwnProfile && isSuperAdmin && (
          <span className="flex items-center gap-1 text-xs bg-amber-500/20 text-amber-500 px-2 py-1 rounded-full">
            <Shield className="w-3 h-3" />
          </span>
        )}
      </div>

      {/* City */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          ქალაქი
        </Label>
        {canEdit ? (
          <Input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="თბილისი"
          />
        ) : (
          <div className="p-3 rounded-lg bg-muted text-sm">
            {city || '-'}
          </div>
        )}
      </div>

      {/* Birthday / Age */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Cake className="w-4 h-4" />
          დაბადების თარიღი
          {birthday && (
            <span className="text-muted-foreground font-normal">
              ({differenceInYears(new Date(), birthday)} წლის)
            </span>
          )}
        </Label>
        {canEdit ? (
          <ModernDatePicker
            value={birthday}
            onChange={setBirthday}
            minAge={18}
            maxAge={100}
            placeholder="აირჩიეთ თარიღი"
          />
        ) : (
          <div className="p-3 rounded-lg bg-muted text-sm">
            {birthday ? format(birthday, 'd MMMM yyyy', { locale: ka }) : '-'}
          </div>
        )}
      </div>

      {/* Last Visit - Read only */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-muted-foreground">
          <Clock className="w-4 h-4" />
          ბოლო ვიზიტი
        </Label>
        <div className="p-3 rounded-lg bg-muted text-sm">
          {formatDate(lastSeen)}
        </div>
      </div>

      {/* Registration Date - Read only */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-muted-foreground">
          <CalendarIcon className="w-4 h-4" />
          რეგისტრაციის თარიღი
        </Label>
        <div className="p-3 rounded-lg bg-muted text-sm">
          {formatDate(registeredAt)}
        </div>
      </div>

      {/* Relationship Status */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Heart className="w-4 h-4 text-rose-500" />
          ურთიერთობის სტატუსი
        </Label>
        {canEdit ? (
          <Select value={relationshipStatus} onValueChange={setRelationshipStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RELATIONSHIP_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="p-3 rounded-lg bg-muted text-sm">
            {getRelationshipLabel(relationshipStatus)}
          </div>
        )}
      </div>

      {/* Relationship Privacy - only for editable */}
      {canEdit && (
        <div className="space-y-2">
          <Label className="text-muted-foreground text-sm">
            ვის აჩვენოს ურთიერთობის სტატუსი?
          </Label>
          <Select value={privacyLevel} onValueChange={setPrivacyLevel}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIVACY_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Save Button - only for editable */}
      {canEdit && (
        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          შენახვა
        </Button>
      )}
    </div>
  );
};

export default PersonalInfoTab;
