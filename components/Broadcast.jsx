import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import OnAirIndicator from '@/components/OnAirIndicator';
import AudioLevelMeter from '@/components/AudioLevelMeter';
import ListenerCountBadge from '@/components/ListenerCountBadge';
import { Mic, MicOff, ArrowLeft, RefreshCcw, Monitor, Radio, BarChart3, Settings, Wifi, Clock, Users, Signal, Activity, Globe, Headphones, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getBroadcastInfoRequest } from '@/http/agoraHttp';
import { generateToken } from '@/utils/generateToken';
import Pusher from 'pusher-js';
import { pushMessage } from '@/services/PusherService';
import Dialog from './Dialog';
import { useChannel } from '@/context/ChannelContext';
import { useParams, useRouter } from 'next/navigation';
import { flagsMapping, languages } from '@/constants/flagsMapping';
import { StartCaption, StopCaption, getRTMPUrl } from '@/services/CaptionService';
import { usePrototype } from '@/hooks/usePrototype';
import { LanguageBotMap, codeToLanguage, defaultData, interpreters, ttsProviders } from '@/constants/captionUIDs';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { Input } from './ui/input';

// Async Agora SDK loader
const loadAgoraSDK = async () => {
  if (typeof window === 'undefined') return null;

  try {
    const AgoraRTC = await import('agora-rtc-sdk-ng');
    return AgoraRTC.default;
  } catch (error) {
    console.error('Failed to load Agora SDK:', error);
    throw error;
  }
};


const voices = {
  "italian": {
    "cartesia": [
      {
        "name": "Marco - Friendly Conversationalist",
        "id": "79693aee-1207-4771-a01e-20c393c89e6f",
        "gender": "Male"
      },
      {
        "name": "Alessandra - Melodic Guide",
        "id": "0e21713a-5e9a-428a-bed4-90d410b87f13",
        "gender": "Female"
      }
    ],
    "smallest": [
      {
        "name": "felix",
        "id": "felix",
        "gender": "Male"
      }
    ],
    "deepgram": [
      {
        "name": "Asteria",
        "id": "aura-asteria-en",
        "gender": "Female"
      },
      {
        "name": "Orpheus",
        "id": "aura-orpheus-en",
        "gender": "Male"
      }
    ],
    "elevenlabs": [
      {
        "name": "Daniel",
        "id": "o0wsljCf8AntveHvChcv",
        "gender": "Male"
      },
      {
        "name": "Lily",
        "id": "Dzlw1nIlAqiOOW6J7qo1",
        "gender": "Female"
      }
    ]
  },
  "russian": {
    "cartesia": [
      {
        "name": "Natalya - Soothing Guide",
        "id": "779673f3-895f-4935-b6b5-b031dc78b319",
        "gender": "Female"
      },
      {
        "name": "Sergei - Expressive Narrator",
        "id": "da05e96d-ca10-4220-9042-d8acef654fa9",
        "gender": "Male"
      }
    ],
    "smallest": [
      {
        "name": "felix",
        "id": "felix",
        "gender": "Male"
      }
    ],
    "deepgram": [
      {
        "name": "Asteria",
        "id": "aura-asteria-en",
        "gender": "Female"
      },
      {
        "name": "Orpheus",
        "id": "aura-orpheus-en",
        "gender": "Male"
      }
    ],
    "elevenlabs": [
      {
        "name": "Daniel",
        "id": "VwRq6NLQB8AqRusa9F9t",
        "gender": "Male"
      },
      {
        "name": "Lily",
        "id": "Xb7hH8MSUJpSbSDYk0k2",
        "gender": "Female"
      }
    ]
  },
  "english": {
    "cartesia": [
      {
        "name": "Linda - Conversational Guide",
        "id": "829ccd10-f8b3-43cd-b8a0-4aeaa81f3b30",
        "gender": "Female"
      },
      {
        "name": "Matteo - Gentle Narrator",
        "id": "a0e99841-438c-4a64-b679-ae501e7d6091",
        "gender": "Male"
      }
    ],
    "smallest": [
      {
        "name": "felix",
        "id": "felix",
        "gender": "Male"
      }
    ],
    "deepgram": [
      {
        "name": "Asteria",
        "id": "aura-asteria-en",
        "gender": "Female"
      },
      {
        "name": "Orpheus",
        "id": "aura-orpheus-en",
        "gender": "Male"
      }
    ],
    "elevenlabs": [
      {
        "name": "Jim Narrator",
        "id": "Tx7VLgfksXHVnoY6jDGU",
        "gender": "Male"
      },
      {
        "name": "Hope - upbeat and clear",
        "id": "	FGY2WhTYpPnrIDTdsKH5",
        "gender": "Female"
      }
    ]
  }
}

const Broadcast = () => {
  const params = useParams();
  let { language: languageParam } = params;
  languageParam = languageParam == "translate" ? "english" : languageParam;
  // Loading state for async components
  const [isSDKLoading, setIsSDKLoading] = useState(true);
  const [sdkError, setSDKError] = useState(null);
  const [AgoraRTC, setAgoraRTC] = useState(null);
  const [broadcasterCount, setBroadcasterCount] = useState(0);
  const [openRequestToHandoverPopup, setOpenRequestToHandoverPopup] = useState(false);
  const [waitingForResponseToHandoverRquestPopup, setWaitingForResponseToHandoverRquestPopup] = useState(false);
  const [handoverRequestResponse, setHandoverRequestResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [firstLoad, setFirstLoad] = useState(true);
  const [language, setParamsLanguage] = useState(languageParam);
  const hostUidRef = useRef(null);


  const websocketRefs = useRef({});
  const router = useRouter();
  const langRef = useRef(language);



  useEffect(() => {
    window.document.title = `Broadcaster - ${language}`;
  }, [language]);



  const [ttsService, setTTSService] = useState('elevenlabs');
  const [voiceGender, setVoiceGender] = useState('Male');
  const [apiKey, setApiKey] = useState('');

  const connectToInterpreter = async (language) => {
    const { url: rtmpUrl } = await getRTMPUrl(channelName, language);
    const voice = voices[language][ttsService]?.find(voice => voice.gender.toLowerCase() === voiceGender.toLowerCase());
    const ws = new WebSocket(`${process.env.NEXT_PUBLIC_INTERPRETER_SERVER}/interpreter?language=${language}&rtmpUrl=${rtmpUrl}&ttsService=${ttsService}&apiKey=${apiKey}&voice=${voice?.id}`);

    ws.onopen = () => {
      console.log("Interpreter connected");
    };
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type == "ping") {
        console.log("ping received");
        ws.send(JSON.stringify({ type: 'pong' }));
      }
    };
    ws.onclose = () => {
      console.log("Interpreter disconnected");
    };
    ws.onerror = (event) => {
      console.log("Interpreter error", event);
    };
    websocketRefs.current[language] = ws;
  }


  useEffect(() => {
    setTimeout(() => {
      setFirstLoad(false);
    }, 3000);
  }, []);




  // Basic state
  const [isLive, setIsLive] = useState(false);
  const [isMicConnected, setIsMicConnected] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [listenerCount, setListenerCount] = useState(0);
  const [streamDuration, setStreamDuration] = useState(0);
  const [localAudioTrack, setLocalAudioTrack] = useState(null);
  const [client, setClient] = useState(null);

  // Enhanced monitoring state
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [networkQuality, setNetworkQuality] = useState('good');
  const [sessionId, setSessionId] = useState(null);
  const [connectionError, setConnectionError] = useState(null);

  // Refs for cleanup
  const isComponentMountedRef = useRef(true);
  const reconnectTimeoutRef = useRef(null);
  const streamStartTimeRef = useRef(null);
  const isLiveRef = useRef(false);
  const maxReconnectAttempts = 8;
  const { channelName, setLanguage } = useChannel();
  const protypeRef = usePrototype();
  const agentSttRef = useRef(null);
  const languageDetailsRef = useRef(LanguageBotMap[language] || defaultData);


  useEffect(() => {
    setLanguage(language);
    langRef.current = language;
  }, [language]);

  useEffect(() => {
    isLiveRef.current = isLive;
  }, [isLive]);

  // Generate persistent session ID for this broadcast
  useEffect(() => {
    const id = `broadcast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(id);
  }, []);

  // Load Agora SDK asynchronously
  useEffect(() => {
    let isMounted = true;

    const initializeSDK = async () => {
      try {
        setIsSDKLoading(true);
        setConnectionError(null);
        const sdk = await loadAgoraSDK();

        if (isMounted) {
          setAgoraRTC(sdk);
          setIsSDKLoading(false);
        }
      } catch (error) {
        if (isMounted) {
          setSDKError(error.message);
          setConnectionError('Failed to load broadcasting components');
          setIsSDKLoading(false);
          toast.error('Failed to load broadcasting components. Please refresh the page.');
        }
      }
    };

    initializeSDK();

    return () => {
      isMounted = false;
    };
  }, []);


  // Enhanced reconnection function with session persistence
  const attemptReconnection = useCallback(async () => {
    if (!client || !isComponentMountedRef.current || reconnectAttempts >= maxReconnectAttempts) return;

    setIsReconnecting(true);
    setReconnectAttempts(prev => prev + 1);
    setConnectionError(null);

    const delay = Math.min(2000 * Math.pow(1.5, reconnectAttempts), 10000); // Progressive backoff

    reconnectTimeoutRef.current = setTimeout(async () => {
      if (!isComponentMountedRef.current) return;

      try {
        const APP_ID = process.env.NEXT_PUBLIC_AGORA_APPID;
        const CHANNEL_NAME = channelName;
        const { token, uid } = await generateToken("PUBLISHER", channelName);

        if (!APP_ID || !CHANNEL_NAME) {
          throw new Error(`Missing broadcast configuration`);
        }

        // Try to rejoin and republish with same session context
        await client.leave().catch(() => { }); // Ignore errors
        await client.setClientRole('host');
        await client.join(APP_ID, CHANNEL_NAME, toast, uid);
        console.info(token, uid)
        if (localAudioTrack) {
          await client.publish(localAudioTrack);
        }


        const agentRes = await StartCaption(CHANNEL_NAME, language, uid);
        agentSttRef.current = agentRes.agentId;
        setConnectionStatus('connected');
        setIsReconnecting(false);
        setReconnectAttempts(0);
        setConnectionError(null);

        toast.success('Broadcast reconnected successfully! Listeners will reconnect automatically.', {
          id: 'reconnected',
          duration: 4000
        });

      } catch (error) {
        console.error('Reconnection failed:', error);
        setConnectionError(`Reconnection failed: ${error.message}`);

        if (reconnectAttempts < maxReconnectAttempts - 1) {
          attemptReconnection(); // Try again
        } else {
          setIsReconnecting(false);
          setConnectionStatus('error');
          setConnectionError('Max reconnection attempts reached');
          toast.error('Broadcast connection failed. Please restart the broadcast.', {
            id: 'reconnect-failed',
            duration: 8000
          });
        }
      }
    }, delay);
  }, [client, localAudioTrack, reconnectAttempts, maxReconnectAttempts]);

  // Handle connection loss with enhanced detection
  const handleConnectionLoss = useCallback(() => {
    if (!isComponentMountedRef.current || isReconnecting) return;

    console.log('Broadcast connection lost - attempting reconnection');
    setConnectionStatus('disconnected');
    setConnectionError('Connection lost');

    toast.warning('Broadcast connection lost. Reconnecting automatically...', {
      id: 'connection-lost',
      duration: 5000
    });

    // Start reconnection if still live
    if (isLive && reconnectAttempts < maxReconnectAttempts) {
      attemptReconnection();
    }
  }, [isLive, isReconnecting, reconnectAttempts, attemptReconnection, maxReconnectAttempts]);

  // Initialize Agora client (only after SDK is loaded)
  useEffect(() => {
    if (!AgoraRTC || isSDKLoading) return;

    const agoraClient = AgoraRTC.createClient({
      mode: 'live',
      codec: 'vp8',
      role: 'host'
    });
    setClient(agoraClient);


    console.log(agoraClient.sendStreamMessage, "agoraClient");

    // Enhanced event listeners
    agoraClient.on('user-joined', (user) => {
      console.log('User joined:', user.uid);
    });

    agoraClient.on('user-left', (user) => {
      console.log('User left:', user.uid);
    });

    // Monitor connection state changes with better handling
    agoraClient.on('connection-state-changed', (curState, revState, reason) => {
      console.log('Connection state changed:', curState, 'from:', revState, 'reason:', reason);

      if (curState === 'CONNECTED') {
        setConnectionStatus('connected');
        setConnectionError(null);
        setNetworkQuality('good'); // Reset network quality on reconnect
      } else if (curState === 'DISCONNECTED' && isLive && connectionStatus === 'connected') {
        //handleConnectionLoss();
        window.alert('Connection issue! Please restart the broadcasting!')
        handleStopStream();
      } else if (curState === 'RECONNECTING') {
        setConnectionStatus('reconnecting');
        toast.info('Connection unstable, attempting to stabilize...', {
          id: 'reconnecting',
          duration: 3000
        });
      } else if (curState === 'FAILED') {
        setConnectionError(`Connection failed: ${reason}`);
        setConnectionStatus('error');
      }
    });

    // Handle exceptions with better categorization
    agoraClient.on('exception', (evt) => {
      console.error('Agora exception:', evt);
      setConnectionError(`Broadcast error: ${evt.code} - ${evt.msg || 'Unknown error'}`);

      if (evt.code === 'NETWORK_ERROR' && isLive && connectionStatus === 'connected') {
        setNetworkQuality('poor');
        //handleConnectionLoss();
      } else if (evt.code === 'MEDIA_ERROR') {
        toast.error('Microphone error detected. Please check your audio device.', {
          id: 'media-error',
          duration: 6000
        });
        setIsMicConnected(false);
      }
    });

    // Enhanced network quality monitoring
    agoraClient.on('network-quality', (stats) => {
      if (stats.uplinkNetworkQuality) {
        if (stats.uplinkNetworkQuality >= 4) {
          setNetworkQuality('poor');
          toast.warning('Poor network quality detected. Consider checking your connection.', {
            id: 'network-warning',
            duration: 4000
          });
        } else if (stats.uplinkNetworkQuality >= 3) {
          setNetworkQuality('fair');
        } else {
          setNetworkQuality('good');
        }
      }
    });






    agoraClient.on("stream-message", (uid, data) => {
      try {
        console.log(langRef.current, "stream-message");
        const languageDetails = LanguageBotMap[langRef.current];
        if (languageDetails) {
          const { subId, pubId, langCode } = languageDetails;
          if (String(uid) === String(pubId)) {
            const bytes = new Uint8Array(data);
            const Text = protypeRef.current.lookupType("Agora.SpeechToText.Text");
            const msg = Text.decode(bytes);
            if (msg.dataType === "transcribe") {
              if (msg?.words[0]?.isFinal) {
                console.log(msg?.words[0]?.text, "stream-message");
              }
            }

            if (msg.dataType === "translate") {
              if (msg?.trans[0]?.isFinal) {
                console.log(msg?.trans[0]?.texts[0], msg?.trans[0]?.lang, "stream-message");
                const lang = codeToLanguage[msg?.trans[0]?.lang];
                websocketRefs.current[lang]?.send(JSON.stringify({ type: "translation", text: msg?.trans[0]?.texts[0], language: msg?.trans[0]?.lang }));
              }
            }
          }
        }
      } catch (e) {
        console.log(e, "stream-message");
      }
    })

    return () => {
      isComponentMountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      agoraClient.removeAllListeners();
    };
  }, [AgoraRTC, isSDKLoading]);

  // Enhanced microphone initialization with better error handling
  const initializeMicrophone = async () => {
    if (!AgoraRTC) {
      toast.error('Audio system not ready. Please wait and try again.');
      return;
    }

    try {
      // Check for existing permissions first
      const permissions = await navigator.permissions.query({ name: 'microphone' });

      if (permissions.state === 'denied') {
        toast.error('Microphone permission denied. Please allow microphone access in your browser settings.');
        return;
      }

      const audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
        encoderConfig: {
          sampleRate: 48000,
          stereo: true,
          bitrate: 128,
        },
        ANS: true, // Automatic Noise Suppression
        AEC: true, // Acoustic Echo Cancellation
        AGC: true, // Automatic Gain Control
      });

      setLocalAudioTrack(audioTrack);
      setIsMicConnected(true);
      setConnectionError(null);
      toast.success("Microphone connected successfully with noise cancellation!");

      // Monitor audio levels with enhanced detection
      audioTrack.on("audio-volume-indication", (level) => {
        setMicLevel(Math.min(level * 100, 100)); // Normalize to 0-100
      });

    } catch (error) {
      console.error("Error accessing microphone:", error);
      setIsMicConnected(false);
      setConnectionError(`Microphone error: ${error.message}`);

      let errorMessage = "Failed to access microphone. ";
      if (error.name === 'NotAllowedError') {
        errorMessage += "Please allow microphone permissions and try again.";
      } else if (error.name === 'NotFoundError') {
        errorMessage += "No microphone device found. Please check your audio devices.";
      } else if (error.name === 'NotReadableError') {
        errorMessage += "Microphone is being used by another application.";
      } else {
        errorMessage += "Please check your microphone connection and try again.";
      }

      toast.error(errorMessage, { duration: 8000 });
    }
  };

  // Enhanced start broadcast with session tracking and timeout
  const handleStartStream = async () => {
    setLoading(true);
    try {
      if (!isMicConnected) {
        toast.info("Initializing microphone...");
        await initializeMicrophone();

        if (!isMicConnected) {
          toast.error("Cannot start broadcast without microphone access");
          return;
        }
      }

      // Validate environment variables
      const APP_ID = process.env.NEXT_PUBLIC_AGORA_APPID;
      const CHANNEL_NAME = channelName;
      const TOKEN = process.env.NEXT_PUBLIC_AGORA_TOKEN || null;

      if (!APP_ID || !CHANNEL_NAME) {
        toast.error("Broadcast configuration error. Please check environment settings.");
        return;
      }

      // Add connection timeout
      const connectionTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout')), 15000)
      );

      const connectPromise = async () => {
        await client.setClientRole('host');
        const { token, uid } = await generateToken("PUBLISHER", channelName);
        await client.join(APP_ID, CHANNEL_NAME, token, uid);
        await client.publish(localAudioTrack);
        const agentRes = await StartCaption(CHANNEL_NAME, language, uid);
        agentSttRef.current = agentRes.agentId;
        hostUidRef.current = uid;
      };

      // Race between connection and timeout
      await Promise.race([connectPromise(), connectionTimeout]);

      setIsLive(true);
      setConnectionStatus('connected');
      setStreamDuration(0);
      setReconnectAttempts(0); // Reset on successful start
      setConnectionError(null);
      streamStartTimeRef.current = Date.now();

      // Send session start notification to backend (if you have this endpoint)
      try {
        await fetch('/api/broadcast/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            startTime: streamStartTimeRef.current
          })
        });
      } catch (err) {
        console.log('Session tracking not available:', err);
      }

      toast.success("🎙️ Broadcast started successfully! Listeners can now connect.", {
        duration: 4000
      });


      interpreters.filter(lang => lang !== language).forEach(language => {
        connectToInterpreter(language);
      });

    } catch (error) {
      console.error("Error starting stream:", error);

      // Provide more specific error messages
      let errorMessage = "Failed to start broadcast: ";
      if (error.message.includes('timeout')) {
        errorMessage += "Connection timeout. Please check your network connection.";
      } else if (error.message.includes('INVALID_CHANNEL')) {
        errorMessage += "Invalid channel configuration. Please contact support.";
      } else if (error.message.includes('TOKEN_EXPIRED')) {
        errorMessage += "Session expired. Please refresh the page.";
      } else {
        errorMessage += error.message;
      }

      setConnectionError(errorMessage);
      toast.error(errorMessage, { duration: 8000 });

      // Reset state on failure
      setIsLive(false);
      setConnectionStatus('error');
    } finally {
      setLoading(false);
    }
  };

  // Enhanced stop broadcast with session cleanup
  const handleStopStream = async () => {
    setLoading(true);
    try {
      if (localAudioTrack) {
        await client.unpublish(localAudioTrack);
      }

      await client.leave();

      await StopCaption(agentSttRef.current);

      setIsLive(false);
      setConnectionStatus('disconnected');
      setStreamDuration(0);
      setReconnectAttempts(0);
      setConnectionError(null);

      // Clear reconnect timeout if active
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        setIsReconnecting(false);
      }

      // Send session end notification to backend
      try {
        await fetch('/api/broadcast/end', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            endTime: Date.now(),
            duration: streamDuration
          })
        });
      } catch (err) {
        console.log('Session tracking not available:', err);
      }

      toast.info("Broadcast stopped. Thank you for your interpretation!", { duration: 4000 });

      interpreters.forEach(language => {
        websocketRefs.current[language]?.close();
      });

    } catch (error) {
      console.error("Error stopping stream:", error);
      setConnectionError(`Stop error: ${error.message}`);
      toast.error("Failed to stop stream properly");
    } finally {
      setTimeout(() => {
        setLoading(false);
      }, 4000);
    }
  };

  // Cleanup microphone on unmount
  useEffect(() => {
    return () => {
      if (localAudioTrack) {
        localAudioTrack.close();
      }
    };
  }, [localAudioTrack]);

  // Stream duration timer with pause on disconnect
  useEffect(() => {
    if (!isLive || connectionStatus !== 'connected') return;

    const interval = setInterval(() => {
      setStreamDuration(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isLive, connectionStatus]);

  // Enhanced listener count monitoring
  useEffect(() => {
    const fetchListenerCount = async () => {
      try {
        const res = await getBroadcastInfoRequest(channelName);
        const count = res.data?.data?.audience_total || 0;
        let hostcount = res.data?.data?.broadcasters || [];
        setListenerCount(count);
        hostcount = hostcount.filter(item => item !== languageDetailsRef.current.pubId);

        // if(hostcount.length > 0) {
        //   setBroadcasterCount(2);
        // }else{
        //   setBroadcasterCount(1);
        // }

        // Alert if listener count drops significantly while live
        if (isLive && count === 0) {
          console.warn('No listeners detected while broadcasting');
        }
      } catch (error) {
        console.error('Error fetching listener count:', error?.response?.data?.message || error.message);
      }
    };

    fetchListenerCount();
    const interval = setInterval(fetchListenerCount, 3000); // More frequent updates
    return () => clearInterval(interval);
  }, [isLive, channelName]);

  // Initialize microphone on component mount (only after SDK loads)
  useEffect(() => {
    if (!AgoraRTC || isSDKLoading) return;
    initializeMicrophone();
  }, [AgoraRTC, isSDKLoading]);



  // Initialize Pusher
  useEffect(() => {

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    });
    const channel = pusher.subscribe(channelName);
    channel.bind('on-request-to-handover', (data) => {
      console.log(isLiveRef.current, "hello");
      if (isLiveRef.current) {
        setOpenRequestToHandoverPopup(true);
      }
    });

    channel.bind('on-accept-to-handover', (data) => {
      setHandoverRequestResponse("accepted");
    });

    channel.bind('on-reject-to-handover', (data) => {
      setHandoverRequestResponse("rejected");
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(channelName);
      pusher.disconnect();
    };
  }, [channelName]);


  const sendRequestToHandover = async () => {
    setHandoverRequestResponse(null);
    setWaitingForResponseToHandoverRquestPopup(true);
    await pushMessage("on-request-to-handover", {
      message: "Can you handover the broadcast to me?",
    }, channelName);
  };

  const sendAcceptToHandover = async () => {
    await handleStopStream()
    setOpenRequestToHandoverPopup(false);
    await pushMessage("on-accept-to-handover", {
      message: "Yes, I will handover the broadcast to you.",
    }, channelName);
  };

  const sendRejectToHandover = async () => {
    setOpenRequestToHandoverPopup(false);
    await pushMessage("on-reject-to-handover", {
      message: "No, I will not handover the broadcast to you.",
    }, channelName);
  };



  // Utility functions
  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getNetworkColor = () => {
    switch (networkQuality) {
      case 'good': return 'text-green-600';
      case 'fair': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getConnectionStatusConfig = () => {
    if (isReconnecting) {
      return {
        icon: Clock,
        text: `Reconnecting... (${reconnectAttempts}/${maxReconnectAttempts})`,
        className: 'text-blue-600 bg-blue-50',
        iconClass: 'text-blue-600 animate-spin'
      };
    }

    switch (connectionStatus) {
      case 'connected':
        return {
          icon: CheckCircle,
          text: 'Connected',
          className: 'text-green-600 bg-green-50',
          iconClass: 'text-green-600'
        };
      case 'reconnecting':
        return {
          icon: RefreshCcw,
          text: 'Reconnecting',
          className: 'text-blue-600 bg-blue-50',
          iconClass: 'text-blue-600 animate-spin'
        };
      case 'error':
        return {
          icon: AlertCircle,
          text: 'Connection Failed',
          className: 'text-red-600 bg-red-50',
          iconClass: 'text-red-600'
        };
      default:
        return {
          icon: AlertCircle,
          text: 'Disconnected',
          className: 'text-gray-600 bg-gray-50',
          iconClass: 'text-gray-600'
        };
    }
  };

  const handleMicToggle = async () => {
    if (isMicConnected) {
      if (localAudioTrack) {
        localAudioTrack.close();
        setLocalAudioTrack(null);
      }
      setIsMicConnected(false);
      toast.warning("Microphone disconnected");
    } else {
      await initializeMicrophone();
    }
  };



  const handleSwitchLanguage = async (language) => {
    setLoading(true);
    await StopCaption(agentSttRef.current);
    interpreters.forEach(language => {
      websocketRefs.current[language]?.close();
    });



    //start the stream
    const agentRes = await StartCaption(channelName, language, hostUidRef.current);
    agentSttRef.current = agentRes.agentId;
    console.log(agentRes, "agentResagentResagentRes",hostUidRef.current);

    interpreters.filter(lang => lang !== language).forEach(language => {
      connectToInterpreter(language);
    });

    setLoading(false);
    toast.success("🎙️ Source language switched successfully!", {
      duration: 4000
    });
  }

  const handleSourceLanguageChange = (language) => {
    setParamsLanguage(language);

    if (isLiveRef.current) {
      handleSwitchLanguage(language);
    }
  };

  const handleReconnect = async () => {
    toast.info("Attempting to reconnect microphone...");
    await initializeMicrophone();
  };

  const handleForceReconnect = async () => {
    if (isLive) {
      setReconnectAttempts(0);
      setConnectionError(null);
      handleConnectionLoss();
    }
  };

  const statusConfig = getConnectionStatusConfig();
  const StatusIcon = statusConfig.icon;

  // Loading component for async SDK loading
  const LoadingComponent = () => (
    <div className="min-h-screen bg-zero-beige flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-zero-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h2 className="text-xl font-inter font-semibold text-zero-text mb-2">
          Loading Broadcasting System
        </h2>
        <p className="text-zero-text/70 font-inter">
          Initializing professional audio streaming components...
        </p>
      </div>
    </div>
  );

  // Error component for SDK loading failure
  const ErrorComponent = () => (
    <div className="min-h-screen bg-zero-beige flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-8">
        <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-600" />
        <h2 className="text-xl font-inter font-semibold text-zero-text mb-2">
          Broadcasting System Unavailable
        </h2>
        <p className="text-zero-text/70 font-inter mb-6">
          Failed to load broadcasting components: {sdkError || connectionError}
        </p>
        <div className="space-y-3">
          <Button
            onClick={() => window.location.reload()}
            className="w-full bg-zero-blue text-white hover:bg-zero-blue/90 font-inter font-semibold"
          >
            Refresh Page
          </Button>
          <p className="text-xs text-gray-600">
            If the problem persists, try a different browser or check your network connection
          </p>
        </div>
      </div>
    </div>
  );

  // Show loading component while SDK is loading
  if (isSDKLoading || firstLoad) {
    return <LoadingComponent />;
  }

  // Show error component if SDK failed to load
  if (sdkError) {
    return <ErrorComponent />;
  }

  return (
    <div className='monstant-font'>
      {
        waitingForResponseToHandoverRquestPopup && (
          <Dialog>
            {
              handoverRequestResponse === "accepted" ? (
                <>
                  <p className='text-sm text-green-500 text-center mb-5'>Handover request accepted</p>
                  <Button onClick={() => { setWaitingForResponseToHandoverRquestPopup(false); handleStartStream() }} className='bg-zero-green text-white hover:bg-zero-green/90'>Start Broadcasting</Button>
                </>
              )
                : (handoverRequestResponse === "rejected") ? (
                  <>
                    <p className='text-sm text-red-500 text-center mb-5'>Handover request rejected</p>
                    <Button onClick={() => setWaitingForResponseToHandoverRquestPopup(false)} className='bg-gray-600 text-white hover:bg-gray-600/90'>Close</Button>
                  </>
                ) : (
                  <>
                    <p className='text-sm text-gray-500 text-center mb-5'>Waiting for response from the other broadcaster</p>
                  </>
                )}
          </Dialog>
        )
      }
      {
        openRequestToHandoverPopup && (
          <Dialog>
            <h1 className='text-2xl font-bold text-center'>Request to Handover</h1>
            <p className='text-sm text-gray-500 text-center'>Handover request received from the other broadcaster. Please accept or reject the request.</p>
            <div className='flex items-center gap-5 w-full justify-center mt-5'>
              <Button onClick={sendAcceptToHandover} className='bg-zero-green text-white hover:bg-zero-green/90'>Accept</Button>
              <Button onClick={sendRejectToHandover} className='bg-red-500 text-white hover:bg-red-500/90'>Reject</Button>
            </div>
          </Dialog>
        )
      }
      <div className="min-h-screen bg-zero-beige">
        {/* Modern Header */}
        <header className="bg-gray-200 text-white p-6 sticky top-0 z-50 backdrop-blur-xl border-b border-white/10">
          <div className="container mx-auto flex justify-between items-center">
            <div className="flex items-center gap-6">
              <img src="/images/lingo-you-logo.png" alt="logo" className="w-[12rem] object-contain" />
            </div>

            <div className="flex items-center gap-6">
              {/* Connection Status in Header */}
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${statusConfig.className}`}>
                <StatusIcon className={`w-4 h-4 ${statusConfig.iconClass}`} />
                {statusConfig.text}
              </div>
              {isLive && <OnAirIndicator isLive={isLive} />}
              {isLive && <ListenerCountBadge count={listenerCount} />}
            </div>
          </div>
        </header>

        {/* Connection Alert Banner */}
        {(isReconnecting || connectionStatus === 'error' || connectionError) && (
          <div className={`w-full p-4 ${isReconnecting ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'
            } border-b`}>
            <div className="container mx-auto flex items-center gap-3">
              <StatusIcon className={`h-5 w-5 ${statusConfig.iconClass}`} />
              <div>
                <p className={`font-semibold ${isReconnecting ? 'text-blue-800' : 'text-red-800'
                  }`}>
                  {isReconnecting
                    ? 'Reconnecting to broadcast service...'
                    : 'Broadcast service connection failed'
                  }
                </p>
                <p className={`text-sm ${isReconnecting ? 'text-blue-600' : 'text-red-600'
                  }`}>
                  {connectionError || (isReconnecting
                    ? 'Your broadcast will resume automatically. Listeners will reconnect when service is restored.'
                    : 'Please check your connection and try restarting the broadcast.'
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="container mx-auto p-8 max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-2">
            {/* Main Controls */}
            <Card className="bg-white/90 backdrop-blur-xl shadow-2xl border-0 rounded-3xl overflow-hidden">
              <div className="p-10">
                <h3 className="text-4xl font-playfair font-bold text-zero-text mb-10 text-center">
                  Broadcast Controls
                </h3>

                <div>
                  <span className="text-zero-text/70 font-medium block mb-1">Source Language</span>
                  <div className="flex gap-2 items-center mb-4">
                    {
                      languages.map((lang) => (
                        <Button key={lang.value} variant="outline" className={`bg-white flex-1 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-md border-none text-zero-text hover:bg-zero-green hover:text-white ${lang.value === language ? 'bg-zero-green text-white' : ''}`} onClick={() => handleSourceLanguageChange(lang.value)}>{lang.name}</Button>
                      ))
                    }
                  </div>
                  {/* <Select
                    defaultValue={language}
                    onValueChange={(value) => router.push(`/booth/${value}`)}
                  >
                    <SelectTrigger className='cursor-pointer w-full !bordor-transparent bg-white mb-3 border-gray-100 shadow-md'>
                      <SelectValue placeholder="Select Language" className='flex items-center gap-2 cursor-pointer'><img src={flagsMapping[language]} alt={language} className='w-6 h-6' />{language?.slice(0, 1).toUpperCase()}{language?.slice(1).toLowerCase()}</SelectValue>
                    </SelectTrigger>
                    <SelectContent className='bg-white border-none shadow-md'>
                      {
                        languages.map((language) => (
                          <SelectItem value={language.value} key={language.value} className='flex items-center gap-2 cursor-pointer'><img src={language.flag} alt={language.name} className='w-6 h-6' />{language.name}</SelectItem>
                        ))
                      }
                    </SelectContent>
                  </Select> */}
                </div>

                <div className="space-y-10">
                  {/* Main Action Button */}
                  <div className="text-center">
                    {
                      loading ? <Button
                        className="w-full bg-zero-green text-white hover:bg-zero-green/90 text-2xl px-12 py-10 font-bold transition-all duration-300 hover:scale-105 font-inter rounded-2xl shadow-xl"
                        size="lg"
                      >
                        <Loader2 className="mr-4 h-10 w-10 animate-spin" />
                      </Button>
                        :
                        (broadcasterCount > 1 && !isLive && !loading) ? (
                          <Button
                            onClick={sendRequestToHandover}
                            className="w-full bg-zero-green text-white hover:bg-zero-green/90 text-2xl px-12 py-10 font-bold transition-all duration-300 hover:scale-105 font-inter rounded-2xl shadow-xl"
                            size="lg"
                          >
                            Request Handover
                          </Button>
                        ) : !isLive ? (
                          <Button
                            onClick={handleStartStream}
                            disabled={!isMicConnected || isReconnecting}
                            className="w-full bg-zero-green text-white hover:bg-zero-green/90 text-2xl px-12 py-10 font-bold transition-all duration-300 hover:scale-105 font-inter rounded-2xl shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                            size="lg"
                          >
                            <Mic className="mr-4 h-10 w-10" />
                            On Air
                          </Button>
                        ) : (
                          <Button
                            onClick={handleStopStream}
                            variant="outline"
                            className="w-full border-zero-warning text-red-500 hover:bg-zero-warning hover:text-white text-2xl px-12 py-10 font-bold font-inter rounded-2xl shadow-xl"
                            size="lg"
                          >
                            <MicOff className="mr-4 h-10 w-10" />
                            Off Air
                          </Button>
                        )}
                  </div>


                  {!isMicConnected && (
                    <div className="text-center bg-orange-50 p-8 rounded-3xl border border-orange-200">
                      <MicOff className="h-12 w-12 mx-auto mb-4 text-orange-600" />
                      <p className="text-orange-800 font-bold text-lg font-inter">Microphone Required</p>
                      <p className="text-sm text-orange-600 mt-2 font-inter">Connect your microphone to start broadcasting</p>
                      <Button
                        onClick={handleReconnect}
                        className="mt-4 bg-orange-600 text-white hover:bg-orange-700 font-inter font-semibold px-6 py-2 rounded-xl"
                      >
                        <Mic className="mr-2 h-4 w-4" />
                        Retry Connection
                      </Button>
                    </div>
                  )}

                  {/* Audio Monitor */}
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <h4 className="text-2xl font-playfair font-bold text-zero-text">
                        Audio Monitor
                      </h4>
                      <Button
                        onClick={handleMicToggle}
                        variant="outline"
                        size="sm"
                        className="border-zero-navy text-zero-text hover:bg-zero-navy hover:text-white font-inter font-medium"
                        disabled={isLive}
                      >
                        {isMicConnected ? 'Disconnect' : 'Connect'}
                      </Button>
                    </div>

                    <AudioLevelMeter
                      level={micLevel}
                      isActive={isMicConnected}
                      className="mb-6"
                      mediaStreamTrack={localAudioTrack?.getMediaStreamTrack() || undefined}
                    />

                    <p className="text-sm text-zero-text/60 font-inter text-center">
                      {isMicConnected ?
                        'Speak into your microphone to test the audio levels' :
                        'Connect microphone to monitor audio levels'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Stream Information */}
            <Card className="bg-white/90 backdrop-blur-xl shadow-2xl border-0 rounded-3xl overflow-hidden">
              <div className="p-10">
                <h3 className="text-4xl font-playfair font-bold text-zero-text mb-10">
                  Stream Information
                </h3>

                <div className="space-y-8">
                  <div className="p-4 bg-gray-50 rounded-2xl">
                    <span className="text-zero-text/70 font-medium block mb-1">TTS Service</span>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {
                        ttsProviders.map((service) => (
                          <Button key={service.value} variant="outline" disabled={isLive} className={`bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-md border-none text-zero-text hover:bg-zero-green hover:text-white ${ttsService === service.value ? 'bg-zero-green text-white' : ''}`} onClick={() => setTTSService(service.value)}>{service.name}</Button>
                        ))
                      }
                    </div>

                    <div>
                      <span className="text-zero-text/70 font-medium block mb-1">Voice</span>
                      <div className="grid grid-cols-2 gap-2">
                        {["Male", "Female"].map((gender) => (
                          <Button key={gender} variant="outline" disabled={isLive} className={`bg-gray-50  disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-md border-none text-zero-text hover:bg-zero-green hover:text-white ${voiceGender === gender ? 'bg-zero-green text-white' : ''}`} onClick={() => setVoiceGender(gender)}>{gender}</Button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6 text-sm font-inter">
                    <div className="space-y-6">
                      <div className="p-4 bg-gray-50 rounded-2xl">
                        <span className="text-zero-text/70 font-medium block mb-1">Stream Status</span>
                        <div className={`font-bold text-lg ${isLive ? 'text-zero-status-good' : 'text-gray-600'}`}>
                          {isLive ? 'Broadcasting' : 'Offline'}
                        </div>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-2xl">
                        <span className="text-zero-text/70 font-medium block mb-1">Language</span>
                        <div className="font-bold text-lg text-zero-text flex items-center gap-2"><img src={flagsMapping[language]} alt={language} className='w-6 h-6' />{language?.slice(0, 1).toUpperCase()}{language?.slice(1).toLowerCase()}</div>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-2xl">
                        <span className="text-zero-text/70 font-medium block mb-1">Mic Status</span>
                        <div className={`font-bold text-lg ${isMicConnected ? 'text-zero-status-good' : 'text-zero-warning'}`}>
                          {isMicConnected ? 'Connected' : 'Disconnected'}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="p-4 bg-gray-50 rounded-2xl">
                        <span className="text-zero-text/70 font-medium block mb-1">Connection</span>
                        <div className={`font-bold text-lg ${getNetworkColor()}`}>
                          {networkQuality}
                        </div>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-2xl">
                        <span className="text-zero-text/70 font-medium block mb-1">Listeners</span>
                        <div className="font-bold text-lg text-zero-text">{listenerCount}</div>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-2xl">
                        <span className="text-zero-text/70 font-medium block mb-1">Duration</span>
                        <div className="font-bold text-lg text-zero-text">{formatDuration(streamDuration)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Live Stats */}
                  {isLive && (
                    <div className="border-t border-gray-200 pt-8">
                      <h4 className="font-playfair font-bold text-zero-text mb-6 text-2xl flex items-center gap-3">
                        <Activity className="h-6 w-6" />
                        Live Statistics
                      </h4>
                      <div className="space-y-4 text-sm font-inter">
                        <div className="flex justify-between items-center p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl">
                          <span className="text-zero-text/70 font-medium">Connection Status</span>
                          <span className={`font-bold text-lg ${connectionStatus === 'connected' ? 'text-zero-status-good' : 'text-zero-warning'}`}>
                            {connectionStatus === 'connected' ? 'Stable' : 'Reconnecting'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-4 bg-gradient-to-r from-gray-50 to-green-50 rounded-xl">
                          <span className="text-zero-text/70 font-medium">Network Quality</span>
                          <span className={`font-bold text-lg ${getNetworkColor()}`}>
                            {networkQuality}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-4 bg-gradient-to-r from-gray-50 to-emerald-50 rounded-xl">
                          <span className="text-zero-text/70 font-medium">Reconnection Attempts</span>
                          <span className="font-bold text-lg text-zero-text">
                            {reconnectAttempts}/{maxReconnectAttempts}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-4 bg-gradient-to-r from-gray-50 to-purple-50 rounded-xl">
                          <span className="text-zero-text/70 font-medium">Session ID</span>
                          <span className="font-mono text-xs text-zero-text/80">
                            {sessionId?.slice(-8) || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>


        </main>
      </div>
    </div>
  );
};

export default Broadcast;