import { useMemo, memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface HashtagMentionTextProps {
  content: string;
  className?: string;
  onUserClick?: (userId: string) => void;
  onHashtagClick?: (hashtag: string) => void;
  /** If true, render as inline span instead of div */
  inline?: boolean;
}

// Cache for username to userId lookups
const usernameCache = new Map<string, string>();

/**
 * Renders text content with clickable #hashtags and @mentions
 * Hashtags navigate to /hashtag/:tag
 * Mentions navigate to user profile
 */
const HashtagMentionText = memo(({
  content,
  className,
  onUserClick,
  onHashtagClick,
  inline = false
}: HashtagMentionTextProps) => {
  const navigate = useNavigate();
  
  const handleHashtagClick = useCallback((tag: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onHashtagClick) {
      onHashtagClick(tag);
    } else {
      navigate(`/hashtag/${tag}`);
    }
  }, [onHashtagClick, navigate]);

  const handleMentionClick = useCallback((username: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onUserClick) {
      onUserClick(username);
    } else {
      navigate(`/?view=profile&username=${encodeURIComponent(username)}`);
    }
  }, [onUserClick, navigate]);

  const renderedContent = useMemo(() => {
    if (!content) return null;

    // Split content by hashtags and mentions while preserving them
    // Pattern matches #hashtag (including Georgian letters) and @username
    const pattern = /(#[\wა-ჰ]+|@[\wა-ჰ]+)/gi;
    const parts = content.split(pattern);

    return parts.map((part, index) => {
      // Check if this part is a hashtag
      if (part.startsWith('#')) {
        const tag = part.slice(1).toLowerCase();
        return (
          <button
            key={`hashtag-${index}`}
            onClick={(e) => handleHashtagClick(tag, e)}
            className="text-primary hover:underline font-medium transition-colors inline"
          >
            {part}
          </button>
        );
      }
      
      // Check if this part is a mention
      if (part.startsWith('@')) {
        const username = part.slice(1);
        return (
          <button
            key={`mention-${index}`}
            onClick={(e) => handleMentionClick(username, e)}
            className="text-primary hover:underline font-medium transition-colors inline"
          >
            {part}
          </button>
        );
      }
      
      // Regular text - preserve line breaks
      if (part) {
        return <span key={`text-${index}`}>{part}</span>;
      }
      
      return null;
    });
  }, [content, handleHashtagClick, handleMentionClick]);

  const Tag = inline ? 'span' : 'div';

  return (
    <Tag className={cn("whitespace-pre-wrap break-words", className)}>
      {renderedContent}
    </Tag>
  );
});

HashtagMentionText.displayName = 'HashtagMentionText';

export default HashtagMentionText;
