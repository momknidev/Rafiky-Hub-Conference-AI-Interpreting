import WebSocket from 'ws';
import config from 'dotenv';
config.config({path: '.env.local'});
import waves from 'wavefile';

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