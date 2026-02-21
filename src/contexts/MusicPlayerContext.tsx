import React, { createContext, useContext, ReactNode } from 'react';
import { useMusicPlayer } from '@/hooks/useMusicPlayer';
import type { MusicTrack } from '@/components/music/ModernMusicPlayer';

type MusicPlayerContextType = ReturnType<typeof useMusicPlayer>;

const MusicPlayerContext = createContext<MusicPlayerContextType | null>(null);

export const MusicPlayerProvider = ({ children }: { children: ReactNode }) => {
  const musicPlayer = useMusicPlayer();
  
  return (
    <MusicPlayerContext.Provider value={musicPlayer}>
      {children}
    </MusicPlayerContext.Provider>
  );
};

export const useMusicPlayerContext = () => {
  const context = useContext(MusicPlayerContext);
  if (!context) {
    throw new Error('useMusicPlayerContext must be used within MusicPlayerProvider');
  }
  return context;
};

export type { MusicTrack };
