import WebSocket from 'ws';
import config from 'dotenv';
config.config({path: '.env.local'});
export const textToSpeechService = (rtmpPusher,config) => {
    let flusherTimeout = null;
    const deepgramTTSWebsocketURL = `wss://api.deepgram.com/v1/speak?encoding=linear16&sample_rate=48000&container=none&model=${config.voice_id}&channels=1`;
    const options = {
      headers: {
        Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`
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

    return ws;
  }

