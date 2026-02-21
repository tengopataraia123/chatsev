/**
 * Voice recording hook for messenger - WhatsApp-like logic
 * - Cancel: stops recording, discards audio
 * - Send: stops recording, returns audio blob for immediate upload
 */
import { useState, useRef, useCallback } from 'react';

interface VoiceRecorderState {
  isRecording: boolean;
  duration: number;
  error: string | null;
}

interface VoiceRecorderResult {
  blob: Blob;
  duration: number;
}

export function useVoiceRecorder() {
  const [state, setState] = useState<VoiceRecorderState>({
    isRecording: false,
    duration: 0,
    error: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const resolveRef = useRef<((result: VoiceRecorderResult | null) => void) | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  }, []);

  const startRecording = useCallback(async () => {
    try {
      // Reset state
      chunksRef.current = [];
      setState(prev => ({ ...prev, error: null, duration: 0 }));

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });
      streamRef.current = stream;

      // Create MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      // Start recording
      mediaRecorder.start(100);
      startTimeRef.current = Date.now();
      setState(prev => ({ ...prev, isRecording: true }));

      // Update duration every second
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setState(prev => ({ ...prev, duration: elapsed }));
      }, 1000);

    } catch (err: any) {
      console.error('Voice recording error:', err);
      setState(prev => ({
        ...prev,
        error: err.name === 'NotAllowedError' 
          ? 'მიკროფონზე წვდომა არ არის ნებადართული'
          : 'ჩაწერის შეცდომა',
        isRecording: false,
      }));
    }
  }, []);

  // Stop recording and return the audio blob (for sending)
  const stopAndSend = useCallback((): Promise<VoiceRecorderResult | null> => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;
      
      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        cleanup();
        setState(prev => ({ ...prev, isRecording: false }));
        resolve(null);
        return;
      }

      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const mimeType = mediaRecorder.mimeType;

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        cleanup();
        setState(prev => ({ ...prev, isRecording: false, duration: 0 }));
        
        // Return blob only if we have data
        if (blob.size > 0 && duration > 0) {
          resolve({ blob, duration });
        } else {
          resolve(null);
        }
      };

      mediaRecorder.stop();
    });
  }, [cleanup]);

  // Cancel recording without sending
  const cancelRecording = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current;
    
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      // Set onstop to empty to prevent any processing
      mediaRecorder.onstop = () => {};
      mediaRecorder.stop();
    }
    
    cleanup();
    chunksRef.current = [];
    
    setState({
      isRecording: false,
      duration: 0,
      error: null,
    });
  }, [cleanup]);

  return {
    isRecording: state.isRecording,
    duration: state.duration,
    error: state.error,
    startRecording,
    stopAndSend,
    cancelRecording,
  };
}
