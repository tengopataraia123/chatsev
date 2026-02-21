import { useState } from 'react';
import { ArrowLeft, Crown, Star, Medal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import GenderAvatar from '@/components/shared/GenderAvatar';
import { useTopMembers } from '@/hooks/useTopMembers';

interface TopMembersViewProps {
  onBack: () => void;
  onUserClick?: (userId: string) => void;
}

const TopMembersView = ({ onBack, onUserClick }: TopMembersViewProps) => {
  const { topMembers, loading } = useTopMembers(50);

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown className="w-5 h-5 text-amber-500" />;
    if (index === 1) return <Medal className="w-5 h-5 text-gray-400" />;
    if (index === 2) return <Medal className="w-5 h-5 text-orange-600" />;
    return <span className="w-5 h-5 flex items-center justify-center text-xs font-bold text-muted-foreground">#{index + 1}</span>;
  };

  const getRankBadge = (index: number) => {
    if (index === 0) return 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white';
    if (index === 1) return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white';
    if (index === 2) return 'bg-gradient-to-r from-orange-500 to-orange-600 text-white';
    return 'bg-secondary text-foreground';
  };

  const getLevel = (points: number) => {
    if (points >= 1000) return { name: 'ოქროს', color: 'text-yellow-500', icon: '🏆' };
    if (points >= 500) return { name: 'ვერცხლის', color: 'text-gray-400', icon: '🥈' };
    if (points >= 100) return { name: 'ბრინჯაოს', color: 'text-orange-500', icon: '🥉' };
    return { name: 'დამწყები', color: 'text-primary', icon: '⭐' };
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-amber-500" />
          <h1 className="text-lg font-bold">Top Members</h1>
        </div>
      </div>

      {/* Top 3 Podium */}
      {!loading && topMembers.length >= 3 && (
        <div className="p-4 bg-gradient-to-b from-amber-500/10 to-transparent">
          <div className="flex items-end justify-center gap-2">
            {/* 2nd Place */}
            <div 
              className="flex flex-col items-center cursor-pointer"
              onClick={() => onUserClick?.(topMembers[1].user_id)}
            >
              <div className="relative">
                <GenderAvatar 
                  src={topMembers[1].avatar_url}
                  gender={(topMembers[1] as any).gender}
                  username={topMembers[1].username}
                  className="h-16 w-16 border-4 border-gray-400"
                />
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  2
                </div>
              </div>
              <p className="mt-3 text-xs font-medium truncate max-w-16">{topMembers[1].username}</p>
              <p className="text-xs text-amber-500 font-bold">{topMembers[1].points}</p>
            </div>

            {/* 1st Place */}
            <div 
              className="flex flex-col items-center cursor-pointer -mt-4"
              onClick={() => onUserClick?.(topMembers[0].user_id)}
            >
              <Crown className="w-8 h-8 text-amber-500 mb-1" />
              <div className="relative">
                <GenderAvatar 
                  src={topMembers[0].avatar_url}
                  gender={(topMembers[0] as any).gender}
                  username={topMembers[0].username}
                  className="h-20 w-20 border-4 border-amber-500"
                />
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-7 h-7 bg-amber-500 rounded-full flex items-center justify-center text-white font-bold">
                  1
                </div>
              </div>
              <p className="mt-3 text-sm font-bold truncate max-w-20">{topMembers[0].username}</p>
              <p className="text-sm text-amber-500 font-bold">{topMembers[0].points}</p>
            </div>

            {/* 3rd Place */}
            <div 
              className="flex flex-col items-center cursor-pointer"
              onClick={() => onUserClick?.(topMembers[2].user_id)}
            >
              <div className="relative">
                <GenderAvatar 
                  src={topMembers[2].avatar_url}
                  gender={(topMembers[2] as any).gender}
                  username={topMembers[2].username}
                  className="h-16 w-16 border-4 border-orange-600"
                />
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-6 bg-orange-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  3
                </div>
              </div>
              <p className="mt-3 text-xs font-medium truncate max-w-16">{topMembers[2].username}</p>
              <p className="text-xs text-amber-500 font-bold">{topMembers[2].points}</p>
            </div>
          </div>
        </div>
      )}

      {/* Full List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : topMembers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Crown className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>მომხმარებლები არ არიან</p>
          </div>
        ) : (
          topMembers.slice(3).map((member, index) => {
            const level = getLevel(member.points);
            return (
              <Card 
                key={member.user_id} 
                className="hover:bg-secondary/50 transition-colors cursor-pointer"
                onClick={() => onUserClick?.(member.user_id)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getRankBadge(index + 3)}`}>
                      <span className="text-sm font-bold">{index + 4}</span>
                    </div>
                    <GenderAvatar 
                      src={member.avatar_url}
                      gender={(member as any).gender}
                      username={member.username}
                      className="h-12 w-12"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{member.username}</p>
                        <span className="text-sm">{level.icon}</span>
                      </div>
                      <p className={`text-sm ${level.color}`}>{level.name} დონე</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-amber-500">
                        <Star className="w-4 h-4 fill-amber-500" />
                        <span className="font-bold">{member.points}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">ქულა</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TopMembersView;
