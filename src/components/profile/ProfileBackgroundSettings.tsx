import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  ArrowLeft, Palette, Image, Video, Sparkles, Check, 
  Upload, Trash2, Eye, EyeOff, Sliders 
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ProfileBackgroundSettingsProps {
  onBack: () => void;
}

const gradientPresets = [
  { id: 'sunset', colors: ['#ff6b6b', '#feca57'], name: 'მზის ჩასვლა' },
  { id: 'ocean', colors: ['#0abde3', '#10ac84'], name: 'ოკეანე' },
  { id: 'purple', colors: ['#a55eea', '#5f27cd'], name: 'იასამნისფერი' },
  { id: 'fire', colors: ['#ff9f43', '#ee5a24'], name: 'ცეცხლი' },
  { id: 'night', colors: ['#2c3e50', '#000000'], name: 'ღამე' },
  { id: 'mint', colors: ['#00b894', '#00cec9'], name: 'პიტნა' },
  { id: 'rose', colors: ['#fd79a8', '#e84393'], name: 'ვარდი' },
  { id: 'aurora', colors: ['#74b9ff', '#a29bfe'], name: 'აურორა' }
];

const animationPresets = [
  { id: 'particles', name: 'ნაწილაკები', icon: '✨' },
  { id: 'stars', name: 'ვარსკვლავები', icon: '⭐' },
  { id: 'bubbles', name: 'ბუშტები', icon: '🫧' },
  { id: 'confetti', name: 'კონფეტი', icon: '🎉' },
  { id: 'snow', name: 'თოვლი', icon: '❄️' },
  { id: 'hearts', name: 'გულები', icon: '💖' }
];

const solidColors = [
  '#1a1a2e', '#16213e', '#0f3460', '#e94560',
  '#533483', '#2c3e50', '#27ae60', '#e74c3c',
  '#3498db', '#9b59b6', '#1abc9c', '#f39c12'
];

const ProfileBackgroundSettings = ({ onBack }: ProfileBackgroundSettingsProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [backgroundType, setBackgroundType] = useState<'solid' | 'gradient' | 'image' | 'video' | 'animation'>('solid');
  const [selectedValue, setSelectedValue] = useState<string>('#1a1a2e');
  const [gradientColors, setGradientColors] = useState<string[]>(['#ff6b6b', '#feca57']);
  const [opacity, setOpacity] = useState(1);
  const [blur, setBlur] = useState(0);
  const [isEnabled, setIsEnabled] = useState(true);

  // Fetch current settings
  const { data: settings } = useQuery({
    queryKey: ['profile-background', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profile_backgrounds')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user
  });

  useEffect(() => {
    if (settings) {
      setBackgroundType(settings.background_type as any || 'solid');
      setSelectedValue(settings.background_value || '#1a1a2e');
      setGradientColors(settings.gradient_colors || ['#ff6b6b', '#feca57']);
      setOpacity(settings.opacity || 1);
      setBlur(settings.blur_amount || 0);
      setIsEnabled(settings.is_enabled ?? true);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('შედი ანგარიშზე');
      
      const { error } = await supabase
        .from('profile_backgrounds')
        .upsert({
          user_id: user.id,
          background_type: backgroundType,
          background_value: selectedValue,
          gradient_colors: gradientColors,
          animation_preset: backgroundType === 'animation' ? selectedValue : null,
          video_url: backgroundType === 'video' ? selectedValue : null,
          opacity,
          blur_amount: blur,
          is_enabled: isEnabled,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
        
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('პარამეტრები შენახულია!');
      queryClient.invalidateQueries({ queryKey: ['profile-background'] });
    },
    onError: (error) => {
      toast.error('შეცდომა: ' + error.message);
    }
  });

  const getPreviewStyle = () => {
    if (!isEnabled) return { background: 'transparent' };
    
    switch (backgroundType) {
      case 'solid':
        return { 
          background: selectedValue,
          opacity,
          filter: blur > 0 ? `blur(${blur}px)` : undefined
        };
      case 'gradient':
        return { 
          background: `linear-gradient(135deg, ${gradientColors[0]}, ${gradientColors[1]})`,
          opacity,
          filter: blur > 0 ? `blur(${blur}px)` : undefined
        };
      default:
        return { background: '#1a1a2e' };
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 hover:bg-secondary rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold flex items-center gap-2">
                <Palette className="w-5 h-5 text-purple-500" />
                პროფილის ფონი
              </h1>
              <p className="text-xs text-muted-foreground">ვიდეო და ანიმაციური ფონები</p>
            </div>
          </div>
          
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium"
          >
            {saveMutation.isPending ? '...' : 'შენახვა'}
          </button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Preview */}
        <div className="relative h-40 rounded-3xl overflow-hidden border border-border/50">
          <div 
            className="absolute inset-0 transition-all duration-300"
            style={getPreviewStyle()}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-white/70 text-sm font-medium bg-black/30 px-4 py-2 rounded-full">
              პროფილის ფონის პრევიუ
            </p>
          </div>
        </div>

        {/* Enable Toggle */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border/50">
          <div className="flex items-center gap-3">
            {isEnabled ? (
              <Eye className="w-5 h-5 text-primary" />
            ) : (
              <EyeOff className="w-5 h-5 text-muted-foreground" />
            )}
            <div>
              <p className="font-medium">ფონის ჩვენება</p>
              <p className="text-xs text-muted-foreground">ჩართე/გამორთე პროფილის ფონი</p>
            </div>
          </div>
          <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
        </div>

        {/* Background Type Selection */}
        <div className="space-y-3">
          <p className="font-medium">ფონის ტიპი</p>
          <div className="grid grid-cols-4 gap-2">
            {[
              { type: 'solid', icon: Palette, label: 'ფერი' },
              { type: 'gradient', icon: Sparkles, label: 'გრადიენტი' },
              { type: 'image', icon: Image, label: 'სურათი' },
              { type: 'animation', icon: Video, label: 'ანიმაცია' }
            ].map(({ type, icon: Icon, label }) => (
              <button
                key={type}
                onClick={() => setBackgroundType(type as any)}
                className={cn(
                  "p-3 rounded-xl flex flex-col items-center gap-1 transition-all",
                  backgroundType === type
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary hover:bg-secondary/80"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Solid Colors */}
        {backgroundType === 'solid' && (
          <div className="space-y-3">
            <p className="font-medium">აირჩიე ფერი</p>
            <div className="grid grid-cols-6 gap-2">
              {solidColors.map(color => (
                <button
                  key={color}
                  onClick={() => setSelectedValue(color)}
                  className={cn(
                    "w-full aspect-square rounded-xl transition-all",
                    selectedValue === color && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                  )}
                  style={{ background: color }}
                >
                  {selectedValue === color && (
                    <Check className="w-4 h-4 text-white mx-auto" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Gradient Presets */}
        {backgroundType === 'gradient' && (
          <div className="space-y-3">
            <p className="font-medium">აირჩიე გრადიენტი</p>
            <div className="grid grid-cols-4 gap-2">
              {gradientPresets.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => setGradientColors(preset.colors)}
                  className={cn(
                    "p-3 rounded-xl transition-all flex flex-col items-center gap-1",
                    JSON.stringify(gradientColors) === JSON.stringify(preset.colors) && 
                      "ring-2 ring-primary ring-offset-2 ring-offset-background"
                  )}
                  style={{ 
                    background: `linear-gradient(135deg, ${preset.colors[0]}, ${preset.colors[1]})`
                  }}
                >
                  <span className="text-white text-xs font-medium drop-shadow">{preset.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Animation Presets */}
        {backgroundType === 'animation' && (
          <div className="space-y-3">
            <p className="font-medium">აირჩიე ანიმაცია</p>
            <div className="grid grid-cols-3 gap-2">
              {animationPresets.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => setSelectedValue(preset.id)}
                  className={cn(
                    "p-4 rounded-xl transition-all flex flex-col items-center gap-2 bg-card border border-border/50",
                    selectedValue === preset.id && "border-primary bg-primary/10"
                  )}
                >
                  <span className="text-2xl">{preset.icon}</span>
                  <span className="text-sm">{preset.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Image Upload */}
        {backgroundType === 'image' && (
          <div className="space-y-3">
            <p className="font-medium">ატვირთე სურათი</p>
            <div className="p-8 rounded-2xl border-2 border-dashed border-border/50 text-center">
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">დააჭირე ასატვირთად</p>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG, GIF - მაქს. 5MB</p>
            </div>
          </div>
        )}

        {/* Opacity & Blur Controls */}
        {isEnabled && (
          <div className="space-y-4 p-4 rounded-2xl bg-card border border-border/50">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Sliders className="w-4 h-4" />
              <span className="text-sm font-medium">დამატებითი პარამეტრები</span>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>გამჭვირვალობა</span>
                <span>{Math.round(opacity * 100)}%</span>
              </div>
              <Slider
                value={[opacity]}
                onValueChange={([v]) => setOpacity(v)}
                min={0.1}
                max={1}
                step={0.1}
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>ბუნდოვანება</span>
                <span>{blur}px</span>
              </div>
              <Slider
                value={[blur]}
                onValueChange={([v]) => setBlur(v)}
                min={0}
                max={20}
                step={1}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileBackgroundSettings;
