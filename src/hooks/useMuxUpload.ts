import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UploadState {
  isUploading: boolean;
  progress: number;
  status: 'idle' | 'preparing' | 'uploading' | 'processing' | 'ready' | 'error';
  videoId: string | null;
  uploadId: string | null;
  playbackId: string | null;
  error: string | null;
}

export function useMuxUpload() {
  const { toast } = useToast();
  const [state, setState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    status: 'idle',
    videoId: null,
    uploadId: null,
    playbackId: null,
    error: null,
  });
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const createUpload = useCallback(async (
    file: File,
    title: string,
    description: string = ''
  ) => {
    try {
      setState(prev => ({ 
        ...prev, 
        isUploading: true, 
        progress: 0, 
        status: 'preparing',
        error: null 
      }));

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('გაიარეთ ავტორიზაცია');
      }

      // Get upload URL from edge function
      const { data, error } = await supabase.functions.invoke('mux-video', {
        body: {
          action: 'create-upload',
          userId: user.id,
          title,
          description,
        },
      });

      if (error) throw error;

      const { uploadUrl, uploadId, videoId } = data;

      setState(prev => ({ 
        ...prev, 
        uploadId, 
        videoId,
        status: 'uploading' 
      }));

      // Upload file directly to Mux
      abortControllerRef.current = new AbortController();
      
      await uploadToMux(file, uploadUrl, (progress) => {
        setState(prev => ({ ...prev, progress }));
      }, abortControllerRef.current.signal);

      setState(prev => ({ ...prev, progress: 100, status: 'processing' }));

      // Start polling for processing status
      pollForReady(uploadId);

      return { videoId, uploadId };
    } catch (error: any) {
      console.error('Upload error:', error);
      setState(prev => ({ 
        ...prev, 
        isUploading: false, 
        status: 'error',
        error: error.message 
      }));
      toast({
        title: 'ატვირთვის შეცდომა',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  }, [toast]);

  const uploadToMux = async (
    file: File,
    uploadUrl: string,
    onProgress: (progress: number) => void,
    signal: AbortSignal
  ) => {
    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload cancelled'));
      });

      signal.addEventListener('abort', () => {
        xhr.abort();
      });

      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });
  };

  const pollForReady = useCallback((uploadId: string) => {
    let attempts = 0;
    const maxAttempts = 120; // 10 minutes max

    pollIntervalRef.current = setInterval(async () => {
      attempts++;
      
      if (attempts > maxAttempts) {
        clearInterval(pollIntervalRef.current!);
        setState(prev => ({ 
          ...prev, 
          isUploading: false,
          status: 'error',
          error: 'Processing timeout' 
        }));
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('mux-video', {
          body: {
            action: 'check-upload-status',
            uploadId,
          },
        });

        if (error) throw error;

        if (data.status === 'ready') {
          clearInterval(pollIntervalRef.current!);
          setState(prev => ({ 
            ...prev, 
            isUploading: false,
            status: 'ready',
            playbackId: data.playbackId,
          }));
          toast({
            title: 'ვიდეო მზადაა!',
            description: 'თქვენი ვიდეო წარმატებით დამუშავდა',
          });
        } else if (data.status === 'errored') {
          clearInterval(pollIntervalRef.current!);
          setState(prev => ({ 
            ...prev, 
            isUploading: false,
            status: 'error',
            error: 'Video processing failed' 
          }));
        }
      } catch (error) {
        console.error('Status check error:', error);
      }
    }, 5000); // Check every 5 seconds
  }, [toast]);

  const cancelUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    setState({
      isUploading: false,
      progress: 0,
      status: 'idle',
      videoId: null,
      uploadId: null,
      playbackId: null,
      error: null,
    });
  }, []);

  const reset = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    setState({
      isUploading: false,
      progress: 0,
      status: 'idle',
      videoId: null,
      uploadId: null,
      playbackId: null,
      error: null,
    });
  }, []);

  return {
    ...state,
    createUpload,
    cancelUpload,
    reset,
  };
}
