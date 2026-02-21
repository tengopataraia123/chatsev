import { memo, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

interface LinkifyTextProps {
  text: string;
  className?: string;
}

// Match URLs (http/https/www) and known bare domains (e.g. chatsev.com/path)
const URL_REGEX = /(https?:\/\/[^\s<>[\]]+|www\.[^\s<>[\]]+|(?:chatsev\.com|connect-blossom-pulse\.lovable\.app)(?:\/[^\s<>[\]]*)?)/gi;

// Known site domains for internal navigation
const SITE_DOMAINS = [
  'chatsev.com',
  'www.chatsev.com',
  'connect-blossom-pulse.lovable.app',
  'lovable.app',
  'localhost',
];

const isInternalUrl = (url: string): string | null => {
  try {
    const fullUrl = url.startsWith('www.') ? `https://${url}` : url;
    const parsed = new URL(fullUrl);
    
    const isInternal = SITE_DOMAINS.some(domain => 
      parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`)
    );
    
    if (isInternal) {
      // Return the path + search + hash for internal navigation
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    // Not a valid URL
  }
  return null;
};

/**
 * Renders text with clickable links.
 * Internal site links use react-router navigation.
 * External links open in a new tab.
 */
const LinkifyText = memo(({ text, className }: LinkifyTextProps) => {
  const navigate = useNavigate();

  const segments = useMemo(() => {
    const parts: { type: 'text' | 'link'; value: string; href?: string; internal?: string }[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    
    const regex = new RegExp(URL_REGEX.source, 'gi');
    
    while ((match = regex.exec(text)) !== null) {
      // Text before this URL
      if (match.index > lastIndex) {
        parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
      }
      
      const url = match[0];
      const href = url.startsWith('http') ? url : `https://${url}`;
      const internalPath = isInternalUrl(url);
      
      parts.push({ 
        type: 'link', 
        value: url, 
        href,
        internal: internalPath || undefined
      });
      
      lastIndex = match.index + match[0].length;
    }
    
    // Remaining text
    if (lastIndex < text.length) {
      parts.push({ type: 'text', value: text.slice(lastIndex) });
    }
    
    return parts.length > 0 ? parts : [{ type: 'text' as const, value: text }];
  }, [text]);

  return (
    <span className={className}>
      {segments.map((segment, idx) => {
        if (segment.type === 'link') {
          if (segment.internal) {
            return (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(segment.internal!);
                }}
                className="text-primary underline underline-offset-2 hover:opacity-80 transition-opacity break-all"
              >
                {segment.value}
              </button>
            );
          }
          return (
            <a
              key={idx}
              href={segment.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-primary underline underline-offset-2 hover:opacity-80 transition-opacity break-all"
            >
              {segment.value}
            </a>
          );
        }
        return <span key={idx}>{segment.value}</span>;
      })}
    </span>
  );
});

LinkifyText.displayName = 'LinkifyText';

export default LinkifyText;
