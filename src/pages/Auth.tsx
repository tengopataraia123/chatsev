import { useState, useCallback } from 'react';
import { BannedScreen } from '@/components/auth/BannedScreen';
import { BanInfo } from '@/hooks/useSiteBan';
import AuthPageRedesign from '@/components/auth/AuthPageRedesign';

const Auth = () => {
  const [banInfo, setBanInfo] = useState<BanInfo | null>(null);

  const handleSignOut = useCallback(() => {
    setBanInfo(null);
  }, []);

  // Show banned screen if user is banned
  if (banInfo?.is_banned) {
    return <BannedScreen banInfo={banInfo} onSignOut={handleSignOut} />;
  }

  return <AuthPageRedesign onBanDetected={setBanInfo} />;
};

export default Auth;
