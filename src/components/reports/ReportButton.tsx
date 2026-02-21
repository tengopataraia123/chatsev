import { useState } from 'react';
import { Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ReportModal, ContentType } from './ReportModal';
import { useAuth } from '@/contexts/AuthContext';

interface ReportButtonProps {
  contentType: ContentType;
  contentId: string;
  reportedUserId: string;
  contentPreview?: string;
  variant?: 'icon' | 'ghost' | 'menu';
  size?: 'sm' | 'default';
  className?: string;
  showOnlyForOthers?: boolean;
}

export function ReportButton({
  contentType,
  contentId,
  reportedUserId,
  contentPreview,
  variant = 'icon',
  size = 'sm',
  className = '',
  showOnlyForOthers = true,
}: ReportButtonProps) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  // Don't show report button for own content
  if (showOnlyForOthers && user?.id === reportedUserId) {
    return null;
  }

  if (!user) {
    return null;
  }

  if (variant === 'menu') {
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-2 px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 rounded-sm"
        >
          <Flag className="h-4 w-4" />
          გასაჩივრება
        </button>
        <ReportModal
          open={open}
          onOpenChange={setOpen}
          contentType={contentType}
          contentId={contentId}
          reportedUserId={reportedUserId}
          contentPreview={contentPreview}
        />
      </>
    );
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size={size}
            className={`text-muted-foreground hover:text-destructive ${className}`}
            onClick={() => setOpen(true)}
          >
            <Flag className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>გასაჩივრება</p>
        </TooltipContent>
      </Tooltip>
      <ReportModal
        open={open}
        onOpenChange={setOpen}
        contentType={contentType}
        contentId={contentId}
        reportedUserId={reportedUserId}
        contentPreview={contentPreview}
      />
    </>
  );
}
