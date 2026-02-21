import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PeerConnection {
  peerId: string;
  connection: RTCPeerConnection;
  stream?: MediaStream;
}

interface WebRTCState {
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;
  remoteStreams: Map<string, MediaStream>;
  viewerCount: number;
}

// Multiple STUN/TURN servers for robust international connectivity
const ICE_SERVERS = [
  // Google STUN servers
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  
  // Mozilla STUN
  { urls: 'stun:stun.services.mozilla.com' },
  
  // Public STUN servers
  { urls: 'stun:stun.stunprotocol.org:3478' },
  { urls: 'stun:stun.nextcloud.com:443' },
  
  // OpenRelay TURN servers (free, public)
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
  
  // Additional Metered TURN (free tier)
  {
    urls: 'turn:standard.relay.metered.ca:80',
    username: 'e8dd65c92f3d1bc0c1e3c6ad',
    credential: 'uBdTmjSs+sJDjXkU',
  },
  {
    urls: 'turn:standard.relay.metered.ca:443',
    username: 'e8dd65c92f3d1bc0c1e3c6ad',
    credential: 'uBdTmjSs+sJDjXkU',
  },
  {
    urls: 'turn:standard.relay.metered.ca:443?transport=tcp',
    username: 'e8dd65c92f3d1bc0c1e3c6ad',
    credential: 'uBdTmjSs+sJDjXkU',
  },
];

export const useWebRTC = (liveId: string | null, isHost: boolean) => {
  const { user } = useAuth();
  const [state, setState] = useState<WebRTCState>({
    isConnecting: false,
    isConnected: false,
    error: null,
    remoteStreams: new Map(),
    viewerCount: 0,
  });
  
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, PeerConnection>>(new Map());
  const signalChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isHostRef = useRef(isHost);
  
  // Keep isHost ref updated
  useEffect(() => {
    isHostRef.current = isHost;
  }, [isHost]);

  // Clean up old signals (only processed ones)
  const cleanupSignals = useCallback(async () => {
    if (!liveId) return;
    
    try {
      // Only clean up old processed signals, not all signals
      await supabase
        .from('webrtc_signals')
        .delete()
        .eq('live_id', liveId)
        .eq('processed', true);
    } catch (error) {
      console.error('Error cleaning up signals:', error);
    }
  }, [liveId]);

  // Create peer connection for a specific peer
  const createPeerConnection = useCallback((peerId: string): RTCPeerConnection => {
    console.log('[useWebRTC] Creating peer connection for:', peerId, 'isHost:', isHostRef.current);
    
    const pc = new RTCPeerConnection({ 
      iceServers: ICE_SERVERS,
      iceCandidatePoolSize: 10, // Pre-gather candidates for faster connection
    });
    
    // Handle ICE candidates - log relay candidates for debugging
    pc.onicecandidate = async (event) => {
      if (event.candidate && liveId && user?.id) {
        const candidate = event.candidate;
        const candidateType = candidate.type || 'unknown';
        const protocol = candidate.protocol || 'unknown';
        
        // Log TURN relay candidates (critical for international connections)
        if (candidateType === 'relay') {
          console.log('[useWebRTC] ✅ TURN relay candidate found:', protocol);
        } else {
          console.log('[useWebRTC] ICE candidate:', candidateType, protocol);
        }
        
        try {
          const candidateJson = event.candidate.toJSON();
          await supabase.from('webrtc_signals').insert([{
            live_id: liveId,
            from_user_id: user.id,
            to_user_id: peerId,
            signal_type: 'ice-candidate',
            signal_data: JSON.parse(JSON.stringify(candidateJson)),
          }]);
        } catch (error) {
          console.error('[useWebRTC] Error sending ICE candidate:', error);
        }
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log('[useWebRTC] Connection state:', pc.connectionState, 'for peer:', peerId);
      if (pc.connectionState === 'connected') {
        setState(prev => ({ ...prev, isConnected: true, isConnecting: false }));
        
        // Log connection stats to verify TURN usage
        pc.getStats().then(stats => {
          stats.forEach(report => {
            if (report.type === 'candidate-pair' && report.state === 'succeeded') {
              const localCandidate = stats.get(report.localCandidateId);
              const remoteCandidate = stats.get(report.remoteCandidateId);
              if (localCandidate?.candidateType === 'relay' || remoteCandidate?.candidateType === 'relay') {
                console.log('[useWebRTC] 🌍 Connected via TURN relay');
              } else {
                console.log('[useWebRTC] ⚡ Connected via P2P (direct)');
              }
            }
          });
        }).catch(() => {});
        
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected' || pc.connectionState === 'closed') {
        // Remove failed connection
        peerConnectionsRef.current.delete(peerId);
        setState(prev => {
          const newStreams = new Map(prev.remoteStreams);
          newStreams.delete(peerId);
          return { 
            ...prev, 
            remoteStreams: newStreams,
            viewerCount: Math.max(0, prev.viewerCount - 1),
            isConnected: newStreams.size > 0
          };
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[useWebRTC] ICE connection state:', pc.iceConnectionState, 'for peer:', peerId);
      
      // Attempt ICE restart on disconnection
      if (pc.iceConnectionState === 'disconnected') {
        console.log('[useWebRTC] Attempting ICE restart for peer:', peerId);
        setTimeout(() => {
          if (pc.iceConnectionState === 'disconnected') {
            pc.restartIce();
          }
        }, 2000);
      }
      
      // Handle failed ICE connection
      if (pc.iceConnectionState === 'failed') {
        console.log('[useWebRTC] ICE connection failed for peer:', peerId, 'attempting restart...');
        pc.restartIce();
      }
    };
    
    // Handle ICE gathering state
    pc.onicegatheringstatechange = () => {
      console.log('[useWebRTC] ICE gathering state:', pc.iceGatheringState, 'for peer:', peerId);
    };

    // Handle incoming streams (for viewers receiving from host)
    pc.ontrack = (event) => {
      console.log('Received remote track from:', peerId, 'streams:', event.streams.length);
      const [remoteStream] = event.streams;
      if (remoteStream) {
        console.log('Remote stream received with tracks:', remoteStream.getTracks().map(t => `${t.kind}:${t.enabled}`));
        setState(prev => {
          const newStreams = new Map(prev.remoteStreams);
          newStreams.set(peerId, remoteStream);
          return { ...prev, remoteStreams: newStreams, isConnected: true, isConnecting: false };
        });
      }
    };

    return pc;
  }, [liveId, user?.id]);

  // Host: Send offer to a viewer
  const sendOfferToViewer = useCallback(async (viewerId: string) => {
    if (!liveId || !user?.id) {
      console.log('Cannot send offer: missing liveId or user');
      return;
    }
    
    if (!localStreamRef.current) {
      console.log('Cannot send offer: no local stream available yet. Waiting...');
      // Wait for stream to be available
      let attempts = 0;
      const waitForStream = () => {
        return new Promise<void>((resolve) => {
          const checkStream = setInterval(() => {
            attempts++;
            if (localStreamRef.current || attempts > 10) {
              clearInterval(checkStream);
              resolve();
            }
          }, 500);
        });
      };
      await waitForStream();
      
      if (!localStreamRef.current) {
        console.log('Local stream still not available after waiting');
        return;
      }
    }

    console.log('[useWebRTC] Host sending offer to viewer:', viewerId);
    
    // Check if we already have a WORKING connection for this viewer
    const existingConnection = peerConnectionsRef.current.get(viewerId);
    if (existingConnection) {
      const state = existingConnection.connection.connectionState;
      const iceState = existingConnection.connection.iceConnectionState;
      console.log('[useWebRTC] Existing connection state:', state, 'ICE:', iceState);
      
      // Only skip if connection is actually working
      if (state === 'connected' || state === 'connecting') {
        console.log('[useWebRTC] Connection is working, skipping');
        return;
      }
      
      // Connection is broken, close it and create new one
      console.log('[useWebRTC] Connection is broken, recreating...');
      existingConnection.connection.close();
      peerConnectionsRef.current.delete(viewerId);
    }

    const pc = createPeerConnection(viewerId);
    
    // Add local tracks to the connection
    const tracks = localStreamRef.current.getTracks();
    console.log('Adding local tracks to connection:', tracks.map(t => `${t.kind}:${t.enabled}`));
    tracks.forEach(track => {
      pc.addTrack(track, localStreamRef.current!);
    });

    peerConnectionsRef.current.set(viewerId, { peerId: viewerId, connection: pc });

    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: false,
        offerToReceiveVideo: false,
      });
      await pc.setLocalDescription(offer);

      console.log('Sending offer SDP to viewer:', viewerId);
      await supabase.from('webrtc_signals').insert([{
        live_id: liveId,
        from_user_id: user.id,
        to_user_id: viewerId,
        signal_type: 'offer',
        signal_data: { sdp: offer.sdp, type: offer.type },
      }]);

      setState(prev => ({ ...prev, viewerCount: prev.viewerCount + 1 }));
    } catch (error) {
      console.error('Error sending offer:', error);
      peerConnectionsRef.current.delete(viewerId);
      setState(prev => ({ ...prev, error: 'Failed to send offer' }));
    }
  }, [liveId, user?.id, createPeerConnection]);

  // Viewer: Request to join the stream (with retry logic)
  const requestToJoin = useCallback(async (hostId: string, retryCount = 0) => {
    if (!liveId || !user?.id) {
      console.log('[useWebRTC] Cannot request to join: missing liveId or user');
      return;
    }

    const maxRetries = 3;
    console.log(`[useWebRTC] Viewer requesting to join stream from host: ${hostId} (attempt ${retryCount + 1}/${maxRetries + 1})`);
    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      // First, delete any old join requests from this user
      await supabase
        .from('webrtc_signals')
        .delete()
        .eq('live_id', liveId)
        .eq('from_user_id', user.id)
        .eq('signal_type', 'join-request');

      // Send a new join-request signal to the host
      const { error } = await supabase.from('webrtc_signals').insert([{
        live_id: liveId,
        from_user_id: user.id,
        to_user_id: hostId,
        signal_type: 'join-request',
        signal_data: { timestamp: Date.now(), attempt: retryCount + 1 },
        processed: false,
      }]);

      if (error) {
        console.error('[useWebRTC] Error sending join request:', error);
        throw error;
      }
      
      console.log('[useWebRTC] Join request sent successfully');
      
      // Set up timeout to retry if no offer received
      setTimeout(() => {
        // Check if we have a connection with host
        const hostConnection = peerConnectionsRef.current.get(hostId);
        const connectionState = hostConnection?.connection.connectionState;
        
        if (!hostConnection || (connectionState !== 'connected' && connectionState !== 'connecting')) {
          if (retryCount < maxRetries) {
            console.log('[useWebRTC] No connection established, retrying...');
            requestToJoin(hostId, retryCount + 1);
          } else {
            console.log('[useWebRTC] Max retries reached, connection failed');
            setState(prev => ({ ...prev, error: 'კავშირი ვერ შედგა', isConnecting: false }));
          }
        }
      }, 8000); // Wait 8 seconds before retry
      
    } catch (error) {
      console.error('[useWebRTC] Error requesting to join:', error);
      if (retryCount < maxRetries) {
        setTimeout(() => requestToJoin(hostId, retryCount + 1), 2000);
      } else {
        setState(prev => ({ ...prev, error: 'Failed to request join', isConnecting: false }));
      }
    }
  }, [liveId, user?.id]);

  // Viewer: Handle incoming offer from host
  const handleOffer = useCallback(async (fromUserId: string, offer: RTCSessionDescriptionInit) => {
    if (!liveId || !user?.id) return;

    console.log('Viewer handling offer from host:', fromUserId);

    // Close existing connection if any
    const existingPc = peerConnectionsRef.current.get(fromUserId);
    if (existingPc) {
      existingPc.connection.close();
      peerConnectionsRef.current.delete(fromUserId);
    }

    const pc = createPeerConnection(fromUserId);
    peerConnectionsRef.current.set(fromUserId, { peerId: fromUserId, connection: pc });

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      console.log('Sending answer to host:', fromUserId);
      await supabase.from('webrtc_signals').insert([{
        live_id: liveId,
        from_user_id: user.id,
        to_user_id: fromUserId,
        signal_type: 'answer',
        signal_data: { sdp: answer.sdp, type: answer.type },
      }]);

      setState(prev => ({ ...prev, isConnecting: false }));
    } catch (error) {
      console.error('Error handling offer:', error);
      peerConnectionsRef.current.delete(fromUserId);
      setState(prev => ({ ...prev, error: 'Failed to handle offer', isConnecting: false }));
    }
  }, [liveId, user?.id, createPeerConnection]);

  // Host: Handle incoming answer from viewer
  const handleAnswer = useCallback(async (fromUserId: string, answer: RTCSessionDescriptionInit) => {
    console.log('Host handling answer from viewer:', fromUserId);
    
    const peerConnection = peerConnectionsRef.current.get(fromUserId);
    if (peerConnection && peerConnection.connection.signalingState !== 'stable') {
      try {
        await peerConnection.connection.setRemoteDescription(new RTCSessionDescription(answer));
        console.log('Successfully set remote description for viewer:', fromUserId);
      } catch (error) {
        console.error('Error handling answer:', error);
      }
    } else {
      console.log('No peer connection found for viewer:', fromUserId, 'or already stable');
    }
  }, []);

  // Handle ICE candidate from peer
  const handleIceCandidate = useCallback(async (fromUserId: string, candidate: RTCIceCandidateInit) => {
    console.log('Handling ICE candidate from:', fromUserId);
    
    const peerConnection = peerConnectionsRef.current.get(fromUserId);
    if (peerConnection && peerConnection.connection.remoteDescription) {
      try {
        await peerConnection.connection.addIceCandidate(new RTCIceCandidate(candidate));
        console.log('Added ICE candidate from:', fromUserId);
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    } else {
      console.log('Skipping ICE candidate - no remote description yet for:', fromUserId);
    }
  }, []);

  // Set local stream
  const setLocalStream = useCallback((stream: MediaStream | null) => {
    localStreamRef.current = stream;
    console.log('Local stream set:', stream ? `${stream.getTracks().length} tracks` : 'null');
  }, []);

  // Start broadcasting (for host)
  const startBroadcasting = useCallback(async () => {
    if (!liveId || !user?.id) {
      console.log('Cannot start broadcasting: missing liveId or user');
      return;
    }

    console.log('Starting broadcast for live:', liveId, 'localStream:', !!localStreamRef.current);
    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    // Wait for local stream if not yet available
    if (!localStreamRef.current) {
      console.log('Waiting for local stream to be available...');
      let attempts = 0;
      while (!localStreamRef.current && attempts < 20) {
        await new Promise(resolve => setTimeout(resolve, 250));
        attempts++;
      }
      if (!localStreamRef.current) {
        console.log('Local stream not available after waiting');
      } else {
        console.log('Local stream now available');
      }
    }

    // Clean up old signals first
    await cleanupSignals();

    // Mark as connected immediately for host - they're broadcasting
    setState(prev => ({ ...prev, isConnecting: false, isConnected: true }));
    
    // Check for any pending join requests immediately and then poll
    const checkPendingRequests = async () => {
      try {
        const { data: pendingRequests, error } = await supabase
          .from('webrtc_signals')
          .select('*')
          .eq('live_id', liveId)
          .eq('signal_type', 'join-request')
          .eq('processed', false);
        
        if (error) {
          console.error('Error fetching pending requests:', error);
          return;
        }
        
        if (pendingRequests && pendingRequests.length > 0) {
          console.log('Found pending join requests:', pendingRequests.length);
          for (const req of pendingRequests) {
            console.log('Sending offer to viewer:', req.from_user_id);
            await sendOfferToViewer(req.from_user_id);
            await supabase
              .from('webrtc_signals')
              .update({ processed: true })
              .eq('id', req.id);
          }
        }
      } catch (error) {
        console.error('Error checking pending requests:', error);
      }
    };
    
    // Initial check
    await checkPendingRequests();
    
    // Poll for new requests every 2 seconds
    const pollInterval = setInterval(checkPendingRequests, 2000);
    
    // Store the interval for cleanup
    setTimeout(() => clearInterval(pollInterval), 60000); // Stop after 1 minute
  }, [liveId, user?.id, cleanupSignals, sendOfferToViewer]);

  // Connect to stream (for viewer)
  const connectToStream = useCallback(async (hostId: string) => {
    if (!liveId || !user?.id) {
      console.log('Cannot connect to stream: missing liveId or user');
      return;
    }

    console.log('Viewer connecting to stream from host:', hostId);
    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    // First, check for any existing unprocessed offers from the host
    try {
      const { data: existingOffers, error } = await supabase
        .from('webrtc_signals')
        .select('*')
        .eq('live_id', liveId)
        .eq('to_user_id', user.id)
        .eq('from_user_id', hostId)
        .eq('signal_type', 'offer')
        .eq('processed', false)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (error) {
        console.error('Error fetching existing offers:', error);
      } else if (existingOffers && existingOffers.length > 0) {
        const offer = existingOffers[0];
        const signalData = offer.signal_data as { sdp?: string; type?: RTCSdpType } | null;
        if (signalData?.sdp && signalData?.type) {
          console.log('Found existing offer from host, processing...');
          await handleOffer(hostId, signalData as RTCSessionDescriptionInit);
          await supabase
            .from('webrtc_signals')
            .update({ processed: true })
            .eq('id', offer.id);
          return;
        }
      }
    } catch (error) {
      console.error('Error checking for existing offers:', error);
    }

    // Send join request
    await requestToJoin(hostId);
  }, [liveId, user?.id, requestToJoin, handleOffer]);

  // Stop all connections
  const stopBroadcasting = useCallback(() => {
    console.log('Stopping broadcast...');
    
    peerConnectionsRef.current.forEach(({ connection }) => {
      connection.close();
    });
    peerConnectionsRef.current.clear();

    if (signalChannelRef.current) {
      supabase.removeChannel(signalChannelRef.current);
      signalChannelRef.current = null;
    }

    setState({
      isConnecting: false,
      isConnected: false,
      error: null,
      remoteStreams: new Map(),
      viewerCount: 0,
    });
  }, []);

  // Subscribe to signals
  useEffect(() => {
    if (!liveId || !user?.id) return;

    console.log('[useWebRTC] Setting up signal subscription for live:', liveId, 'user:', user.id, 'isHost:', isHost);

    // Poll for signals as backup (Realtime can be slow)
    const pollSignals = async () => {
      try {
        const { data: signals } = await supabase
          .from('webrtc_signals')
          .select('*')
          .eq('live_id', liveId)
          .eq('to_user_id', user.id)
          .eq('processed', false)
          .order('created_at', { ascending: true });

        if (signals && signals.length > 0) {
          console.log('[useWebRTC] Polling found', signals.length, 'signals');
          for (const signal of signals) {
            console.log('[useWebRTC] Processing signal:', signal.signal_type, 'from:', signal.from_user_id);
            await processSignal(signal);
          }
        }
      } catch (error) {
        console.error('[useWebRTC] Error polling signals:', error);
      }
    };

    const processSignal = async (signal: any) => {
      if (signal.processed) return;
      
      console.log('[useWebRTC] Processing signal:', signal.signal_type, 'from:', signal.from_user_id, 'isHost:', isHostRef.current);

      // Mark as processed FIRST to prevent duplicate processing
      try {
        await supabase
          .from('webrtc_signals')
          .update({ processed: true })
          .eq('id', signal.id);
      } catch (err) {
        console.error('[useWebRTC] Error marking signal as processed:', err);
      }

      try {
        if (signal.signal_type === 'join-request' && isHostRef.current) {
          console.log('[useWebRTC] Host received join request from viewer:', signal.from_user_id);
          // Send offer to the viewer
          await sendOfferToViewer(signal.from_user_id);
        } else if (signal.signal_type === 'offer' && !isHostRef.current) {
          if (signal.signal_data?.sdp) {
            console.log('[useWebRTC] Viewer received offer from host:', signal.from_user_id);
            await handleOffer(signal.from_user_id, signal.signal_data);
          }
        } else if (signal.signal_type === 'answer' && isHostRef.current) {
          console.log('[useWebRTC] Host received answer from viewer:', signal.from_user_id);
          await handleAnswer(signal.from_user_id, signal.signal_data);
        } else if (signal.signal_type === 'ice-candidate') {
          console.log('[useWebRTC] Received ICE candidate from:', signal.from_user_id);
          await handleIceCandidate(signal.from_user_id, signal.signal_data);
        }
      } catch (error) {
        console.error('[useWebRTC] Error processing signal:', error);
      }
    };

    // Initial poll immediately
    pollSignals();
    
    // Poll frequently for faster response
    setTimeout(pollSignals, 500);
    setTimeout(pollSignals, 1000);
    setTimeout(pollSignals, 2000);

    // Poll every 2 seconds as backup
    const pollInterval = setInterval(pollSignals, 2000);

    const channel = supabase
      .channel(`webrtc-signals-${liveId}-${user.id}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'webrtc_signals',
          filter: `live_id=eq.${liveId}`,
        },
        async (payload) => {
          const signal = payload.new as any;
          // Only process signals meant for this user
          if (signal.to_user_id !== user.id) return;
          console.log('[useWebRTC] Realtime signal received:', signal.signal_type);
          await processSignal(signal);
        }
      )
      .subscribe((status) => {
        console.log('[useWebRTC] WebRTC signal channel status:', status);
      });

    signalChannelRef.current = channel;

    return () => {
      console.log('[useWebRTC] Cleaning up WebRTC signal channel');
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [liveId, user?.id, isHost, sendOfferToViewer, handleOffer, handleAnswer, handleIceCandidate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopBroadcasting();
    };
  }, [stopBroadcasting]);

  return {
    ...state,
    setLocalStream,
    startBroadcasting,
    connectToStream,
    stopBroadcasting,
    sendOfferToViewer,
  };
};
