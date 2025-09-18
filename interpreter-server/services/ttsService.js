import WebSocket from 'ws';
import config from 'dotenv';
config.config({path: '.env.local'});
import waveFile from 'wavefile';
import fs from 'fs';
export const textToSpeechService = (rtmpPusher,config) => {
    let debounceTimeout = null;
    let chunks = [];
    const deepgramTTSWebsocketURL = `wss://api.deepgram.com/v1/speak?encoding=linear16&sample_rate=48000&container=none&model=${config.voice_id}&channels=1`;
    const options = {
      headers: {
        Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`
      }
    };
    const ws = new WebSocket(deepgramTTSWebsocketURL, options);
  
    ws.onopen = () => console.log('deepgram TTS: Connected');
  
    ws.onmessage = ({ data }) => {
      // Try to parse control JSON; otherwise it's raw PCM
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'Flushed') {
          console.log('deepgram TTS: Flushed');
          // const chunk = Buffer.concat(chunks);
          // rtmpPusher.pushChunk(chunk);
          // fs.writeFileSync('./interpreter-server/please.wav', chunk);
          // chunks = [];
        }
        return;
      } catch {
        // binary audio
      }

      clearInterval(debounceTimeout);
      debounceTimeout = setInterval(() => {
        pushSilence();
      }, 5000);

      // chunks.push(Buffer.from(data));

      rtmpPusher.pushChunk(Buffer.from(data));
    };

    const pushSilence = () => {
      const data = fs.readFileSync('./interpreter-server/output.wav');
      const wav = new waveFile.WaveFile(data);
      const samples = Buffer.from(wav.data.samples);
      rtmpPusher.pushChunk(Buffer.from(samples));
      console.log('pushing silence');
    }
  
    ws.onclose = () => {
      console.log('deepgram TTS: Disconnected from the WebSocket server')
      clearInterval(debounceTimeout);
    };
  
    ws.onerror = (error) => {
        console.log("deepgram TTS: error received");
        console.error(error);
        clearInterval(debounceTimeout);
    }

    return ws;
  }