import { Users, Lock, Eye, EyeOff } from 'lucide-react';
import { Group } from './types';

interface GroupCardProps {
  group: Group;
  onClick: (groupId: string) => void;
}

const privacyConfig = {
  public: { icon: Eye, label: 'საჯარო', color: 'text-green-500' },
  closed: { icon: Lock, label: 'დახურული', color: 'text-yellow-500' },
  secret: { icon: EyeOff, label: 'საიდუმლო', color: 'text-red-500' },
};

const GroupCard = ({ group, onClick }: GroupCardProps) => {
  const privacy = privacyConfig[group.privacy_type] || privacyConfig.public;
  const PrivacyIcon = privacy.icon;

  return (
    <button
      onClick={() => onClick(group.id)}
      className="w-full text-left bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-200 active:scale-[0.98]"
    >
      {/* Cover */}
      <div className="relative h-24 bg-gradient-to-br from-primary/20 to-accent/20">
        {group.group_cover_url && (
          <img
            src={group.group_cover_url}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        )}
        {/* Avatar */}
        <div className="absolute -bottom-6 left-4">
          <div className="w-14 h-14 rounded-xl border-3 border-card bg-secondary overflow-hidden">
            {group.group_avatar_url ? (
              <img src={group.group_avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary/10">
                <Users className="w-6 h-6 text-primary" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="pt-8 px-4 pb-4">
        <h3 className="font-semibold text-foreground truncate">{group.name}</h3>
        <div className="flex items-center gap-2 mt-1">
          <PrivacyIcon className={`w-3.5 h-3.5 ${privacy.color}`} />
          <span className="text-xs text-muted-foreground">{privacy.label}</span>
          <span className="text-xs text-muted-foreground">•</span>
          <Users className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{group.member_count} წევრი</span>
        </div>
        {group.description && (
          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{group.description}</p>
        )}
      </div>
    </button>
  );
};

export default GroupCard;
