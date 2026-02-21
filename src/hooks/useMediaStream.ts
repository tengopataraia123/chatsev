import { useState, useRef, useCallback, useEffect } from 'react';

interface MediaStreamState {
  stream: MediaStream | null;
  error: string | null;
  isLoading: boolean;
  isCameraOn: boolean;
  isMicOn: boolean;
}

export const useMediaStream = () => {
  const [state, setState] = useState<MediaStreamState>({
    stream: null,
    error: null,
    isLoading: false,
    isCameraOn: false,
    isMicOn: false,
  });
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startStream = useCallback(async (video: boolean = true, audio: boolean = true) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const constraints: MediaStreamConstraints = {
        video: video ? {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        } : false,
        audio: audio ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } : false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      streamRef.current = mediaStream;
      
      setState(prev => ({
        ...prev,
        stream: mediaStream,
        isLoading: false,
        isCameraOn: video,
        isMicOn: audio,
      }));

      return mediaStream;
    } catch (error: any) {
      console.error('Error accessing media devices:', error);
      let errorMessage = 'კამერაზე ან მიკროფონზე წვდომა ვერ მოხერხდა';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'კამერა/მიკროფონის ნებართვა უარყოფილია. გთხოვთ, დართოთ ნება ბრაუზერის პარამეტრებში.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'კამერა ან მიკროფონი ვერ მოიძებნა.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'კამერა ან მიკროფონი სხვა აპლიკაციის მიერ გამოიყენება.';
      }
      
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
      }));
      
      return null;
    }
  }, []);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setState(prev => ({
      ...prev,
      stream: null,
      isCameraOn: false,
      isMicOn: false,
    }));
  }, []);

  const toggleCamera = useCallback(async () => {
    if (!streamRef.current) return;
    
    const videoTracks = streamRef.current.getVideoTracks();
    
    if (videoTracks.length > 0) {
      // Toggle existing video track
      const enabled = !videoTracks[0].enabled;
      videoTracks.forEach(track => {
        track.enabled = enabled;
      });
      setState(prev => ({ ...prev, isCameraOn: enabled }));
    } else if (state.isMicOn) {
      // No video track, try to add one
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        const newVideoTrack = newStream.getVideoTracks()[0];
        streamRef.current.addTrack(newVideoTrack);
        setState(prev => ({ ...prev, isCameraOn: true, stream: streamRef.current }));
      } catch (error) {
        console.error('Error adding video track:', error);
      }
    }
  }, [state.isMicOn]);

  const toggleMic = useCallback(() => {
    if (!streamRef.current) return;
    
    const audioTracks = streamRef.current.getAudioTracks();
    if (audioTracks.length > 0) {
      const enabled = !audioTracks[0].enabled;
      audioTracks.forEach(track => {
        track.enabled = enabled;
      });
      setState(prev => ({ ...prev, isMicOn: enabled }));
    }
  }, []);

  const switchCamera = useCallback(async () => {
    if (!streamRef.current) return;
    
    const videoTracks = streamRef.current.getVideoTracks();
    if (videoTracks.length === 0) return;
    
    const currentTrack = videoTracks[0];
    const currentSettings = currentTrack.getSettings();
    const newFacingMode = currentSettings.facingMode === 'user' ? 'environment' : 'user';
    
    try {
      currentTrack.stop();
      
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: newFacingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      
      const newVideoTrack = newStream.getVideoTracks()[0];
      streamRef.current.removeTrack(currentTrack);
      streamRef.current.addTrack(newVideoTrack);
      
      setState(prev => ({ ...prev, stream: streamRef.current }));
    } catch (error) {
      console.error('Error switching camera:', error);
    }
  }, []);

  const attachToVideo = useCallback((videoElement: HTMLVideoElement | null) => {
    videoRef.current = videoElement;
    if (videoElement && streamRef.current) {
      videoElement.srcObject = streamRef.current;
      videoElement.play().catch(console.error);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  return {
    ...state,
    startStream,
    stopStream,
    toggleCamera,
    toggleMic,
    switchCamera,
    attachToVideo,
    videoRef,
  };
};
