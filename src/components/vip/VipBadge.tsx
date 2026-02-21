import { Crown, Gem, Medal, Award } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface VipBadgeProps {
  vipType: string;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}

const VipBadge = ({ vipType, size = 'sm', showTooltip = true }: VipBadgeProps) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const getBadgeConfig = () => {
    switch (vipType) {
      case 'vip_bronze':
        return {
          icon: Medal,
          color: 'text-amber-600',
          bgColor: 'bg-amber-100 dark:bg-amber-900/30',
          label: 'VIP Bronze',
          emoji: '🥉'
        };
      case 'vip_silver':
        return {
          icon: Award,
          color: 'text-slate-400',
          bgColor: 'bg-slate-100 dark:bg-slate-800/50',
          label: 'VIP Silver',
          emoji: '🥈'
        };
      case 'vip_gold':
        return {
          icon: Crown,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
          label: 'VIP Gold',
          emoji: '🥇'
        };
      case 'vip_diamond':
        return {
          icon: Gem,
          color: 'text-cyan-400',
          bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
          label: 'VIP Diamond',
          emoji: '💎'
        };
      default:
        return null;
    }
  };

  const config = getBadgeConfig();
  if (!config) return null;

  const Icon = config.icon;

  const badge = (
    <span className={`inline-flex items-center justify-center ${config.bgColor} ${config.color} rounded-full p-0.5`}>
      <Icon className={sizeClasses[size]} />
    </span>
  );

  if (!showTooltip) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent>
          <p className="flex items-center gap-1">
            {config.emoji} {config.label}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default VipBadge;
