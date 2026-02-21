import { useState } from 'react';
import { MessageCircle, Moon, Plane, Headphones, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RoomType } from './RoomChatView';

interface RoomSelectorProps {
  onSelectRoom: (room: RoomType) => void;
  onBack: () => void;
}

const ROOMS = [
  {
    id: 'gossip' as RoomType,
    name: 'ჭორბიურო',
    icon: MessageCircle,
    gradient: 'from-purple-500 to-pink-500'
  },
  {
    id: 'night' as RoomType,
    name: 'ღამის ოთახი',
    icon: Moon,
    gradient: 'from-indigo-600 to-purple-700'
  },
  {
    id: 'emigrants' as RoomType,
    name: 'ემიგრანტების ოთახი',
    icon: Plane,
    gradient: 'from-blue-500 to-cyan-500'
  },
  {
    id: 'dj' as RoomType,
    name: 'DJ Room',
    icon: Headphones,
    gradient: 'from-pink-500 to-orange-500'
  }
];

const RoomSelector = ({ onSelectRoom, onBack }: RoomSelectorProps) => {
  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex-shrink-0 border-b border-border bg-card px-4 py-3">
        <h2 className="font-semibold text-lg">აირჩიეთ ოთახი</h2>
        <p className="text-sm text-muted-foreground">შეუერთდით ჯგუფურ ჩატს</p>
      </div>
      
      {/* Desktop: 2-column grid, Mobile: list */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {ROOMS.map((room) => {
            const Icon = room.icon;
            return (
              <button
                key={room.id}
                onClick={() => onSelectRoom(room.id)}
                className="w-full flex items-center gap-4 p-4 bg-card rounded-xl border border-border hover:border-primary/50 hover:bg-accent/50 transition-all group hover:shadow-lg hover:shadow-primary/5 active:scale-[0.98]"
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${room.gradient} flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-base">{room.name}</h3>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </button>
            );
          })}
        </div>
      </div>
      
      <div className="flex-shrink-0 p-4 border-t border-border">
        <Button variant="outline" className="w-full" onClick={onBack}>
          უკან დაბრუნება
        </Button>
      </div>
    </div>
  );
};

export default RoomSelector;
