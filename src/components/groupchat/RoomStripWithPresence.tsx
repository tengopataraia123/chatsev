import { MessageCircle, Moon, Plane, Headphones } from 'lucide-react';
import { useBatchPresence } from '@/hooks/useBatchPresence';

interface RoomStripWithPresenceProps {
  onRoomClick: (roomId: 'gossip' | 'night' | 'emigrants' | 'dj') => void;
}

const RoomStripWithPresence = ({ onRoomClick }: RoomStripWithPresenceProps) => {
  // Use optimized batch presence hook instead of individual polling
  const { counts } = useBatchPresence();

  const rooms = [
    {
      id: 'gossip' as const,
      name: 'ჭორბიურო',
      icon: MessageCircle,
      gradient: 'from-purple-500 to-pink-500',
      onlineCount: counts.gossip
    },
    {
      id: 'night' as const,
      name: 'ღამის ოთახი',
      icon: Moon,
      gradient: 'from-indigo-600 to-purple-700',
      onlineCount: counts.night
    },
    {
      id: 'emigrants' as const,
      name: 'ემიგრანტები',
      icon: Plane,
      gradient: 'from-blue-500 to-cyan-500',
      onlineCount: counts.emigrants
    },
    {
      id: 'dj' as const,
      name: 'DJ Room',
      icon: Headphones,
      gradient: 'from-pink-500 to-orange-500',
      onlineCount: counts.dj
    }
  ];

  return (
    <div className="bg-card/50 border-y border-border py-2 px-3">
      <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide">
        {rooms.map((room) => {
          const Icon = room.icon;
          return (
            <button
              key={room.id}
              onClick={() => onRoomClick(room.id)}
              className="flex flex-col items-center gap-1 flex-shrink-0 min-w-[70px] group"
            >
              <div className={`relative w-12 h-12 rounded-xl bg-gradient-to-br ${room.gradient} flex items-center justify-center shadow-md group-hover:scale-105 transition-transform`}>
                <Icon className="w-6 h-6 text-white" />
                {room.onlineCount > 0 && (
                  <div className="absolute -bottom-1 -right-1 bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center border-2 border-background">
                    {room.onlineCount > 99 ? '99+' : room.onlineCount}
                  </div>
                )}
              </div>
              <span className="text-[10px] font-medium text-muted-foreground group-hover:text-foreground transition-colors truncate max-w-[70px] text-center">
                {room.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default RoomStripWithPresence;
