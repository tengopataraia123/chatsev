import { useState, useId } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface VerifiedBadgeProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  className?: string;
}

const VerifiedBadge = ({ size = 'sm', showTooltip = true, className }: VerifiedBadgeProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const gradientId = useId();
  
  const sizeMap = {
    xs: 14,
    sm: 16,
    md: 18,
    lg: 20
  };
  
  const iconSize = sizeMap[size];

  const badge = (
    <span
      className={cn(
        'inline-flex items-center justify-center flex-shrink-0',
        'transition-transform duration-150 ease-out',
        'motion-reduce:transition-none',
        isHovered && 'scale-[1.06]',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ width: iconSize + 4, height: iconSize + 4 }}
    >
      <svg
        viewBox="0 0 24 24"
        width={iconSize}
        height={iconSize}
        aria-label="Verified"
        role="img"
        className={cn(
          'transition-all duration-150 ease-out',
          'motion-reduce:transition-none',
          isHovered && 'drop-shadow-[0_0_8px_var(--verified-glow)]'
        )}
      >
        <defs>
          <linearGradient id={`vb_grad_${gradientId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--verified-top)" />
            <stop offset="100%" stopColor="var(--verified-bottom)" />
          </linearGradient>
        </defs>
        <circle
          cx="12"
          cy="12"
          r="10"
          fill={`url(#vb_grad_${gradientId})`}
          stroke="var(--verified-stroke)"
          strokeWidth="1"
        />
        <path
          d="M7.8 12.3l2.6 2.7 5.9-6.2"
          fill="none"
          stroke="white"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.15))'
          }}
        />
      </svg>
    </span>
  );

  if (!showTooltip) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p>პროფილი დადასტურებულია ✓</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default VerifiedBadge;
