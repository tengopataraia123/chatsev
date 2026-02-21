import { useMemo } from 'react';

interface BioPreviewProps {
  content: string;
  className?: string;
}

const BioPreview = ({ content, className }: BioPreviewProps) => {
  const renderedContent = useMemo(() => {
    if (!content) return <span className="text-muted-foreground italic">Bio ცარიელია</span>;

    // Parse mentions, hashtags, and links
    const parts = content.split(/(@\w+|#\w+|https?:\/\/[^\s]+)/g);
    
    return parts.map((part, idx) => {
      if (part.startsWith('@')) {
        return (
          <span 
            key={idx} 
            className="text-primary font-medium cursor-pointer hover:underline"
          >
            {part}
          </span>
        );
      }
      if (part.startsWith('#')) {
        return (
          <span 
            key={idx} 
            className="text-primary/80 cursor-pointer hover:underline"
          >
            {part}
          </span>
        );
      }
      if (part.startsWith('http')) {
        const displayUrl = part.replace(/^https?:\/\/(www\.)?/, '').slice(0, 30);
        return (
          <span 
            key={idx}
            className="text-primary underline"
          >
            {displayUrl}{part.length > 30 ? '...' : ''}
          </span>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  }, [content]);

  return (
    <div className={`text-sm whitespace-pre-wrap break-words leading-relaxed ${className || ''}`}>
      {renderedContent}
    </div>
  );
};

export default BioPreview;
