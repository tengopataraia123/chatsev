import { useState, useEffect } from 'react';
import { Palette, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

// Predefined chat background colors (HSL format for CSS variables)
const CHAT_COLORS = [
  { name: 'ნაგულისხმევი', value: '', hsl: '' },
  { name: 'ღამე', value: 'night', hsl: '240 15% 8%' },
  // Dark colors
  { name: 'ზღვა', value: 'ocean', hsl: '200 80% 25%' },
  { name: 'ტყე', value: 'forest', hsl: '140 60% 20%' },
  { name: 'ღვინო', value: 'wine', hsl: '340 60% 25%' },
  { name: 'იისფერი', value: 'purple', hsl: '270 50% 30%' },
  { name: 'შოკოლადი', value: 'chocolate', hsl: '25 50% 22%' },
  { name: 'ნაცარი', value: 'ash', hsl: '0 0% 30%' },
  // Lighter colors
  { name: 'ცისფერი', value: 'skyblue', hsl: '200 70% 55%' },
  { name: 'მწვანე', value: 'mint', hsl: '150 50% 50%' },
  { name: 'ვარდისფერი', value: 'rose', hsl: '330 60% 55%' },
  { name: 'ნარინჯისფერი', value: 'orange', hsl: '30 80% 50%' },
  { name: 'იასამნისფერი', value: 'lavender', hsl: '260 50% 60%' },
  { name: 'ატამისფერი', value: 'peach', hsl: '20 70% 65%' },
  { name: 'ციანი', value: 'cyan', hsl: '180 60% 45%' },
  { name: 'ოქროსფერი', value: 'gold', hsl: '45 80% 50%' },
];

interface ChatColorPickerProps {
  onColorChange: (color: string) => void;
  currentColor: string;
}

const ChatColorPicker = ({ onColorChange, currentColor }: ChatColorPickerProps) => {
  const [open, setOpen] = useState(false);

  const handleSelect = (colorValue: string) => {
    onColorChange(colorValue);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="ფონის ფერი">
          <Palette className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="end">
        <div className="text-sm font-medium mb-2 px-1">ფონის ფერი</div>
        <div className="grid grid-cols-4 gap-1.5">
          {CHAT_COLORS.map((color) => (
            <button
              key={color.value || 'default'}
              onClick={() => handleSelect(color.value)}
              className={`w-10 h-10 rounded-lg border-2 transition-all hover:scale-105 flex items-center justify-center ${
                currentColor === color.value
                  ? 'border-primary ring-2 ring-primary/30'
                  : 'border-transparent hover:border-muted-foreground/30'
              }`}
              style={{
                backgroundColor: color.hsl ? `hsl(${color.hsl})` : 'var(--chat-background)',
              }}
              title={color.name}
            >
              {currentColor === color.value && (
                <Check className="w-4 h-4 text-white drop-shadow-md" />
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

// Utility function to get contrast color
export const getContrastColor = (bgColor: string, originalColor: string): string => {
  if (!bgColor) return originalColor;
  
  // Parse the background HSL
  const bgHsl = getHslFromColorName(bgColor);
  if (!bgHsl) return originalColor;
  
  // Parse original color if it's in rgb/hsl format
  const originalLightness = getLightnessFromColor(originalColor);
  const bgLightness = bgHsl.l;
  
  // Check if contrast is too low (both dark or both light)
  const contrastRatio = Math.abs(originalLightness - bgLightness);
  
  // If contrast is less than 30%, invert to contrasting color
  if (contrastRatio < 30) {
    // If background is dark, make text light; if background is light, make text dark
    if (bgLightness < 50) {
      return `hsl(${getHueFromColor(originalColor) || 0}, ${getSaturationFromColor(originalColor) || 70}%, ${Math.min(originalLightness + 50, 90)}%)`;
    } else {
      return `hsl(${getHueFromColor(originalColor) || 0}, ${getSaturationFromColor(originalColor) || 70}%, ${Math.max(originalLightness - 50, 15)}%)`;
    }
  }
  
  return originalColor;
};

// Get HSL values from predefined color name
const getHslFromColorName = (colorName: string): { h: number; s: number; l: number } | null => {
  const color = CHAT_COLORS.find(c => c.value === colorName);
  if (!color || !color.hsl) return null;
  
  const parts = color.hsl.split(' ').map(p => parseFloat(p.replace('%', '')));
  if (parts.length !== 3) return null;
  
  return { h: parts[0], s: parts[1], l: parts[2] };
};

// Extract lightness from various color formats
const getLightnessFromColor = (color: string): number => {
  if (!color) return 50;
  
  // Handle HSL format
  if (color.includes('hsl')) {
    const match = color.match(/hsl\(?\s*[\d.]+\s*,?\s*[\d.]+%?\s*,?\s*([\d.]+)%?\s*\)?/i);
    if (match) return parseFloat(match[1]);
  }
  
  // Handle RGB format
  if (color.includes('rgb')) {
    const match = color.match(/rgb\(?\s*([\d.]+)\s*,?\s*([\d.]+)\s*,?\s*([\d.]+)\s*\)?/i);
    if (match) {
      const r = parseFloat(match[1]) / 255;
      const g = parseFloat(match[2]) / 255;
      const b = parseFloat(match[3]) / 255;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      return ((max + min) / 2) * 100;
    }
  }
  
  // Handle hex format
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    return ((max + min) / 2) * 100;
  }
  
  // Default to middle lightness
  return 50;
};

// Extract hue from color
const getHueFromColor = (color: string): number | null => {
  if (!color) return null;
  
  if (color.includes('hsl')) {
    const match = color.match(/hsl\(?\s*([\d.]+)/i);
    if (match) return parseFloat(match[1]);
  }
  
  return null;
};

// Extract saturation from color
const getSaturationFromColor = (color: string): number | null => {
  if (!color) return null;
  
  if (color.includes('hsl')) {
    const match = color.match(/hsl\(?\s*[\d.]+\s*,?\s*([\d.]+)%?/i);
    if (match) return parseFloat(match[1]);
  }
  
  return null;
};

// Get background style for chat area
export const getChatBackgroundStyle = (colorName: string): React.CSSProperties => {
  if (!colorName) return {};
  
  const color = CHAT_COLORS.find(c => c.value === colorName);
  if (!color || !color.hsl) return {};
  
  return {
    backgroundColor: `hsl(${color.hsl})`,
  };
};

// Export colors for use in other components
export { CHAT_COLORS };

export default ChatColorPicker;
