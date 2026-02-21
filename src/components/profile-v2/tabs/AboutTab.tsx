import { Info, Lock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import SuperAdminInfo from '@/components/profile/SuperAdminInfo';

interface AboutTabProps {
  userId: string;
  isOwnProfile: boolean;
  username?: string;
}

const AboutTab = ({ userId, isOwnProfile, username }: AboutTabProps) => {
  const { userRole } = useAuth();
  
  const isSuperAdmin = userRole === 'super_admin';

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Lock className="w-12 h-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">
          ეს ინფორმაცია ხელმისაწვდომია მხოლოდ სუპერ ადმინებისთვის
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Info className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-lg">დეტალური ინფორმაცია</h3>
      </div>
      
      <div className="space-y-6 bg-card/50 rounded-lg p-4 border border-border">
        <SuperAdminInfo targetUserId={userId} targetUsername={username} />
      </div>
    </div>
  );
};

export default AboutTab;
