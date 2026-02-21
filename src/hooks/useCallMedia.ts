import { useState, useRef, useCallback, useEffect } from 'react';

export interface MediaDeviceInfo {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput' | 'videoinput';
}

export interface MediaState {
  stream: MediaStream | null;
  error: string | null;
  errorCode: 'permission_denied' | 'not_found' | 'in_use' | 'unknown' | null;
  isLoading: boolean;
  isCameraOn: boolean;
  isMicOn: boolean;
  audioLevel: number;
  devices: {
    cameras: MediaDeviceInfo[];
    microphones: MediaDeviceInfo[];
    speakers: MediaDeviceInfo[];
  };
  selectedDevices: {
    camera: string | null;
    microphone: string | null;
    speaker: string | null;
  };
  permissionState: {
    camera: PermissionState | null;
    microphone: PermissionState | null;
  };
}

const initialState: MediaState = {
  stream: null,
  error: null,
  errorCode: null,
  isLoading: false,
  isCameraOn: false,
  isMicOn: false,
  audioLevel: 0,
  devices: {
    cameras: [],
    microphones: [],
    speakers: [],
  },
  selectedDevices: {
    camera: null,
    microphone: null,
    speaker: null,
  },
  permissionState: {
    camera: null,
    microphone: null,
  },
};

// Error messages in Georgian
const ERROR_MESSAGES = {
  permission_denied: 'კამერა/მიკროფონის ნებართვა უარყოფილია. გთხოვთ, დართოთ ნება ბრაუზერის პარამეტრებში.',
  not_found: 'კამერა ან მიკროფონი ვერ მოიძებნა.',
  in_use: 'კამერა ან მიკროფონი სხვა აპლიკაციის მიერ გამოიყენება.',
  unknown: 'მედია მოწყობილობებზე წვდომა ვერ მოხერხდა.',
};

export function useCallMedia() {
  const [state, setState] = useState<MediaState>(initialState);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioLevelIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check permissions
  const checkPermissions = useCallback(async () => {
    try {
      const [cameraPermission, micPermission] = await Promise.all([
        navigator.permissions?.query({ name: 'camera' as PermissionName }).catch(() => null),
        navigator.permissions?.query({ name: 'microphone' as PermissionName }).catch(() => null),
      ]);

      setState(prev => ({
        ...prev,
        permissionState: {
          camera: cameraPermission?.state || null,
          microphone: micPermission?.state || null,
        },
      }));
    } catch (e) {
      console.log('[useCallMedia] Permissions API not available');
    }
  }, []);

  // Enumerate devices
  const enumerateDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const cameras = devices
        .filter(d => d.kind === 'videoinput')
        .map(d => ({ deviceId: d.deviceId, label: d.label || `კამერა ${d.deviceId.slice(0, 4)}`, kind: d.kind as 'videoinput' }));
      
      const microphones = devices
        .filter(d => d.kind === 'audioinput')
        .map(d => ({ deviceId: d.deviceId, label: d.label || `მიკროფონი ${d.deviceId.slice(0, 4)}`, kind: d.kind as 'audioinput' }));
      
      const speakers = devices
        .filter(d => d.kind === 'audiooutput')
        .map(d => ({ deviceId: d.deviceId, label: d.label || `დინამიკი ${d.deviceId.slice(0, 4)}`, kind: d.kind as 'audiooutput' }));

      setState(prev => ({
        ...prev,
        devices: { cameras, microphones, speakers },
      }));

      return { cameras, microphones, speakers };
    } catch (e) {
      console.error('[useCallMedia] Error enumerating devices:', e);
      return { cameras: [], microphones: [], speakers: [] };
    }
  }, []);

  // Start audio level monitoring
  const startAudioLevelMonitoring = useCallback((stream: MediaStream) => {
    try {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }

      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

      audioLevelIntervalRef.current = setInterval(() => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          const normalizedLevel = Math.min(100, (average / 128) * 100);
          setState(prev => ({ ...prev, audioLevel: normalizedLevel }));
        }
      }, 100);
    } catch (e) {
      console.error('[useCallMedia] Error starting audio level monitoring:', e);
    }
  }, []);

  // Stop audio level monitoring
  const stopAudioLevelMonitoring = useCallback(() => {
    if (audioLevelIntervalRef.current) {
      clearInterval(audioLevelIntervalRef.current);
      audioLevelIntervalRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setState(prev => ({ ...prev, audioLevel: 0 }));
  }, []);

  // Get media with robust fallback
  const getMedia = useCallback(async (
    video: boolean = true, 
    audio: boolean = true,
    videoDeviceId?: string,
    audioDeviceId?: string
  ): Promise<MediaStream | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: null, errorCode: null }));

    // Build constraints with fallbacks
    const buildConstraints = (useIdeal: boolean): MediaStreamConstraints => ({
      audio: audio ? {
        deviceId: audioDeviceId ? { exact: audioDeviceId } : undefined,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: useIdeal ? { ideal: 48000 } : undefined,
      } : false,
      video: video ? {
        deviceId: videoDeviceId ? { exact: videoDeviceId } : undefined,
        facingMode: 'user',
        width: useIdeal ? { ideal: 1280, max: 1920 } : { ideal: 640 },
        height: useIdeal ? { ideal: 720, max: 1080 } : { ideal: 480 },
        frameRate: useIdeal ? { ideal: 30, max: 30 } : { ideal: 15 },
      } : false,
    });

    try {
      // Try with ideal constraints first
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(buildConstraints(true));
      } catch (e) {
        console.log('[useCallMedia] Ideal constraints failed, trying relaxed...');
        // Fallback to relaxed constraints
        try {
          stream = await navigator.mediaDevices.getUserMedia(buildConstraints(false));
        } catch (e2) {
          // If video fails, try audio only
          if (video) {
            console.log('[useCallMedia] Video failed, trying audio only...');
            stream = await navigator.mediaDevices.getUserMedia({ 
              audio: audio ? { echoCancellation: true, noiseSuppression: true } : false,
              video: false 
            });
            setState(prev => ({ 
              ...prev, 
              error: 'კამერა ვერ ჩაირთო — ვცდით აუდიო ზარს',
              isCameraOn: false,
            }));
          } else {
            throw e2;
          }
        }
      }

      streamRef.current = stream;
      
      const hasVideo = stream.getVideoTracks().length > 0;
      const hasAudio = stream.getAudioTracks().length > 0;

      setState(prev => ({
        ...prev,
        stream,
        isLoading: false,
        isCameraOn: hasVideo,
        isMicOn: hasAudio,
        selectedDevices: {
          ...prev.selectedDevices,
          camera: hasVideo ? (videoDeviceId || stream.getVideoTracks()[0]?.getSettings()?.deviceId || null) : null,
          microphone: hasAudio ? (audioDeviceId || stream.getAudioTracks()[0]?.getSettings()?.deviceId || null) : null,
        },
      }));

      // Start audio level monitoring
      if (hasAudio) {
        startAudioLevelMonitoring(stream);
      }

      // Re-enumerate to get device labels
      await enumerateDevices();

      console.log('[useCallMedia] Got stream:', stream.getTracks().map(t => `${t.kind}:${t.enabled}`));
      return stream;
    } catch (error: any) {
      console.error('[useCallMedia] Error getting media:', error);

      let errorCode: MediaState['errorCode'] = 'unknown';
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorCode = 'permission_denied';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorCode = 'not_found';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorCode = 'in_use';
      }

      setState(prev => ({
        ...prev,
        stream: null,
        error: ERROR_MESSAGES[errorCode],
        errorCode,
        isLoading: false,
        isCameraOn: false,
        isMicOn: false,
      }));

      return null;
    }
  }, [enumerateDevices, startAudioLevelMonitoring]);

  // Stop media
  const stopMedia = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('[useCallMedia] Stopped track:', track.kind);
      });
      streamRef.current = null;
    }

    stopAudioLevelMonitoring();

    setState(prev => ({
      ...prev,
      stream: null,
      isCameraOn: false,
      isMicOn: false,
    }));
  }, [stopAudioLevelMonitoring]);

  // Toggle camera
  const toggleCamera = useCallback(async () => {
    if (!streamRef.current) return;

    const videoTracks = streamRef.current.getVideoTracks();
    
    if (videoTracks.length > 0) {
      const enabled = !videoTracks[0].enabled;
      videoTracks.forEach(track => track.enabled = enabled);
      setState(prev => ({ ...prev, isCameraOn: enabled }));
    }
  }, []);

  // Toggle mic
  const toggleMic = useCallback(() => {
    if (!streamRef.current) return;

    const audioTracks = streamRef.current.getAudioTracks();
    if (audioTracks.length > 0) {
      const enabled = !audioTracks[0].enabled;
      audioTracks.forEach(track => track.enabled = enabled);
      setState(prev => ({ ...prev, isMicOn: enabled }));
    }
  }, []);

  // Switch camera (front/back on mobile)
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
      console.error('[useCallMedia] Error switching camera:', error);
    }
  }, []);

  // Select specific device
  const selectDevice = useCallback(async (kind: 'camera' | 'microphone' | 'speaker', deviceId: string) => {
    if (kind === 'speaker') {
      setState(prev => ({
        ...prev,
        selectedDevices: { ...prev.selectedDevices, speaker: deviceId },
      }));
      return;
    }

    // For camera/mic, we need to restart the stream with new device
    const currentStream = streamRef.current;
    if (!currentStream) return;

    const hasVideo = currentStream.getVideoTracks().length > 0;
    const hasAudio = currentStream.getAudioTracks().length > 0;

    // Stop current stream
    stopMedia();

    // Get new stream with selected device
    await getMedia(
      hasVideo,
      hasAudio,
      kind === 'camera' ? deviceId : state.selectedDevices.camera || undefined,
      kind === 'microphone' ? deviceId : state.selectedDevices.microphone || undefined
    );
  }, [getMedia, stopMedia, state.selectedDevices]);

  // Play test tone
  const playTestTone = useCallback((speakerDeviceId?: string) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.connect(gain);
      gain.connect(ctx.destination);

      oscillator.frequency.value = 440; // A4 note
      oscillator.type = 'sine';
      
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.1);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);

      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.5);

      setTimeout(() => ctx.close(), 600);
    } catch (e) {
      console.error('[useCallMedia] Error playing test tone:', e);
    }
  }, []);

  // Set audio output device on an element
  const setAudioOutput = useCallback(async (element: HTMLMediaElement, deviceId: string) => {
    if ('setSinkId' in element) {
      try {
        await (element as any).setSinkId(deviceId);
        console.log('[useCallMedia] Audio output set to:', deviceId);
      } catch (e) {
        console.error('[useCallMedia] Error setting audio output:', e);
      }
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    checkPermissions();
    enumerateDevices();

    // Listen for device changes
    const handleDeviceChange = () => {
      enumerateDevices();
    };

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);

    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
      stopMedia();
    };
  }, [checkPermissions, enumerateDevices, stopMedia]);

  return {
    ...state,
    getMedia,
    stopMedia,
    toggleCamera,
    toggleMic,
    switchCamera,
    selectDevice,
    playTestTone,
    setAudioOutput,
    checkPermissions,
    enumerateDevices,
  };
}
