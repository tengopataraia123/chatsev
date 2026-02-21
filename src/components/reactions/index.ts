// Universal Reactions System - Main exports
export { default as UniversalReactionButton } from './UniversalReactionButton';
export { 
  UNIVERSAL_REACTIONS, 
  getReactionEmoji, 
  getReactionLabel, 
  getReactionColor,
  type ReactionType,
  type ReactionCounts,
  type UniversalReactionButtonProps 
} from './UniversalReactionButton';

// Legacy exports for backward compatibility
export { default as MessageReactions } from './MessageReactions';
export { default as ReactionPicker, REACTION_TYPES, getReactionEmoji as getLegacyReactionEmoji } from './ReactionPicker';
export { default as ReactionsModal } from './ReactionsModal';
