import WeatherWidget from '@/components/weather/WeatherWidget';
import { cn } from '@/lib/utils';

interface HomeWidgetsPanelProps {
  onNavigate: (tab: string) => void;
  className?: string;
}

const HomeWidgetsPanel = ({ onNavigate, className }: HomeWidgetsPanelProps) => {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Weather Widget */}
      <WeatherWidget city="Tbilisi" />
    </div>
  );
};

export default HomeWidgetsPanel;
