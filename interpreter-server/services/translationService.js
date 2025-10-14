import { Buffer } from 'node:buffer';
import EventEmitter from 'events';
import WebSocket from 'ws';


export class TranscriptionService extends EventEmitter {
  socket;
  isOpen = false;
  ws = null;
  constructor(language) {
    super();
    this.ws = new WebSocket(`wss://api.deepgram.com/v1/listen?model=nova-2&language=${language}&smart_format=true&sample_rate=24000&channels=1&multichannel=false&no_delay=true&endpointing=400&utterance_end_ms=1000&interim_results=true&encoding=linear16`, [
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


      if (transcript && received.is_final) {
        this.emit("transcription", transcript);
    
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

