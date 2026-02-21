import { useState, useEffect } from 'react';
import { Palette, Type, Sparkles, Square, CircleDot, Save, RotateCcw, X, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import StyledUsername from './StyledUsername';

interface UsernameStyle {
  text_color: string;
  gradient_start: string | null;
  gradient_end: string | null;
  use_gradient: boolean;
  font_weight: string;
  font_style: string;
  text_decoration: string;
  text_shadow: string | null;
  glow_color: string | null;
  glow_intensity: number;
  background_color: string | null;
  border_color: string | null;
  border_width: number;
  border_radius: number;
  animation: string;
  prefix_emoji: string | null;
  suffix_emoji: string | null;
  font_size: number;
  font_family: string;
}

const fontOptions = [
  { value: 'default', label: 'ნაგულისხმევი', family: 'inherit' },
  { value: 'roboto', label: 'Roboto', family: '"Roboto", sans-serif' },
  { value: 'open-sans', label: 'Open Sans', family: '"Open Sans", sans-serif' },
  { value: 'lato', label: 'Lato', family: '"Lato", sans-serif' },
  { value: 'montserrat', label: 'Montserrat', family: '"Montserrat", sans-serif' },
  { value: 'poppins', label: 'Poppins', family: '"Poppins", sans-serif' },
  { value: 'playfair', label: 'Playfair Display', family: '"Playfair Display", serif' },
  { value: 'oswald', label: 'Oswald', family: '"Oswald", sans-serif' },
  { value: 'raleway', label: 'Raleway', family: '"Raleway", sans-serif' },
  { value: 'georgia', label: 'Georgia', family: 'Georgia, serif' },
  { value: 'arial', label: 'Arial', family: 'Arial, sans-serif' },
  { value: 'times', label: 'Times New Roman', family: '"Times New Roman", serif' },
];

const defaultStyle: UsernameStyle = {
  text_color: '#ffffff',
  gradient_start: '#ff6b6b',
  gradient_end: '#4ecdc4',
  use_gradient: false,
  font_weight: 'normal',
  font_style: 'normal',
  text_decoration: 'none',
  text_shadow: null,
  glow_color: '#00ff00',
  glow_intensity: 0,
  background_color: null,
  border_color: null,
  border_width: 0,
  border_radius: 4,
  animation: 'none',
  prefix_emoji: null,
  suffix_emoji: null,
  font_size: 16,
  font_family: 'default',
};

const colorPresets = [
  '#ff6b6b', '#ff8e53', '#feca57', '#48dbfb', '#ff9ff3', 
  '#54a0ff', '#5f27cd', '#00d2d3', '#1dd1a1', '#ff6b6b',
  '#ffffff', '#e0e0e0', '#a0a0a0', '#606060', '#000000',
  '#e74c3c', '#9b59b6', '#3498db', '#1abc9c', '#f39c12',
];

const gradientPresets = [
  { start: '#ff6b6b', end: '#feca57' },
  { start: '#a18cd1', end: '#fbc2eb' },
  { start: '#667eea', end: '#764ba2' },
  { start: '#f093fb', end: '#f5576c' },
  { start: '#4facfe', end: '#00f2fe' },
  { start: '#43e97b', end: '#38f9d7' },
  { start: '#fa709a', end: '#fee140' },
  { start: '#30cfd0', end: '#330867' },
  { start: '#ffd700', end: '#ff8c00' },
  { start: '#ff0844', end: '#ffb199' },
];

const emojiOptions = [
  '👑', '⭐', '💎', '🔥', '💫', '✨', '🌟', '💖', '🦋', '🌈',
  '🎮', '🎵', '🎯', '⚡', '💀', '🐉', '🦄', '🌸', '❄️', '🍀',
  '🏆', '💪', '🎭', '🌙', '☀️', '🔮', '💜', '💙', '💚', '❤️',
];

const animationOptions = [
  { value: 'none', label: 'არცერთი' },
  { value: 'pulse', label: 'პულსაცია' },
  { value: 'bounce', label: 'ხტომა' },
  { value: 'glow-pulse', label: 'მბზინავი' },
  { value: 'rainbow', label: 'ცისარტყელა' },
];

interface UsernameStyleEditorProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserId?: string; // Allow editing another user's style (for super admins)
}

const UsernameStyleEditor = ({ isOpen, onClose, targetUserId }: UsernameStyleEditorProps) => {
  const { user, profile, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const [style, setStyle] = useState<UsernameStyle>(defaultStyle);
  const [saving, setSaving] = useState(false);
  const [hasExisting, setHasExisting] = useState(false);
  const [targetUsername, setTargetUsername] = useState<string>('');
  
  // Determine effective user ID (own or target)
  const effectiveUserId = targetUserId || user?.id;
  const isEditingOther = targetUserId && targetUserId !== user?.id;

  useEffect(() => {
    if (isOpen && effectiveUserId) {
      fetchExistingStyle();
      fetchTargetUsername();
    }
  }, [isOpen, effectiveUserId]);

  const fetchTargetUsername = async () => {
    if (!effectiveUserId) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('username')
      .eq('user_id', effectiveUserId)
      .single();
    
    if (data) {
      setTargetUsername(data.username);
    }
  };

  const fetchExistingStyle = async () => {
    if (!effectiveUserId) return;
    
    const { data } = await supabase
      .from('username_styles')
      .select('*')
      .eq('user_id', effectiveUserId)
      .maybeSingle();
    
    if (data) {
      setStyle({
        text_color: data.text_color || '#ffffff',
        gradient_start: data.gradient_start,
        gradient_end: data.gradient_end,
        use_gradient: data.use_gradient || false,
        font_weight: data.font_weight || 'normal',
        font_style: data.font_style || 'normal',
        text_decoration: data.text_decoration || 'none',
        text_shadow: data.text_shadow,
        glow_color: data.glow_color,
        glow_intensity: data.glow_intensity || 0,
        background_color: data.background_color,
        border_color: data.border_color,
        border_width: data.border_width || 0,
        border_radius: data.border_radius || 4,
        animation: data.animation || 'none',
        prefix_emoji: data.prefix_emoji,
        suffix_emoji: data.suffix_emoji,
        font_size: data.font_size || 16,
        font_family: data.font_family || 'default',
      });
      setHasExisting(true);
    } else {
      setStyle(defaultStyle);
      setHasExisting(false);
    }
  };

  const handleSave = async () => {
    if (!effectiveUserId) return;
    
    // Check permission
    if (isEditingOther && !isSuperAdmin) {
      toast({ title: 'წვდომა აკრძალულია', variant: 'destructive' });
      return;
    }
    
    setSaving(true);

    try {
      const styleData = {
        user_id: effectiveUserId,
        ...style,
      };

      if (hasExisting) {
        await supabase
          .from('username_styles')
          .update(styleData)
          .eq('user_id', effectiveUserId);
      } else {
        await supabase
          .from('username_styles')
          .insert(styleData);
      }

      toast({ title: 'სტილი შენახულია!' });
      onClose();
    } catch (error) {
      console.error('Error saving style:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setStyle(defaultStyle);
  };

  const updateStyle = (key: keyof UsernameStyle, value: any) => {
    setStyle(prev => ({ ...prev, [key]: value }));
  };

  const displayUsername = targetUsername || profile?.username || 'Username';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            მეტსახელის გაფორმება
            {isEditingOther && isSuperAdmin && (
              <span className="flex items-center gap-1 text-xs bg-amber-500/20 text-amber-500 px-2 py-1 rounded-full ml-2">
                <Shield className="w-3 h-3" />
                {targetUsername}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Preview */}
        <div className="bg-secondary/50 rounded-lg p-4 text-center">
          <p className="text-xs text-muted-foreground mb-2">გადახედვა:</p>
          <div className="text-xl">
            <StyledUsername
              userId={effectiveUserId || ''}
              username={displayUsername}
              style={style}
            />
          </div>
        </div>

        <Tabs defaultValue="color" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid grid-cols-4 mb-2">
            <TabsTrigger value="color" className="text-xs">
              <Palette className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="font" className="text-xs">
              <Type className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="effects" className="text-xs">
              <Sparkles className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="extras" className="text-xs">
              <CircleDot className="w-4 h-4" />
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto px-1">
            {/* Color Tab */}
            <TabsContent value="color" className="space-y-4 mt-0">
              <div className="flex items-center justify-between">
                <Label>გრადიენტის გამოყენება</Label>
                <Switch
                  checked={style.use_gradient}
                  onCheckedChange={(checked) => updateStyle('use_gradient', checked)}
                />
              </div>

              {!style.use_gradient ? (
                <div className="space-y-2">
                  <Label>ტექსტის ფერი</Label>
                  <div className="flex gap-2 flex-wrap">
                    {colorPresets.map((color, idx) => (
                      <button
                        key={`${color}-${idx}`}
                        onClick={() => updateStyle('text_color', color)}
                        className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                          style.text_color === color ? 'border-primary scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <Input
                    type="color"
                    value={style.text_color}
                    onChange={(e) => updateStyle('text_color', e.target.value)}
                    className="h-10 w-full"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <Label>გრადიენტის პრესეტები</Label>
                  <div className="flex gap-2 flex-wrap">
                    {gradientPresets.map((preset, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          updateStyle('gradient_start', preset.start);
                          updateStyle('gradient_end', preset.end);
                        }}
                        className={`w-12 h-8 rounded border-2 transition-transform hover:scale-110 ${
                          style.gradient_start === preset.start && style.gradient_end === preset.end
                            ? 'border-primary scale-110'
                            : 'border-transparent'
                        }`}
                        style={{ background: `linear-gradient(90deg, ${preset.start}, ${preset.end})` }}
                      />
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">საწყისი ფერი</Label>
                      <Input
                        type="color"
                        value={style.gradient_start || '#ff6b6b'}
                        onChange={(e) => updateStyle('gradient_start', e.target.value)}
                        className="h-10"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">საბოლოო ფერი</Label>
                      <Input
                        type="color"
                        value={style.gradient_end || '#4ecdc4'}
                        onChange={(e) => updateStyle('gradient_end', e.target.value)}
                        className="h-10"
                      />
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Font Tab */}
            <TabsContent value="font" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label>შრიფტის ტიპი</Label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {fontOptions.map((font) => (
                    <button
                      key={font.value}
                      onClick={() => updateStyle('font_family', font.value)}
                      className={`py-2 px-3 rounded-lg border transition-colors text-sm ${
                        style.font_family === font.value
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:bg-secondary'
                      }`}
                      style={{ fontFamily: font.family }}
                    >
                      {font.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>ზომა ({style.font_size}px)</Label>
                <Slider
                  value={[style.font_size]}
                  onValueChange={([val]) => updateStyle('font_size', val)}
                  min={10}
                  max={32}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <Label>შრიფტის სისქე</Label>
                <div className="flex gap-2">
                  {['normal', 'bold', '900'].map((weight) => (
                    <button
                      key={weight}
                      onClick={() => updateStyle('font_weight', weight)}
                      className={`flex-1 py-2 px-3 rounded-lg border transition-colors ${
                        style.font_weight === weight
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:bg-secondary'
                      }`}
                      style={{ fontWeight: weight as any }}
                    >
                      {weight === 'normal' ? 'ჩვეულ.' : weight === 'bold' ? 'მსხვილი' : 'ძალიან'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>დახრილობა</Label>
                <div className="flex gap-2">
                  {['normal', 'italic'].map((fontStyle) => (
                    <button
                      key={fontStyle}
                      onClick={() => updateStyle('font_style', fontStyle)}
                      className={`flex-1 py-2 px-3 rounded-lg border transition-colors ${
                        style.font_style === fontStyle
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:bg-secondary'
                      }`}
                      style={{ fontStyle: fontStyle as any }}
                    >
                      {fontStyle === 'normal' ? 'ჩვეულებრივი' : 'დახრილი'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>ხაზგასმა</Label>
                <div className="flex gap-2">
                  {['none', 'underline', 'line-through'].map((decoration) => (
                    <button
                      key={decoration}
                      onClick={() => updateStyle('text_decoration', decoration)}
                      className={`flex-1 py-2 px-3 rounded-lg border transition-colors ${
                        style.text_decoration === decoration
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:bg-secondary'
                      }`}
                      style={{ textDecoration: decoration }}
                    >
                      {decoration === 'none' ? 'არა' : decoration === 'underline' ? 'ქვედა' : 'გადახაზ.'}
                    </button>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Effects Tab */}
            <TabsContent value="effects" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label>ბზინვის ფერი</Label>
                <div className="flex gap-2 flex-wrap mb-2">
                  {colorPresets.slice(0, 10).map((color, idx) => (
                    <button
                      key={`glow-${color}-${idx}`}
                      onClick={() => updateStyle('glow_color', color)}
                      className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                        style.glow_color === color ? 'border-primary' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
                    />
                  ))}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">ინტენსივობა ({style.glow_intensity})</Label>
                  <Slider
                    value={[style.glow_intensity]}
                    onValueChange={([val]) => updateStyle('glow_intensity', val)}
                    max={20}
                    step={1}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>ანიმაცია</Label>
                <div className="grid grid-cols-2 gap-2">
                  {animationOptions.map((anim) => (
                    <button
                      key={anim.value}
                      onClick={() => updateStyle('animation', anim.value)}
                      className={`py-2 px-3 rounded-lg border transition-colors text-sm ${
                        style.animation === anim.value
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:bg-secondary'
                      }`}
                    >
                      {anim.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>ფონის ფერი</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={style.background_color || '#000000'}
                    onChange={(e) => updateStyle('background_color', e.target.value)}
                    className="h-10 w-20"
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => updateStyle('background_color', null)}
                  >
                    წაშლა
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>ჩარჩოს ფერი</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={style.border_color || '#ffffff'}
                    onChange={(e) => updateStyle('border_color', e.target.value)}
                    className="h-10 w-20"
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => updateStyle('border_color', null)}
                  >
                    წაშლა
                  </Button>
                </div>
                {style.border_color && (
                  <div className="space-y-1">
                    <Label className="text-xs">სისქე ({style.border_width}px)</Label>
                    <Slider
                      value={[style.border_width]}
                      onValueChange={([val]) => updateStyle('border_width', val)}
                      max={5}
                      step={1}
                    />
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Extras Tab */}
            <TabsContent value="extras" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label>წინა ემოჯი</Label>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => updateStyle('prefix_emoji', null)}
                    className={`w-8 h-8 rounded border flex items-center justify-center ${
                      !style.prefix_emoji ? 'border-primary bg-primary/10' : 'border-border'
                    }`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                  {emojiOptions.map((emoji) => (
                    <button
                      key={`prefix-${emoji}`}
                      onClick={() => updateStyle('prefix_emoji', emoji)}
                      className={`w-8 h-8 rounded border text-lg hover:scale-110 transition-transform ${
                        style.prefix_emoji === emoji ? 'border-primary bg-primary/10' : 'border-border'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>უკანა ემოჯი</Label>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => updateStyle('suffix_emoji', null)}
                    className={`w-8 h-8 rounded border flex items-center justify-center ${
                      !style.suffix_emoji ? 'border-primary bg-primary/10' : 'border-border'
                    }`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                  {emojiOptions.map((emoji) => (
                    <button
                      key={`suffix-${emoji}`}
                      onClick={() => updateStyle('suffix_emoji', emoji)}
                      className={`w-8 h-8 rounded border text-lg hover:scale-110 transition-transform ${
                        style.suffix_emoji === emoji ? 'border-primary bg-primary/10' : 'border-border'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>კუთხეების მრგვალება ({style.border_radius}px)</Label>
                <Slider
                  value={[style.border_radius]}
                  onValueChange={([val]) => updateStyle('border_radius', val)}
                  max={20}
                  step={1}
                />
              </div>
            </TabsContent>
          </div>
        </Tabs>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t">
          <Button variant="outline" onClick={handleReset} className="flex-1">
            <RotateCcw className="w-4 h-4 mr-2" />
            გადატვირთვა
          </Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'ინახება...' : 'შენახვა'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UsernameStyleEditor;
