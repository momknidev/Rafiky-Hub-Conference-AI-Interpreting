import WebSocket from 'ws';
import config from 'dotenv';
config.config({path: '.env.local'});
import waves from 'wavefile';
import { NonBinary } from 'lucide-react';

export const textToSpeechDeepgram = (rtmpPusher,config) => {
    let flusherTimeout = null;
    const deepgramTTSWebsocketURL = `wss://api.deepgram.com/v1/speak?encoding=linear16&sample_rate=48000&container=none&model=${config.voice_id}&channels=1`;
    const options = {
      headers: {
        Authorization: `Token ${ config.apiKey || process.env.DEEPGRAM_API_KEY}`
      }
    };
    const ws = new WebSocket(deepgramTTSWebsocketURL, options);
  
    ws.onopen = () => {
      console.log('deepgram TTS: Connected');
      flusherTimeout = setInterval(() => {
        ws.send(JSON.stringify({ 'type': 'Speak', 'text': ' ' }));
        ws.send(JSON.stringify({ 'type': 'Flush' }));
      }, 5000);
    };
  
    ws.onmessage = ({ data }) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'Flushed') {
          const index = msg.sequence_id;
          console.log(`deepgram TTS: Flushed ${index}`);
        }
        return;
      } catch {
        // binary audio
      }
 
      rtmpPusher.pushChunk(Buffer.from(data));

    };
  
    ws.onclose = () => {
      console.log('deepgram TTS: Disconnected from the WebSocket server')
      clearInterval(flusherTimeout);
    };
  
    ws.onerror = (error) => {
        console.log("deepgram TTS: error received");
        console.error(error);
        clearInterval(flusherTimeout);
    }

    const sendText = (text, opts = {}) => {
      ws.send(JSON.stringify({ 'type': 'Speak', 'text': text }));
      ws.send(JSON.stringify({ 'type': 'Flush' }));
    }

    return {
      ws,
      sendText,
      close: () => { try { ws.close(); } catch {} },
    };
}



export const textToSpeechSmallest = (rtmpPusher, cfg) => {
  const WAVES_WS_URL =
    'wss://waves-api.smallest.ai/api/v1/lightning-v2/get_speech/stream';

  // Expect these in your app's config/env
  const voiceId = cfg.voice_id || 'felix';
  const language = cfg.language || 'en';
  const sampleRate = cfg.sample_rate || 24000;

  const ws = new WebSocket(WAVES_WS_URL, {
    headers: {
      Authorization: `Bearer ${ config.apiKey || process.env.WAVES_API_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  let pingInterval = null;

  ws.on('open', () => {
    console.log('waves TTS: Connected');
    // Keep the connection warm (simple WS ping)
    pingInterval = setInterval(() => {
      sendText('',{flush: true});
    }, 5000);
  });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg?.data?.audio) {
        const pcmBuf = Buffer.from(msg.data.audio, 'base64');
        const typed = new Int16Array(pcmBuf.buffer, pcmBuf.byteOffset, pcmBuf.byteLength / 2);
        const wav = new waves.WaveFile();
        wav.fromScratch(
          1,
          sampleRate,                 // 24000 from the API
          "16", // '16' or '32f'
          typed
        );
        wav.toSampleRate(44100);
        const samples = Buffer.from(wav.data.samples);
        rtmpPusher.pushChunk(samples);
      } else if (msg?.status) {
        console.log('waves TTS status:', msg.status);
      }
      return;
    } catch (error) {
      console.log(error, "data");
      // If Waves ever sent binary frames (unlikely per docs), pass-through:
    }
  });

  ws.on('close', () => {
    console.log('waves TTS: Disconnected');
    if (pingInterval) clearInterval(pingInterval);
  });

  ws.on('error', (err) => {
    console.error('waves TTS: error', err);
    if (pingInterval) clearInterval(pingInterval);
  });


  const speak = ({
    text,
    flush = false,
    continuePrev = false,
    maxBufferFlushMs = 1000,
    speed = 1,
    consistency = 0.5,
    enhancement = 1,
    similarity = 0,
  }) => {
    if (ws.readyState !== WebSocket.OPEN) return;
    const payload = {
      voice_id: voiceId,
      text,
      language,
      sample_rate: sampleRate,
      flush,                 // boolean boundary control
      continue: continuePrev, // continue previous stream
      max_buffer_flush_ms: maxBufferFlushMs,
      speed,
      consistency,
      enhancement,
      similarity
    };
    ws.send(JSON.stringify(payload));
  };

  const flushBoundary = () => speak({ text: '', flush: true });
  const sendText = (text, opts = {}) => speak({ text, ...opts });

  // Return a tiny interface you can use from your pipeline
  return {
    ws,
    sendText,
    flushBoundary,
    close: () => { try { ws.close(); } catch {} },
  };
};



export const textToSpeechCartesia = (rtmpPusher, cfg) => {
  const WAVES_WS_URL =
    `wss://api.cartesia.ai/tts/websocket?cartesia_version=2025-04-16&api_key=${ config.apiKey || process.env.CARTESIA_API_KEY}`;

  // Expect these in your app's config/env
  const model_id = cfg.model_id || "sonic-2";
  const voice_id = cfg.voice_id || "a0e99841-438c-4a64-b679-ae501e7d6091";
  const sampleRate = cfg.sample_rate || 44100;
  const context_id = cfg.context_id || "happy-monkeys-fly";
  const language = cfg.language || "en";

  const ws = new WebSocket(WAVES_WS_URL);

  let pingInterval = null;

  ws.on('open', () => {
    console.log('Cartesia TTS: Connected');
    // pingInterval = setInterval(() => {
    //   flushBoundary();
    // }, 5000);
  });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg?.type === "chunk") {
        const pcmBuf = Buffer.from(msg.data, 'base64');
        rtmpPusher.pushChunk(pcmBuf);
      } else if (msg?.type == "done") {
        console.log('Cartesia TTS done');
      }
      return;
    } catch (error) {
      console.log(error, "data");
    
    }
  });

  ws.on('close', () => {
    console.log('cartesia TTS: Disconnected');
    if (pingInterval) clearInterval(pingInterval);
  });

  ws.on('error', (err) => {
    console.error('cartesia TTS: error', err);
    if (pingInterval) clearInterval(pingInterval);
  });


  const speak = ({
    text,
  }) => {
    if (ws.readyState !== WebSocket.OPEN) return;
    const payload = {
      "model_id": model_id,
      "transcript": text,
      "voice": {
        "mode": "id",
        "id": voice_id
      },
      "language": language,
      "context_id": context_id,
      "output_format": {
        "container": "raw",
        "encoding": "pcm_s16le",
        "sample_rate": sampleRate
      },
      "add_timestamps": false,
      "continue": false
    };
    ws.send(JSON.stringify(payload));
  };

  const flushBoundary = () => speak({ text: '', flush: true });
  const sendText = (text, opts = {}) => speak({ text, ...opts });

  // Return a tiny interface you can use from your pipeline
  return {
    ws,
    sendText,
    flushBoundary,
    close: () => { try { ws.close(); } catch {} },
  };
};






export const textToSpeechElevenLabsWS = (rtmpPusher, cfg = {}) => {
  const apiKey = (cfg.apiKey || process.env.ELEVENLABS_API_KEY || '').trim();
  if (!apiKey) throw new Error('Missing ELEVENLABS_API_KEY');

  const voiceId     = cfg.voice_id   || 'JBFqnCBsd6RMkjVDRZzb';
  const modelId     = cfg.model_id   || 'eleven_turbo_v2_5'; // WS supported; avoid eleven_v3 for WS
  const sampleRate  = cfg.sample_rate|| 44100;
  const language    = cfg.language   || 'en';           // e.g. 'en'
  const outputFmt   = cfg.output_format || 'pcm_44100';
  const autoMode    = cfg.auto_mode ?? true;                 // lower latency for full sentences
  const baseUrl     = cfg.baseUrl || 'wss://api.elevenlabs.io';

  const qs = new URLSearchParams({
    ...(modelId && { model_id: modelId }),
    ...(language && { language_code: language }),
    output_format: outputFmt,
    auto_mode: String(autoMode),
  });

  const url = `${baseUrl}/v1/text-to-speech/${voiceId}/stream-input?${qs.toString()}`;
  const ws  = new WebSocket(url, {
    headers: { 'xi-api-key': apiKey },
  });

  let open = false;
  let pingTimer = null;

  ws.on('open', () => {
    console.log('ElevenLabs TTS: Connected');
    open = true;

    ws.send(JSON.stringify({
      text: " ",
      voice_settings: { stability: 0.8, similarity_boost: 0.1, style: 0, use_speaker_boost: false, speed: 1.1 },
      try_trigger_generation: false
    }));

    pingTimer = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ text: " " }));
      }
    }, 2000);
  });

  ws.on('message', (data, isBinary) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg?.audio) {
        const pcmBuf = Buffer.from(msg.audio, 'base64'); // pcm S16LE @ sampleRate
        rtmpPusher.pushChunk(pcmBuf);
      }
    } catch (e) {
      console.log('error', e);
      // Tolerate non-JSON (if they ever send binary or heartbeats)
    }
  });

  ws.on('error', (err) => {
    console.error('ElevenLabs WS error:', err?.message || err);
    if (pingTimer) clearInterval(pingTimer);
  });
  ws.on('close', (code, reason) => {
    console.log('ElevenLabs TTS: Disconnected', code, reason.toString());
    open = false;
    if (pingTimer) clearInterval(pingTimer);
  });

  const speak = (text, opts = {}) => {
    if (ws.readyState !== WebSocket.OPEN) return;
    if (typeof text !== 'string') return;
    
    ws.send(JSON.stringify({ text, try_trigger_generation: true }));
  };

  const flushBoundary = () => {
    if (!open || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ text: '' }));
  };

  const close = () => {
    try { if (pingTimer) clearInterval(pingTimer); ws.close(); } catch {}
  };

  return { ws, sendText: speak, flushBoundary, close };
};







export async function textToSpeechPlayHTWS(rtmpPusher, cfg = {}) {
  const apiKey = (cfg.apiKey || process.env.PLAYHT_API_KEY || '').trim();
  const userId = (cfg.userId || process.env.PLAYHT_USER_ID || '').trim();
  if (!apiKey || !userId) throw new Error('Missing PlayHT credentials');

  const model = cfg.model || 'Play3.0-mini'; // supports WS per docs
  const voice = cfg.voice_id;                   // REQUIRED by PlayHT
  if (!voice) throw new Error('cfg.voice is required (PlayHT voice id/url)');

  const outputFormat = (cfg.outputFormat || 'pcm').toLowerCase(); // 'mp3' | 'wav' | 'pcm'
  const sampleRate   = cfg.sampleRate || 44100;

  // 1) Get a short-lived WS URL for the desired engine
  const authRes = await fetch('https://api.play.ht/api/v4/websocket-auth', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'X-User-Id': userId,
      'Content-Type': 'application/json',
    },
  });
  if (!authRes.ok) {
    const t = await authRes.text().catch(()=>'');
    throw new Error(`PlayHT websocket-auth failed: ${authRes.status} ${authRes.statusText} ${t}`);
  }
  const { websocket_urls, expires_at } = await authRes.json();
  const wsUrl = websocket_urls?.[model];
  if (!wsUrl) throw new Error(`No websocket URL for model ${model}; got keys: ${Object.keys(websocket_urls || {})}`);

  // 2) Connect
  const ws = new WebSocket(wsUrl);
  let isOpen = false;
  let keepTimer = null;

  ws.on('open', () => {
    isOpen = true;
    console.log('PlayHT TTS: Connected to', model, 'expires at', expires_at);
    // optional keepalive (Play.ht will close idle sockets)
    const keep = Math.max(10, (cfg.keepaliveSec ?? 45));
    keepTimer = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        // no-op ping via text frame
        ws.send(JSON.stringify({ text: ' ' }));
      }
    }, keep * 1000);
  });

  ws.on('message', (data, isBinary) => {
    try {
      if (isBinary) {
        // Binary frames are the audio bytes (format you requested)
        rtmpPusher.pushChunk(Buffer.from(data));
        return;
      }
      // Text frames are control messages: "start" / "end" / errors
      const msg = JSON.parse(data.toString());
      if (msg?.type === 'start') {
        // request_id etc. available here if you want to correlate
        // console.log('PlayHT start:', msg.request_id);
      } else if (msg?.type === 'end') {
        // end of one synthesis
        // console.log('PlayHT end:', msg.request_id);
      } else if (msg?.error) {
        console.error('PlayHT WS error message:', msg.error);
      }
    } catch {/* ignore parse errors */}
  });

  ws.on('close', (code, reason) => {
    if (keepTimer) clearInterval(keepTimer);
    isOpen = false;
    console.log('PlayHT TTS: Disconnected', code, reason?.toString());
  });

  ws.on('error', (err) => {
    if (keepTimer) clearInterval(keepTimer);
    console.error('PlayHT WS error:', err?.message || err);
  });

  // 3) Send one utterance
  const sendText = (text, opts = {}) => {
    if (!text || !text.trim()) return;
    if (!isOpen || ws.readyState !== WebSocket.OPEN) return;

    // PlayHT accepts similar options to their HTTP streaming API
    // Common fields: text, voice, output_format, quality, speed, temperature
    const payload = {
      text,
      voice,
      output_format: outputFormat,   // "mp3" (default), or "wav", or "pcm"
      // If you’re requesting raw PCM or WAV, also pass sample rate:
      ...(outputFormat !== 'mp3' ? { sample_rate: sampleRate } : {}),
      // Tuning knobs (optional):
      ...(opts.quality ? { quality: opts.quality } : {}), // "draft" | "standard" | "premium"
      ...(opts.speed   ? { speed: opts.speed }       : {}), // 0.5 .. 2.0
      ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
    };
    ws.send(JSON.stringify(payload));
  };

  const flushBoundary = () => {
    // PlayHT WS is request/response; you typically just send new messages.
    // If you want to indicate “end of current segment”, send empty text:
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ text: '' }));
  };

  const close = () => { try { if (keepTimer) clearInterval(keepTimer); ws.close(); } catch {} };

  return { ws, sendText, flushBoundary, close };
}




export const textToSpeechOpenRealtime = (rtmpPusher, cfg = {}) => {
  const url = "wss://api.openai.com/v1/realtime"
  const model = cfg.model || "gpt-realtime-2025-08-28"
  const apiKey = cfg.apiKey || process.env.OPENAI_API_KEY
  const instructions = cfg.instructions || "You are a helpful assistant."
  const voice = cfg.voice || "alloy"


  let response = "";


  const session_config = {
    type: "realtime",
    output_modalities: ["audio"],
    instructions:instructions,
    audio: {
      input: {
        format: {
          type: "audio/pcm",
          rate: 24000,
        },
        turn_detection: {
          type: "server_vad",
          // threshold: 0.7,
          // prefix_padding_ms: 150,
          // silence_duration_ms: 600,
        }
      },
      output: {
        format: {
          type: "audio/pcm",
          rate: 24000,
        },
        voice: voice,
      }
    }
  }

  const ws = new WebSocket(`${url}?model=${model}`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  ws.on('open', () => {
    console.log('OpenAI Realtime TTS: Connected');
    ws.send(JSON.stringify({
      type: "session.update",
      session: session_config
    }));

    console.log("Session set up")
  });

  ws.on('error', (err) => {
    console.error('OpenAI Realtime TTS: Error', err);
  });

  ws.on('close', () => {
    console.log('OpenAI Realtime TTS: Closed');
  });
  
  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    // console.log('OpenAI Realtime TTS: Message', msg);
    if(msg.type === "error"){
      console.error('OpenAI Realtime TTS: Error', msg.error);
    }else if(msg.type === "response.text.delta"){
      const text = msg.text;
      response += text;
    }else if(msg.type === "response.output_audio.delta"){
      const audio = msg.delta;
      const pcmBuf = Buffer.from(audio, 'base64');
        const typed = new Int16Array(pcmBuf.buffer, pcmBuf.byteOffset, pcmBuf.byteLength / 2);
        const wav = new waves.WaveFile();
        wav.fromScratch(
          1,
          24000,               
          "16",
          typed
        );
        wav.toSampleRate(44100);
        const samples = Buffer.from(wav.data.samples);
        rtmpPusher.pushChunk(samples);
    }else if(msg.type === "response.audio.done"){
      console.log('OpenAI Realtime TTS: Response', response);
    }else if(msg.type === "response.done"){
      console.log(msg?.response?.status_details?.error)
      console.log('OpenAI Realtime TTS: Response end');
    }
  });


  const sendAudio = (audio) => {
    ws.send(JSON.stringify({
      "type": "input_audio_buffer.append",
      "audio": audio  // base64 encoded audio
    }));
  }

  
  return {
    ws,
    sendAudio,
    close: () => { try { ws.close(); } catch {} },
  };
  
}