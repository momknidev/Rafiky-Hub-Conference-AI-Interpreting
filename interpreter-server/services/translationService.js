import { Buffer } from 'node:buffer';
import EventEmitter from 'events';
import WebSocket from 'ws';


export class TranscriptionService extends EventEmitter {
  socket;
  isOpen = false;
  ws = null;
  text = '';
  constructor(language) {
    super();
    this.ws = new WebSocket(`wss://api.deepgram.com/v1/listen?model=nova-2&language=${language}&smart_format=true&sample_rate=24000&channels=1&multichannel=false&no_delay=true&endpointing=200&interim_results=true&encoding=linear16`, [
      'token',
      process.env.DEEPGRAM_API_KEY,
    ]);

    this.ws.onopen = () => {
      this.isOpen = true;
      console.log({ event: 'onopen' });
    }

    this.ws.onmessage = (message) => {
      const received = JSON.parse(message.data)
      if (!received?.channel?.alternatives) return;
      const transcript = received?.channel?.alternatives[0]?.transcript

      if(received.is_final){
        this.text += transcript;
      }

      // console.log(`is_final: ${received.is_final} | speech_final: ${received.speech_final} ---> ${transcript}`);
      if (transcript && received.speech_final) {
        this.emit("transcription", this.text);
        this.text = '';
      }
    }

    this.ws.onclose = () => {
      this.isOpen = false;
      console.log({ event: 'onclose' })
    }

    this.ws.onerror = (error) => {
      this.isOpen = false;
      console.log({ event: 'onerror', error })
    }
  }

 
  sendAudio(payload) {
    if (this.isOpen) {
      this.ws.send(Buffer.from(payload, 'base64'));
    }
  }

  close() {
    this.ws.close();
  }
}


export class SpeechmaticsTranscriptionService extends EventEmitter {
  ws = null;
  isOpen = false;

  constructor(language = 'en') {
    super();

    // Speechmatics Realtime WebSocket URL
    const url = 'wss://realtime.api.speechmatics.com/v2/listen';

    // Create WebSocket connection with token-based auth
    this.ws = new WebSocket(url, {
      headers: {
        Authorization: `Bearer ${process.env.SPEECHMATICS_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    this.ws.on('open', () => {
      this.isOpen = true;
      console.log({ event: 'onopen' });

      // Send initial config as JSON
      const configMessage = {
        "message": "StartRecognition",
        "audio_format": {
          "type": "raw",
          "encoding": "pcm_s16le",
          "sample_rate": 16000
        },
        "transcription_config": {
          "language": language,
          "operating_point": "enhanced",
          "output_locale": "en-US",
          "additional_vocab": [],
          "diarization": "speaker",
          "max_delay": 1,
          "enable_partials": true
        },
        "translation_config": {
          "target_languages": [
            "es",
            "de"
          ],
          "enable_partials": true
        },
        "audio_events_config": {
          "types": [
            "applause",
            "music"
          ]
        }
      };
      this.ws.send(JSON.stringify(configMessage));
    });

    this.ws.on('message', (message) => {
      const parsed = JSON.parse(message.toString());

      // Speechmatics sends different message types
      if (parsed.type === 'transcript') {
        const transcript = parsed?.data?.text;
        const isFinal = parsed?.data?.final;
        if (transcript && isFinal) {
          this.emit('transcription', transcript);
        }
      }
    });

    this.ws.on('close', () => {
      this.isOpen = false;
      console.log({ event: 'onclose' });
    });

    this.ws.on('error', (err) => {
      this.isOpen = false;
      console.log({ event: 'onerror', error: err });
    });
  }

  sendAudio(payload) {
    if (this.isOpen) {
      // Send raw PCM audio (16-bit signed) as base64
      this.ws.send(Buffer.from(payload, 'base64'));
    }
  }

  close() {
    this.ws.close();
  }
}
