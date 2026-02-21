import { memo } from 'react';
import { Users, HelpCircle, Film, Gamepad2, Image, UsersRound } from 'lucide-react';
import { useBatchPresence } from '@/hooks/useBatchPresence';
import { useOnlineUsers } from '@/hooks/useOnlineStatus';
import GroupChatPreview from '@/components/groupchat/GroupChatPreview';

interface HomeModulesGridProps {
  onNavigate: (page: string) => void;
  onGroupChatClick: () => void;
  onRoomClick: (roomId: 'gossip' | 'night' | 'emigrants' | 'dj') => void;
}

const HomeModulesGrid = memo(function HomeModulesGrid({
  onNavigate,
  onGroupChatClick,
  onRoomClick
}: HomeModulesGridProps) {
  // Use batch presence for all module counts
  const { counts: presenceCounts } = useBatchPresence();
  
  // Use the SAME hook as OnlineUsersView for consistent online count
  const { totalCount: onlineCount } = useOnlineUsers({ 
    limit: 1, // We only need the count, not the users
    excludeInvisible: true 
  });

  const moduleCards = [
    {
      id: 'online-users',
      icon: Users,
      label: 'Online',
      gradient: 'from-green-500 to-emerald-600',
      badge: onlineCount > 0 ? onlineCount.toString() : undefined,
      badgeColor: 'bg-green-500'
    },
    {
      id: 'quizzes',
      icon: HelpCircle,
      label: 'ვიქტორინა',
      gradient: 'from-purple-500 to-violet-600',
      badge: presenceCounts.quiz > 0 ? presenceCounts.quiz.toString() : undefined,
      badgeColor: 'bg-purple-500'
    },
    {
      id: 'movies',
      icon: Film,
      label: 'ფილმები',
      gradient: 'from-cyan-500 to-blue-600',
      badge: presenceCounts.movies > 0 ? presenceCounts.movies.toString() : undefined,
      badgeColor: 'bg-cyan-500'
    },
    // Live streaming removed
    {
      id: 'games',
      icon: Gamepad2,
      label: 'თამაშები',
      gradient: 'from-orange-500 to-red-600',
      badge: presenceCounts.games > 0 ? presenceCounts.games.toString() : undefined,
      badgeColor: 'bg-orange-500'
    },
    {
      id: 'photos',
      icon: Image,
      label: 'ფოტოგალერია',
      gradient: 'from-pink-500 to-rose-600',
      badge: undefined,
      badgeColor: 'bg-pink-500'
    },
    {
      id: 'groups',
      icon: UsersRound,
      label: 'ჯგუფები',
      gradient: 'from-indigo-500 to-blue-600',
      badge: undefined,
      badgeColor: 'bg-indigo-500'
    }
  ];

  return (
    <div className="space-y-3 px-3 py-3">
      {/* Group Chat Preview */}
      <GroupChatPreview 
        onClick={onGroupChatClick}
        onRoomClick={onRoomClick}
      />
      
      {/* Module Cards Grid - Material You 3.0 Tonal Surfaces */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 lg:gap-2.5">
        {moduleCards.map((module) => {
          const Icon = module.icon;
          return (
            <button
              key={module.id}
              onClick={() => onNavigate(module.id)}
              className={`relative flex flex-col items-center justify-center gap-1 px-1 py-2 lg:py-2.5 rounded-xl bg-gradient-to-br ${module.gradient} text-white overflow-hidden transition-all duration-200 active:scale-[0.95] group`}
            >
              {/* Badge */}
              {module.badge && (
                <span className="absolute top-1 right-1 bg-white/90 text-gray-900 text-[9px] font-bold min-w-[16px] h-[16px] px-1 rounded-full flex items-center justify-center">
                  {module.badge}
                </span>
              )}
              
              {/* Icon */}
              <Icon className="w-6 h-6 lg:w-7 lg:h-7" strokeWidth={1.75} />
              
              {/* Label */}
              <p className="font-medium text-[10px] lg:text-[11px] leading-tight text-white/90">{module.label}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
});

export default HomeModulesGrid;
