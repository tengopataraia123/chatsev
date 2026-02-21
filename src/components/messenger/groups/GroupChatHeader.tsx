/**
 * Group Chat Header
 */
import { memo, useState } from 'react';
import { ArrowLeft, Phone, Video, Info, MoreVertical, Users, LogOut, Settings, UserPlus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { MessengerGroup, CHAT_THEME_COLORS, ChatTheme } from '../types';

interface GroupChatHeaderProps {
  group: MessengerGroup;
  onBack: () => void;
  onOpenSettings?: () => void;
  onAddMembers?: () => void;
  onLeaveGroup?: () => void;
  onChangeTheme?: (theme: ChatTheme) => void;
  isMobile?: boolean;
}

const GroupChatHeader = memo(({
  group,
  onBack,
  onOpenSettings,
  onAddMembers,
  onLeaveGroup,
  onChangeTheme,
  isMobile
}: GroupChatHeaderProps) => {
  return (
    <div className="flex items-center gap-3 p-3 border-b border-border bg-background/95 backdrop-blur-sm">
      {/* Back button (mobile) */}
      {isMobile && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="flex-shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
      )}

      {/* Group Avatar */}
      <div className="relative flex-shrink-0">
        <Avatar className="w-10 h-10">
          {group.avatar_url ? (
            <AvatarImage src={group.avatar_url} alt={group.name} />
          ) : (
            <AvatarFallback className="bg-primary/20 text-primary">
              <Users className="w-5 h-5" />
            </AvatarFallback>
          )}
        </Avatar>
      </div>

      {/* Group info */}
      <div className="flex-1 min-w-0">
        <h2 className="font-semibold text-foreground truncate">
          {group.name}
        </h2>
        <p className="text-xs text-muted-foreground truncate">
          {group.member_count} მონაწილე
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1">
        {/* More options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {onOpenSettings && (
              <DropdownMenuItem onClick={onOpenSettings}>
                <Settings className="w-4 h-4 mr-2" />
                ჯგუფის პარამეტრები
              </DropdownMenuItem>
            )}
            
            {onAddMembers && group.my_role !== 'member' && (
              <DropdownMenuItem onClick={onAddMembers}>
                <UserPlus className="w-4 h-4 mr-2" />
                წევრის დამატება
              </DropdownMenuItem>
            )}
            
            {/* Theme selector */}
            {onChangeTheme && (
              <>
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5">
                  <p className="text-xs text-muted-foreground mb-2">თემის ფერი</p>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(CHAT_THEME_COLORS).map(([themeName, colors]) => (
                      <button
                        key={themeName}
                        onClick={() => onChangeTheme(themeName as ChatTheme)}
                        className={cn(
                          "w-6 h-6 rounded-full border-2 transition-transform hover:scale-110",
                          group.theme === themeName 
                            ? "border-foreground scale-110" 
                            : "border-transparent"
                        )}
                        style={{ backgroundColor: colors.primary }}
                        title={themeName}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
            
            <DropdownMenuSeparator />
            {onLeaveGroup && (
              <DropdownMenuItem onClick={onLeaveGroup} className="text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                ჯგუფის დატოვება
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});

GroupChatHeader.displayName = 'GroupChatHeader';

export default GroupChatHeader;
