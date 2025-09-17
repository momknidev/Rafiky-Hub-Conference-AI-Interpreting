import WebSocket from 'ws';
import config from 'dotenv';
config.config({path: '.env.local'});
import waveFile from 'wavefile';

export const textToSpeechService = (rtmpPusher,config) => {
    const deepgramTTSWebsocketURL = `wss://api.deepgram.com/v1/speak?encoding=linear16&sample_rate=48000&container=none&model=${config.voice_id}`;
    const options = {
      headers: {
        Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`
      }
    };
    const ws = new WebSocket(deepgramTTSWebsocketURL, options);
  
    ws.onopen = () => console.log('deepgram TTS: Connected');
  
    ws.onmessage = async({data}) => {
        try {
            let json = JSON.parse(data.toString());
            console.log('deepgram TTS: ', data.toString());
            return;
        } catch (e) {
            // Ignore
        }
        
        const payload = Buffer.from(data);
        rtmpPusher.pushChunk(payload);
    }
  
    ws.onclose = () => console.log('deepgram TTS: Disconnected from the WebSocket server');
  
    ws.onerror = (error) => {
        console.log("deepgram TTS: error received");
        console.error(error);
    }

    return ws;
  }