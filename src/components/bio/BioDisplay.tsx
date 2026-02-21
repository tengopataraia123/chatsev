import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Pencil, Lock, Users, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBio } from '@/hooks/useBio';
import { BioContent } from './types';
import { cn } from '@/lib/utils';

interface BioDisplayProps {
  userId: string;
  isOwnProfile: boolean;
  onEdit?: () => void;
}

const BioDisplay = ({ userId, isOwnProfile, onEdit }: BioDisplayProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { bio, loading } = useBio(userId);

  const renderContent = useMemo(() => {
    if (!bio?.content) return null;

    const content = bio.content;
    
    // Parse mentions, hashtags, and links
    const parts = content.split(/(@\w+|#\w+|https?:\/\/[^\s]+)/g);
    
    return parts.map((part, idx) => {
      if (part.startsWith('@')) {
        return (
          <span 
            key={idx} 
            className="text-primary font-medium cursor-pointer hover:underline"
            onClick={() => {
              // Navigate to user profile
              const username = part.slice(1);
              console.log('Navigate to:', username);
            }}
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
          <a 
            key={idx}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline hover:text-primary/80"
          >
            {displayUrl}{part.length > 30 ? '...' : ''}
          </a>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  }, [bio?.content]);

  const isLong = (bio?.content?.length || 0) > 100 || (bio?.content?.split('\n').length || 0) > 2;
  const shouldTruncate = isLong && !isExpanded;

  const getVisibilityIcon = () => {
    switch (bio?.visibility) {
      case 'friends': return <Users className="w-3 h-3" />;
      case 'hidden': return <Lock className="w-3 h-3" />;
      default: return <Globe className="w-3 h-3" />;
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-muted rounded w-3/4 mb-2" />
        <div className="h-4 bg-muted rounded w-1/2" />
      </div>
    );
  }

  if (!bio?.content && !isOwnProfile) return null;

  return (
    <div className="relative group">
      {/* Bio Content */}
      <div className={cn(
        "relative rounded-xl px-3 py-2 transition-all",
        bio?.content && "bg-foreground/[0.03]"
      )}>
        {bio?.content ? (
          <>
            <AnimatePresence mode="wait">
              <motion.div
                key={isExpanded ? 'expanded' : 'collapsed'}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "text-sm text-foreground/90 whitespace-pre-wrap break-words leading-relaxed",
                  shouldTruncate && "line-clamp-2"
                )}
              >
                {renderContent}
              </motion.div>
            </AnimatePresence>
            
            {/* See More / Less */}
            {isLong && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-1 text-xs text-primary mt-1 hover:underline font-medium"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="w-3 h-3" />
                    ნაკლებს ნახვა
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3" />
                    მეტის ნახვა
                  </>
                )}
              </button>
            )}

            {/* Visibility Badge (only for own profile) */}
            {isOwnProfile && bio?.visibility !== 'public' && (
              <div className="absolute top-2 right-2 flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                {getVisibilityIcon()}
                <span className="hidden sm:inline">
                  {bio?.visibility === 'friends' ? 'მეგობრები' : 'დამალული'}
                </span>
              </div>
            )}
          </>
        ) : (
          isOwnProfile && (
            <button
              onClick={onEdit}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              <Pencil className="w-4 h-4" />
              <span>დაამატე Bio...</span>
            </button>
          )
        )}
      </div>

      {/* Edit Button - Only show on hover for own profile */}
      {isOwnProfile && bio?.content && (
        <button
          onClick={onEdit}
          className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-primary text-primary-foreground p-1.5 rounded-full shadow-lg hover:scale-105"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

export default BioDisplay;
