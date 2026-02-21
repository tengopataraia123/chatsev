import { ReactNode, useMemo } from 'react';
import StyledText from '@/components/text/StyledText';
import StyledUsername from '@/components/username/StyledUsername';
import LinkifyText from '@/components/shared/LinkifyText';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';

interface MentionHighlightedTextProps {
  content: string;
  messageAuthorId: string;
  currentUsername: string | undefined;
  className?: string;
  chatBackgroundColor?: string;
}

// Cache for username to userId mapping
const usernameToUserIdCache = new Map<string, string>();

const MentionHighlightedText = ({ 
  content, 
  messageAuthorId, 
  currentUsername,
  className = '',
  chatBackgroundColor
}: MentionHighlightedTextProps) => {
  const [userIdMap, setUserIdMap] = useState<Map<string, string>>(new Map());

  // Parse content to find all @mentions
  const mentions = useMemo(() => {
    const mentionRegex = /@(\w+)/g;
    const found: string[] = [];
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
      found.push(match[1].toLowerCase());
    }
    return [...new Set(found)];
  }, [content]);

  // Fetch user IDs for mentioned usernames
  useEffect(() => {
    const fetchUserIds = async () => {
      const uncachedUsernames = mentions.filter(u => !usernameToUserIdCache.has(u));
      
      if (uncachedUsernames.length > 0) {
        const { data } = await supabase
          .from('profiles')
          .select('user_id, username')
          .in('username', uncachedUsernames);
        
        if (data) {
          data.forEach(p => {
            usernameToUserIdCache.set(p.username.toLowerCase(), p.user_id);
          });
        }
      }
      
      // Build map from cache
      const newMap = new Map<string, string>();
      mentions.forEach(username => {
        const userId = usernameToUserIdCache.get(username);
        if (userId) {
          newMap.set(username, userId);
        }
      });
      setUserIdMap(newMap);
    };

    if (mentions.length > 0) {
      fetchUserIds();
    }
  }, [mentions]);

  // Parse and render content with highlighted mentions
  const renderedContent = useMemo(() => {
    if (!content) return null;
    
    const currentUserLower = currentUsername?.toLowerCase();
    
    // Split content by @mentions while preserving them (match with or without @)
    const mentionRegex = /(@?\b\w+\b)/g;
    const parts = content.split(/(@\w+)/g);
    
    return parts.map((part, index) => {
      // Check if this part is a mention (starts with @)
      if (part.startsWith('@')) {
        const username = part.slice(1).toLowerCase();
        const userId = userIdMap.get(username);
        const isMentionedMe = currentUserLower && username === currentUserLower;
        
        if (isMentionedMe) {
          // Current user is mentioned - show in bold red (larger, no @)
          return (
            <span 
              key={index} 
              className="font-bold text-red-600 text-base uppercase tracking-wide"
              style={{ fontSize: '1.1em' }}
            >
              {username}
            </span>
          );
        } else if (userId) {
          // Other user mentioned - show without @ with their styled username
          return (
            <StyledUsername 
              key={index}
              userId={userId}
              username={username}
              className="font-medium"
              chatBackgroundColor={chatBackgroundColor}
            />
          );
        } else {
          // Unknown user - show without @ as plain text
          return <span key={index}>{username}</span>;
        }
      }
      
      // Regular text - use message author's style + linkify URLs
      if (part) {
        return (
          <StyledText key={index} userId={messageAuthorId} className="" chatBackgroundColor={chatBackgroundColor}>
            <LinkifyText text={part} />
          </StyledText>
        );
      }
      return null;
    });
  }, [content, currentUsername, userIdMap, messageAuthorId, chatBackgroundColor]);

  return (
    <span className={`break-words whitespace-pre-wrap text-sm leading-relaxed ${className}`}>
      {renderedContent}
    </span>
  );
};

export default MentionHighlightedText;
