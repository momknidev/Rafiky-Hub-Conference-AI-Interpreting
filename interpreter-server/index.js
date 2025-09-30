// import waveFile from 'wavefile';
// import fs from 'fs';
// import path from 'path';


// // Usage Example:
// import { RTMPPusher } from './services/rtmpPusher.js';
// const rtmpUrl = "rtmp://rtls-ingress-prod-eu.agoramdn.com/live/pmUOWK2UWjuxHgcmD7vkXpnDhQbIcM2";
// const rtmpPusher = new RTMPPusher(rtmpUrl,24000);

// rtmpPusher.start();

// try {
//     const filePath = path.resolve('./interpreter-server/test-voice.wav');
//     console.log('Loading file from:', filePath);
//     const buffer = fs.readFileSync(filePath);
//     const wav = new waveFile.WaveFile(buffer);
//     wav.toSampleRate(44100);
//     const samples = Buffer.from(wav.data.samples);

//     console.log('WAV loaded, pushing chunk...');
//     rtmpPusher.pushChunk(samples);
//     rtmpPusher.pushChunk(samples);
//     rtmpPusher.pushChunk(samples);
//     rtmpPusher.pushChunk(samples);
// } catch (error) {
//     console.error('Error processing WAV file:', error);
// }


import express from 'express';
import expressWs from 'express-ws';
import { RTMPPusher } from './services/rtmpPusher.js';
import path from 'path';
import fs from 'fs';
import waveFile from 'wavefile';
import config from 'dotenv';
config.config({path: '.env.local'});
import { textToSpeechDeepgram, textToSpeechSmallest, textToSpeechCartesia } from './services/ttsService.js';
import WebSocket from 'ws';
const app = express();
expressWs(app);


app.ws('/interpreter', (ws, req) => {
  const query = req.query;
  const language = query.language;
  const rtmpUrl = query.rtmpUrl;
  const ttsService = query.ttsService;
  const apiKey = query.apiKey;
  const config = {
    isDisconnected: false,
  }
  const rtmpPusher = new RTMPPusher(rtmpUrl,48000,1);
  rtmpPusher.start(config);


    //text to speech
    let ttsRef;
    if(ttsService === "deepgram"){
      ttsRef = textToSpeechDeepgram(rtmpPusher,{voice_id: "aura-asteria-en", apiKey: apiKey});
    }else if(ttsService === "smallest"){
      ttsRef = textToSpeechSmallest(rtmpPusher,{voice_id: "felix", apiKey: apiKey});
    }else if(ttsService === "cartesia"){
      ttsRef = textToSpeechCartesia(rtmpPusher,{voice_id: "a0e99841-438c-4a64-b679-ae501e7d6091", apiKey: apiKey});
    }

  console.log('WebSocket connected', query);
  ws.on('message', (msg) => {
    const data = JSON.parse(msg);
    const type = data.type;
    if(type === "translation"){
      const text = data.text;
      const language = data.language;
      console.log('translation: ', text, language);
      if(ttsRef.ws.readyState === WebSocket.OPEN){
        // ttsRef.send(JSON.stringify({ 'type': 'Speak', 'text': text }));
        // ttsRef.send(JSON.stringify({ 'type': 'Flush' }));
        ttsRef.sendText(text);
      }
    }
      
  });

  ws.on('close', () => {
    console.log('WebSocket closed');
    config.isDisconnected = true;
    rtmpPusher.stop();
    ttsRef.close();
  });
});

app.listen(3001, () => {
  console.log('Server is running on port 3001');
});