/**
 * ULTRA AVATAR SYSTEM - Settings Panel
 * User interface for avatar customization
 */

import { useState, useCallback, useMemo } from 'react';
import { 
  Settings, 
  Sparkles, 
  Zap, 
  Video, 
  Palette, 
  Activity,
  Eye,
  Moon,
  Sun,
  Crown,
  Check,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
} from "@/components/ui/select";
import { 
  AvatarMode, 
  EffectType, 
  GlowColor, 
  PerformanceLevel,
  AvatarSettings,
  DEFAULT_AVATAR_SETTINGS,
  GLOW_COLORS,
} from './types';
import UltraAvatar from './UltraAvatar';

interface AvatarSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatar?: string | null;
  username?: string;
  gender?: string | null;
  isPremium?: boolean;
  settings?: AvatarSettings;
  onSettingsChange?: (settings: AvatarSettings) => void;
}

const AVATAR_MODES: { value: AvatarMode; label: string; icon: React.ReactNode; premium?: boolean }[] = [
  { value: 'static', label: 'სტატიკური', icon: <Eye className="w-4 h-4" /> },
  { value: 'animated-image', label: 'ანიმაცია', icon: <Sparkles className="w-4 h-4" /> },
  { value: 'video', label: 'ვიდეო', icon: <Video className="w-4 h-4" />, premium: true },
  { value: 'glow-effect', label: 'გლოუ ეფექტი', icon: <Sun className="w-4 h-4" /> },
  { value: 'neon-frame', label: 'ნეონ ჩარჩო', icon: <Zap className="w-4 h-4" />, premium: true },
  { value: 'pulse', label: 'პულსი', icon: <Activity className="w-4 h-4" /> },
  { value: 'floating', label: 'მცურავი', icon: <Moon className="w-4 h-4" /> },
  { value: 'hybrid', label: 'ჰიბრიდი', icon: <Crown className="w-4 h-4" />, premium: true },
];

const EFFECT_TYPES: { value: EffectType; label: string; premium?: boolean }[] = [
  { value: 'neon-glow', label: 'ნეონ გლოუ' },
  { value: 'pulse', label: 'პულსი' },
  { value: 'breathing', label: 'სუნთქვა' },
  { value: 'gradient-border', label: 'გრადიენტი', premium: true },
  { value: 'soft-aura', label: 'აურა' },
  { value: 'rotating-light', label: 'მბრუნავი', premium: true },
  { value: 'fire', label: 'ცეცხლი', premium: true },
  { value: 'energy', label: 'ენერგია', premium: true },
  { value: 'shine', label: 'ბზინვარება' },
  { value: 'rainbow', label: 'ცისარტყელა', premium: true },
];

const GLOW_COLOR_OPTIONS: { value: GlowColor; label: string; color: string }[] = [
  { value: 'blue', label: 'ლურჯი', color: GLOW_COLORS.blue },
  { value: 'green', label: 'მწვანე', color: GLOW_COLORS.green },
  { value: 'purple', label: 'იასამნისფერი', color: GLOW_COLORS.purple },
  { value: 'cyan', label: 'ციანი', color: GLOW_COLORS.cyan },
  { value: 'pink', label: 'ვარდისფერი', color: GLOW_COLORS.pink },
  { value: 'orange', label: 'ნარინჯისფერი', color: GLOW_COLORS.orange },
  { value: 'red', label: 'წითელი', color: GLOW_COLORS.red },
  { value: 'gold', label: 'ოქროსფერი', color: GLOW_COLORS.gold },
];

/**
 * Avatar Settings Panel Component
 */
const AvatarSettingsPanel = ({
  isOpen,
  onClose,
  currentAvatar,
  username,
  gender,
  isPremium = false,
  settings = DEFAULT_AVATAR_SETTINGS,
  onSettingsChange,
}: AvatarSettingsPanelProps) => {
  const [localSettings, setLocalSettings] = useState<AvatarSettings>(settings);

  const updateSetting = useCallback(<K extends keyof AvatarSettings>(
    key: K,
    value: AvatarSettings[K]
  ) => {
    setLocalSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      onSettingsChange?.(newSettings);
      return newSettings;
    });
  }, [onSettingsChange]);

  // Check if feature is available
  const isFeatureAvailable = useCallback((premium?: boolean) => {
    return !premium || isPremium;
  }, [isPremium]);

  // Preview avatar with current settings
  const previewAvatar = useMemo(() => (
    <div className="flex justify-center py-6">
      <div className="relative">
        <UltraAvatar
          src={currentAvatar}
          username={username}
          gender={gender}
          size="3xl"
          mode={localSettings.mode}
          effectType={localSettings.effectType}
          glowColor={localSettings.glowColor}
          enableAnimation={localSettings.animationEnabled}
          enableEffects={true}
          enableMicroMotion={localSettings.microMotionEnabled}
          enableFloating={localSettings.floatingEnabled}
          enableEmotionAvatar={localSettings.emotionAvatarEnabled}
          isOnline={true}
          performanceLevel={localSettings.performanceMode}
          isPremium={isPremium}
          showVipBadge={isPremium}
        />
        {/* Preview label */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-xs text-muted-foreground">
          პრევიუ
        </div>
      </div>
    </div>
  ), [currentAvatar, username, gender, localSettings, isPremium]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-none">
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            ავატარის პარამეტრები
          </DialogTitle>
        </DialogHeader>

        {/* Preview */}
        {previewAvatar}

        {/* Settings tabs */}
        <Tabs defaultValue="mode" className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="mode">რეჟიმი</TabsTrigger>
            <TabsTrigger value="effects">ეფექტები</TabsTrigger>
            <TabsTrigger value="performance">სისტემა</TabsTrigger>
          </TabsList>

          <div className="overflow-y-auto max-h-[300px] mt-4 space-y-4">
            {/* Mode Tab */}
            <TabsContent value="mode" className="space-y-4">
              <div className="space-y-3">
                <Label className="text-sm font-medium">ავატარის რეჟიმი</Label>
                <div className="grid grid-cols-2 gap-2">
                  {AVATAR_MODES.map(({ value, label, icon, premium }) => (
                    <Button
                      key={value}
                      variant={localSettings.mode === value ? 'default' : 'outline'}
                      size="sm"
                      className={cn(
                        'justify-start gap-2',
                        !isFeatureAvailable(premium) && 'opacity-50'
                      )}
                      onClick={() => isFeatureAvailable(premium) && updateSetting('mode', value)}
                      disabled={!isFeatureAvailable(premium)}
                    >
                      {icon}
                      {label}
                      {premium && !isPremium && (
                        <Crown className="w-3 h-3 ml-auto text-yellow-500" />
                      )}
                      {localSettings.mode === value && (
                        <Check className="w-3 h-3 ml-auto" />
                      )}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Animation toggle */}
              <div className="flex items-center justify-between">
                <Label htmlFor="animation" className="text-sm">ანიმაცია ჩართული</Label>
                <Switch
                  id="animation"
                  checked={localSettings.animationEnabled}
                  onCheckedChange={(checked) => updateSetting('animationEnabled', checked)}
                />
              </div>

              {/* Floating toggle */}
              <div className="flex items-center justify-between">
                <Label htmlFor="floating" className="text-sm">მცურავი ეფექტი</Label>
                <Switch
                  id="floating"
                  checked={localSettings.floatingEnabled}
                  onCheckedChange={(checked) => updateSetting('floatingEnabled', checked)}
                />
              </div>

              {/* Micro motion toggle */}
              <div className="flex items-center justify-between">
                <Label htmlFor="micromotion" className="text-sm">AI მიკრო-მოძრაობა</Label>
                <Switch
                  id="micromotion"
                  checked={localSettings.microMotionEnabled}
                  onCheckedChange={(checked) => updateSetting('microMotionEnabled', checked)}
                />
              </div>
            </TabsContent>

            {/* Effects Tab */}
            <TabsContent value="effects" className="space-y-4">
              {/* Effect type selector */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">ეფექტის ტიპი</Label>
                <Select
                  value={localSettings.effectType || 'none'}
                  onValueChange={(value) => updateSetting('effectType', value === 'none' ? null : value as EffectType)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="აირჩიეთ ეფექტი" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">არცერთი</SelectItem>
                    {EFFECT_TYPES.map(({ value, label, premium }) => (
                      <SelectItem 
                        key={value} 
                        value={value}
                        disabled={!isFeatureAvailable(premium)}
                      >
                        {label}
                        {premium && !isPremium && ' 👑'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Glow color */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">გლოუ ფერი</Label>
                <div className="grid grid-cols-4 gap-2">
                  {GLOW_COLOR_OPTIONS.map(({ value, label, color }) => (
                    <button
                      key={value}
                      onClick={() => updateSetting('glowColor', value)}
                      className={cn(
                        'w-10 h-10 rounded-full border-2 transition-all ring-offset-background',
                        localSettings.glowColor === value 
                          ? 'border-foreground scale-110 ring-2 ring-ring' 
                          : 'border-muted'
                      )}
                      style={{ backgroundColor: color }}
                      title={label}
                    />
                  ))}
                </div>
              </div>

              {/* Emotion avatar toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="emotion" className="text-sm">ემოცია ავატარი</Label>
                  <p className="text-xs text-muted-foreground">
                    რეაქცია აქტივობაზე
                  </p>
                </div>
                <Switch
                  id="emotion"
                  checked={localSettings.emotionAvatarEnabled}
                  onCheckedChange={(checked) => updateSetting('emotionAvatarEnabled', checked)}
                />
              </div>

              {/* Intensity slider */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">ინტენსივობა</Label>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-muted-foreground">დაბალი</span>
                  <Slider
                    value={[localSettings.intensity === 'low' ? 0 : localSettings.intensity === 'medium' ? 50 : 100]}
                    max={100}
                    step={50}
                    onValueChange={([value]) => {
                      const intensity = value === 0 ? 'low' : value === 50 ? 'medium' : 'high';
                      updateSetting('intensity', intensity);
                    }}
                    className="flex-1"
                  />
                  <span className="text-xs text-muted-foreground">მაღალი</span>
                </div>
              </div>
            </TabsContent>

            {/* Performance Tab */}
            <TabsContent value="performance" className="space-y-4">
              {/* Performance mode */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">წარმადობის რეჟიმი</Label>
                <Select
                  value={localSettings.performanceMode}
                  onValueChange={(value) => updateSetting('performanceMode', value as PerformanceLevel)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">ავტომატური</SelectItem>
                    <SelectItem value="high">მაღალი (სრული ანიმაცია)</SelectItem>
                    <SelectItem value="medium">საშუალო (შემცირებული)</SelectItem>
                    <SelectItem value="low">დაბალი (სტატიკური)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Auto optimize toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="autoopt" className="text-sm">ავტო ოპტიმიზაცია</Label>
                  <p className="text-xs text-muted-foreground">
                    ბატარეის/მეხსიერების მონიტორინგი
                  </p>
                </div>
                <Switch
                  id="autoopt"
                  checked={localSettings.autoOptimize}
                  onCheckedChange={(checked) => updateSetting('autoOptimize', checked)}
                />
              </div>

              {/* Performance info */}
              <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground space-y-1">
                <p>• ავტო რეჟიმი ადაპტირდება მოწყობილობის შესაძლებლობებზე</p>
                <p>• დაბალი ბატარეის დროს ანიმაციები გამოირთვება</p>
                <p>• ტაბის არააქტიურობისას ანიმაციები პაუზდება</p>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        {/* Premium upsell */}
        {!isPremium && (
          <div className="mt-4 p-3 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">Premium ფუნქციები</p>
                <p className="text-xs text-muted-foreground">
                  გახსენი ყველა ეფექტი და ანიმაცია
                </p>
              </div>
              <Button size="sm" variant="outline" className="text-primary">
                გაიგე მეტი
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AvatarSettingsPanel;
