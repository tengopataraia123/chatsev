import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

// Call state machine
export type CallStatus = 
  | 'idle'
  | 'requesting_media'
  | 'ready'
  | 'calling'
  | 'ringing'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'ended'
  | 'error';

export interface CallState {
  callId: string | null;
  callType: 'audio' | 'video' | null;
  status: CallStatus;
  remoteUserId: string | null;
  remoteStream: MediaStream | null;
  localStream: MediaStream | null;
  isMuted: boolean;
  isVideoOff: boolean;
  callDuration: number;
  networkQuality: 'good' | 'ok' | 'poor' | null;
  error: string | null;
  endReason: string | null;
}

// CRITICAL: Include TURN servers for NAT traversal
// Using Open Relay Project free TURN servers + Google STUN
const ICE_SERVERS: RTCIceServer[] = [
  // STUN servers
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun.relay.metered.ca:80' },
  // TURN servers (Open Relay - free public TURN)
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

const CALL_TIMEOUT_MS = 45000; // 45 seconds to answer
const ICE_RESTART_DELAY_MS = 3000;
const RECONNECTION_TIMEOUT_MS = 15000;

export function useWebRTCCall() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [state, setState] = useState<CallState>({
    callId: null,
    callType: null,
    status: 'idle',
    remoteUserId: null,
    remoteStream: null,
    localStream: null,
    isMuted: false,
    isVideoOff: false,
    callDuration: 0,
    networkQuality: null,
    error: null,
    endReason: null,
  });

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const callTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const callStartTimeRef = useRef<Date | null>(null);
  const currentCallIdRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);
  const makingOfferRef = useRef(false);
  const isPoliteRef = useRef(true); // For "perfect negotiation" pattern

  // Keep refs in sync
  useEffect(() => {
    currentCallIdRef.current = state.callId;
  }, [state.callId]);

  // Network quality monitoring
  const startNetworkQualityMonitoring = useCallback(() => {
    if (!peerConnectionRef.current) return;

    statsIntervalRef.current = setInterval(async () => {
      if (!peerConnectionRef.current) return;

      try {
        const stats = await peerConnectionRef.current.getStats();
        let packetsLost = 0;
        let packetsReceived = 0;
        let roundTripTime = 0;

        stats.forEach((report) => {
          if (report.type === 'inbound-rtp' && report.kind === 'audio') {
            packetsLost += report.packetsLost || 0;
            packetsReceived += report.packetsReceived || 0;
          }
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            roundTripTime = report.currentRoundTripTime || 0;
          }
        });

        const lossRate = packetsReceived > 0 ? packetsLost / (packetsLost + packetsReceived) : 0;

        let quality: 'good' | 'ok' | 'poor' = 'good';
        if (lossRate > 0.1 || roundTripTime > 0.3) {
          quality = 'poor';
        } else if (lossRate > 0.03 || roundTripTime > 0.15) {
          quality = 'ok';
        }

        if (isMountedRef.current) {
          setState(prev => ({ ...prev, networkQuality: quality }));
        }
      } catch (e) {
        // Stats not available
      }
    }, 3000);
  }, []);

  const stopNetworkQualityMonitoring = useCallback(() => {
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }
  }, []);

  // Cleanup function
  const cleanup = useCallback((reason?: string) => {
    console.log('[useWebRTCCall] Cleanup called, reason:', reason);

    // Clear all timeouts
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    
    stopNetworkQualityMonitoring();

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Stop local stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('[useWebRTCCall] Stopped local track:', track.kind);
      });
      localStreamRef.current = null;
    }

    // Clear remote stream
    remoteStreamRef.current = null;

    callStartTimeRef.current = null;
    currentCallIdRef.current = null;
    makingOfferRef.current = false;

    if (isMountedRef.current) {
      setState({
        callId: null,
        callType: null,
        status: 'idle',
        remoteUserId: null,
        remoteStream: null,
        localStream: null,
        isMuted: false,
        isVideoOff: false,
        callDuration: 0,
        networkQuality: null,
        error: null,
        endReason: reason || null,
      });
    }
  }, [stopNetworkQualityMonitoring]);

  // Send signal through Supabase
  const sendSignal = useCallback(async (
    callId: string,
    toUserId: string,
    signalType: string,
    signalData: any
  ) => {
    if (!user?.id) return;

    try {
      await supabase.from('call_signals').insert({
        call_id: callId,
        from_user_id: user.id,
        to_user_id: toUserId,
        signal_type: signalType,
        signal_data: signalData,
      });
      console.log('[useWebRTCCall] Signal sent:', signalType);
    } catch (e) {
      console.error('[useWebRTCCall] Error sending signal:', e);
    }
  }, [user?.id]);

  // Create peer connection with comprehensive handlers
  const createPeerConnection = useCallback((callId: string, remoteUserId: string) => {
    console.log('[useWebRTCCall] Creating peer connection');

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    const pc = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
    });

    // ICE candidate handling
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('[useWebRTCCall] ICE candidate:', event.candidate.type);
        sendSignal(callId, remoteUserId, 'ice-candidate', event.candidate.toJSON());
      }
    };

    pc.onicegatheringstatechange = () => {
      console.log('[useWebRTCCall] ICE gathering state:', pc.iceGatheringState);
    };

    // ICE connection state handling with reconnection logic
    pc.oniceconnectionstatechange = () => {
      console.log('[useWebRTCCall] ICE connection state:', pc.iceConnectionState);

      switch (pc.iceConnectionState) {
        case 'connected':
        case 'completed':
          // Clear any reconnection timeout
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }

          if (isMountedRef.current) {
            setState(prev => ({ ...prev, status: 'connected' }));
          }

          // Start call duration timer
          if (!callStartTimeRef.current) {
            callStartTimeRef.current = new Date();
            durationIntervalRef.current = setInterval(() => {
              if (callStartTimeRef.current && isMountedRef.current) {
                const duration = Math.floor((Date.now() - callStartTimeRef.current.getTime()) / 1000);
                setState(prev => ({ ...prev, callDuration: duration }));
              }
            }, 1000);
          }

          startNetworkQualityMonitoring();
          break;

        case 'disconnected':
          console.log('[useWebRTCCall] Disconnected - waiting before ICE restart');
          if (isMountedRef.current) {
            setState(prev => ({ ...prev, status: 'reconnecting' }));
          }

          // Wait before attempting ICE restart
          reconnectTimeoutRef.current = setTimeout(() => {
            if (pc.iceConnectionState === 'disconnected') {
              console.log('[useWebRTCCall] Still disconnected, restarting ICE');
              pc.restartIce();
            }
          }, ICE_RESTART_DELAY_MS);
          break;

        case 'failed':
          console.log('[useWebRTCCall] ICE failed - attempting restart');
          if (isMountedRef.current) {
            setState(prev => ({ ...prev, status: 'reconnecting' }));
          }
          
          // Attempt ICE restart
          pc.restartIce();

          // Set timeout for reconnection failure
          reconnectTimeoutRef.current = setTimeout(() => {
            if (pc.iceConnectionState === 'failed') {
              console.log('[useWebRTCCall] Reconnection failed, ending call');
              endCall('connection_failed');
            }
          }, RECONNECTION_TIMEOUT_MS);
          break;

        case 'closed':
          console.log('[useWebRTCCall] Connection closed');
          break;
      }
    };

    // Connection state (more reliable than ICE state)
    pc.onconnectionstatechange = () => {
      console.log('[useWebRTCCall] Connection state:', pc.connectionState);
      
      if (pc.connectionState === 'failed') {
        console.log('[useWebRTCCall] Connection failed completely');
        endCall('connection_failed');
      }
    };

    // Track handling
    pc.ontrack = (event) => {
      console.log('[useWebRTCCall] Received track:', event.track.kind, 'enabled:', event.track.enabled);

      if (event.streams && event.streams[0]) {
        const remoteStream = event.streams[0];
        remoteStreamRef.current = remoteStream;

        // Log all tracks
        console.log('[useWebRTCCall] Remote stream tracks:', 
          remoteStream.getTracks().map(t => `${t.kind}:${t.enabled}:${t.readyState}`)
        );

        // Handle track events for debugging
        event.track.onended = () => {
          console.log('[useWebRTCCall] Remote track ended:', event.track.kind);
        };
        event.track.onmute = () => {
          console.log('[useWebRTCCall] Remote track muted:', event.track.kind);
        };
        event.track.onunmute = () => {
          console.log('[useWebRTCCall] Remote track unmuted:', event.track.kind);
        };

        if (isMountedRef.current) {
          setState(prev => ({ ...prev, remoteStream }));
        }
      }
    };

    // Negotiation needed - use "perfect negotiation" pattern
    pc.onnegotiationneeded = async () => {
      console.log('[useWebRTCCall] Negotiation needed');
      
      try {
        makingOfferRef.current = true;
        await pc.setLocalDescription();
        
        sendSignal(callId, remoteUserId, 'offer', {
          sdp: pc.localDescription?.sdp,
          type: pc.localDescription?.type,
        });
      } catch (e) {
        console.error('[useWebRTCCall] Error in negotiation:', e);
      } finally {
        makingOfferRef.current = false;
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [sendSignal, startNetworkQualityMonitoring]);

  // End call
  const endCall = useCallback(async (reason: string = 'user_ended') => {
    const callIdToEnd = currentCallIdRef.current;
    console.log('[useWebRTCCall] Ending call:', callIdToEnd, 'reason:', reason);

    if (callIdToEnd) {
      const duration = callStartTimeRef.current
        ? Math.floor((Date.now() - callStartTimeRef.current.getTime()) / 1000)
        : 0;

      try {
        await supabase
          .from('calls')
          .update({
            status: 'ended',
            ended_at: new Date().toISOString(),
            duration_seconds: duration,
            end_reason: reason,
          })
          .eq('id', callIdToEnd);
      } catch (e) {
        console.error('[useWebRTCCall] Error updating call status:', e);
      }
    }

    cleanup(reason);

    if (reason !== 'remote_ended' && reason !== 'declined') {
      toast({ title: 'ზარი დასრულდა' });
    }
  }, [cleanup, toast]);

  // Set local stream (from device check or call start)
  const setLocalStream = useCallback((stream: MediaStream) => {
    console.log('[useWebRTCCall] Setting local stream:', stream.getTracks().map(t => `${t.kind}:${t.enabled}`));
    localStreamRef.current = stream;
    setState(prev => ({ ...prev, localStream: stream }));
  }, []);

  // Start a call
  const startCall = useCallback(async (
    targetUserId: string, 
    type: 'audio' | 'video',
    existingStream?: MediaStream
  ) => {
    if (!user?.id) return;

    try {
      console.log('[useWebRTCCall] Starting call to:', targetUserId, 'type:', type);
      
      setState(prev => ({ 
        ...prev, 
        status: 'requesting_media', 
        callType: type, 
        remoteUserId: targetUserId 
      }));

      // Use existing stream or request new one
      let stream = existingStream || localStreamRef.current;
      
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: type === 'video' ? { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } : false,
        });
      }

      localStreamRef.current = stream;
      setState(prev => ({ ...prev, localStream: stream, status: 'calling' }));

      // Check if we're already in a call
      const { data: myActiveCall } = await supabase
        .from('calls')
        .select('id')
        .or(`caller_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .in('status', ['active', 'ringing'])
        .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
        .maybeSingle();

      if (myActiveCall) {
        toast({ title: 'უკვე ხართ ზარში', variant: 'destructive' });
        cleanup();
        return;
      }

      // Create call record
      const { data: call, error } = await supabase
        .from('calls')
        .insert({
          caller_id: user.id,
          receiver_id: targetUserId,
          call_type: type,
          status: 'ringing',
        })
        .select()
        .single();

      if (error || !call) {
        throw new Error('Failed to create call');
      }

      console.log('[useWebRTCCall] Call created:', call.id);
      setState(prev => ({ ...prev, callId: call.id }));
      currentCallIdRef.current = call.id;

      // Create peer connection and add tracks
      const pc = createPeerConnection(call.id, targetUserId);

      stream.getTracks().forEach(track => {
        console.log('[useWebRTCCall] Adding track:', track.kind);
        pc.addTrack(track, stream);
      });

      // Create and send offer
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: type === 'video',
      });

      await pc.setLocalDescription(offer);
      await sendSignal(call.id, targetUserId, 'offer', { sdp: offer.sdp, type: offer.type });

      // Set call timeout
      callTimeoutRef.current = setTimeout(() => {
        if (state.status === 'calling') {
          console.log('[useWebRTCCall] Call timeout - no answer');
          supabase.from('calls').update({ status: 'missed' }).eq('id', call.id);
          cleanup('no_answer');
          toast({ title: 'პასუხი არ მოვიდა' });
        }
      }, CALL_TIMEOUT_MS);

    } catch (error: any) {
      console.error('[useWebRTCCall] Error starting call:', error);
      cleanup();
      toast({ 
        title: 'ზარის დაწყება ვერ მოხერხდა', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  }, [user?.id, createPeerConnection, sendSignal, cleanup, toast, state.status]);

  // Answer incoming call
  const answerCall = useCallback(async (
    callId: string, 
    callerId: string, 
    callType: 'audio' | 'video',
    existingStream?: MediaStream
  ) => {
    if (!user?.id) return;

    try {
      console.log('[useWebRTCCall] Answering call:', callId);
      
      setState(prev => ({ 
        ...prev, 
        status: 'connecting',
        callId,
        callType,
        remoteUserId: callerId,
      }));
      currentCallIdRef.current = callId;

      // Get or use existing stream
      let stream = existingStream || localStreamRef.current;
      
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: callType === 'video' ? { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } : false,
        });
      }

      localStreamRef.current = stream;
      setState(prev => ({ ...prev, localStream: stream }));

      // Update call status
      await supabase
        .from('calls')
        .update({ status: 'active', started_at: new Date().toISOString() })
        .eq('id', callId);

      // Set "polite" peer - answerer is polite
      isPoliteRef.current = true;

      // Create peer connection
      const pc = createPeerConnection(callId, callerId);

      // Add tracks
      stream.getTracks().forEach(track => {
        console.log('[useWebRTCCall] Adding track:', track.kind);
        pc.addTrack(track, stream);
      });

      // Get offer with retries
      let offerSignal = null;
      for (let attempt = 0; attempt < 10; attempt++) {
        const { data } = await supabase
          .from('call_signals')
          .select('*')
          .eq('call_id', callId)
          .eq('signal_type', 'offer')
          .eq('to_user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data) {
          offerSignal = data;
          break;
        }
        await new Promise(r => setTimeout(r, 200));
      }

      if (!offerSignal?.signal_data?.sdp) {
        throw new Error('Offer not found');
      }

      // Set remote description
      await pc.setRemoteDescription(new RTCSessionDescription({
        sdp: offerSignal.signal_data.sdp,
        type: offerSignal.signal_data.type,
      }));

      // Create and send answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await sendSignal(callId, callerId, 'answer', { sdp: answer.sdp, type: answer.type });

      // Process any pending ICE candidates
      const { data: iceCandidates } = await supabase
        .from('call_signals')
        .select('*')
        .eq('call_id', callId)
        .eq('signal_type', 'ice-candidate')
        .eq('to_user_id', user.id)
        .eq('processed', false);

      if (iceCandidates) {
        for (const ice of iceCandidates) {
          try {
            const iceData = ice.signal_data as { candidate?: string } | null;
            if (iceData?.candidate) {
              await pc.addIceCandidate(new RTCIceCandidate(iceData as RTCIceCandidateInit));
              await supabase.from('call_signals').update({ processed: true }).eq('id', ice.id);
            }
          } catch (e) {
            console.error('[useWebRTCCall] Error adding ICE candidate:', e);
          }
        }
      }

    } catch (error: any) {
      console.error('[useWebRTCCall] Error answering call:', error);
      cleanup();
      toast({ 
        title: 'ზარზე პასუხი ვერ მოხერხდა',
        variant: 'destructive' 
      });
    }
  }, [user?.id, createPeerConnection, sendSignal, cleanup, toast]);

  // Decline call
  const declineCall = useCallback(async (callId: string) => {
    console.log('[useWebRTCCall] Declining call:', callId);

    await supabase
      .from('calls')
      .update({ status: 'declined', ended_at: new Date().toISOString() })
      .eq('id', callId);

    cleanup('declined');
  }, [cleanup]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setState(prev => ({ ...prev, isMuted: !audioTrack.enabled }));
      }
    }
  }, []);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setState(prev => ({ ...prev, isVideoOff: !videoTrack.enabled }));
      }
    }
  }, []);

  // Replace video track (for camera switch)
  const replaceVideoTrack = useCallback(async (newTrack: MediaStreamTrack) => {
    if (!peerConnectionRef.current || !localStreamRef.current) return;

    const senders = peerConnectionRef.current.getSenders();
    const videoSender = senders.find(s => s.track?.kind === 'video');

    if (videoSender) {
      await videoSender.replaceTrack(newTrack);
    }

    // Update local stream
    const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
    if (oldVideoTrack) {
      localStreamRef.current.removeTrack(oldVideoTrack);
      oldVideoTrack.stop();
    }
    localStreamRef.current.addTrack(newTrack);

    setState(prev => ({ ...prev, localStream: localStreamRef.current }));
  }, []);

  // Listen for incoming calls
  useEffect(() => {
    if (!user?.id) return;
    isMountedRef.current = true;

    console.log('[useWebRTCCall] Setting up call listener for:', user.id);

    // Clean stale calls
    supabase
      .from('calls')
      .update({ status: 'ended', ended_at: new Date().toISOString(), end_reason: 'stale' })
      .or(`caller_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .in('status', ['active', 'ringing'])
      .lt('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());

    const channel = supabase
      .channel(`calls-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'calls', filter: `receiver_id=eq.${user.id}` },
        (payload) => {
          const call = payload.new as any;
          console.log('[useWebRTCCall] Incoming call:', call);

          const callAge = Date.now() - new Date(call.created_at).getTime();

          if (call.status === 'ringing' && callAge < 30000 && !currentCallIdRef.current) {
            setState(prev => ({
              ...prev,
              callId: call.id,
              callType: call.call_type,
              status: 'ringing',
              remoteUserId: call.caller_id,
            }));
          }
        }
      )
      .subscribe();

    return () => {
      isMountedRef.current = false;
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Listen for call updates and signals
  useEffect(() => {
    if (!user?.id || !state.callId) return;

    const callId = state.callId;
    console.log('[useWebRTCCall] Setting up signal listeners for call:', callId);

    // Call status updates
    const statusChannel = supabase
      .channel(`call-status-${callId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'calls', filter: `id=eq.${callId}` },
        (payload) => {
          const call = payload.new as any;
          console.log('[useWebRTCCall] Call update:', call.status);

          if (['declined', 'ended', 'missed'].includes(call.status)) {
            cleanup(call.status === 'declined' ? 'declined' : 'remote_ended');
            
            if (call.status === 'declined') {
              toast({ title: 'ზარი უარყოფილია' });
            }
          }
        }
      )
      .subscribe();

    // Signal handling
    const signalChannel = supabase
      .channel(`signals-${callId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'call_signals', filter: `to_user_id=eq.${user.id}` },
        async (payload) => {
          const signal = payload.new as any;
          if (signal.processed || signal.call_id !== callId) return;

          const pc = peerConnectionRef.current;
          if (!pc) return;

          console.log('[useWebRTCCall] Signal received:', signal.signal_type);

          try {
            if (signal.signal_type === 'offer') {
              // Handle offer (for renegotiation)
              const offerCollision = makingOfferRef.current || pc.signalingState !== 'stable';

              if (offerCollision && !isPoliteRef.current) {
                console.log('[useWebRTCCall] Ignoring colliding offer');
                return;
              }

              await pc.setRemoteDescription(new RTCSessionDescription(signal.signal_data));
              
              if (pc.signalingState === 'have-remote-offer') {
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                await sendSignal(callId, signal.from_user_id, 'answer', {
                  sdp: answer.sdp,
                  type: answer.type,
                });
              }
            } else if (signal.signal_type === 'answer') {
              if (pc.signalingState === 'have-local-offer') {
                await pc.setRemoteDescription(new RTCSessionDescription(signal.signal_data));
              }
            } else if (signal.signal_type === 'ice-candidate') {
              const iceData = signal.signal_data as { candidate?: string; sdpMid?: string; sdpMLineIndex?: number };
              if (pc.remoteDescription && iceData?.candidate) {
                await pc.addIceCandidate(new RTCIceCandidate(iceData as RTCIceCandidateInit));
              }
            }

            // Mark processed
            await supabase.from('call_signals').update({ processed: true }).eq('id', signal.id);
          } catch (e) {
            console.error('[useWebRTCCall] Error handling signal:', e);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(statusChannel);
      supabase.removeChannel(signalChannel);
    };
  }, [user?.id, state.callId, cleanup, sendSignal, toast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      cleanup();
    };
  }, [cleanup]);

  return {
    ...state,
    startCall,
    answerCall,
    declineCall,
    endCall,
    toggleMute,
    toggleVideo,
    setLocalStream,
    replaceVideoTrack,
  };
}
